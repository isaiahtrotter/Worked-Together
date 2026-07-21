"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut, updateWidgetSettings } from "@/app/dashboard/actions";
import type { DirectoryEntry, Profile, WidgetSettings, WorkSample } from "@/lib/dal";
import posthog from "@/lib/posthog";
import { DEFAULT_SETTINGS } from "./widgetStyleShared";
import WidgetPreviewFrame from "./WidgetPreviewFrame";
import ProfileSection from "./ProfileSection";
import WorkSamplesSection from "./WorkSamplesSection";
import ConnectionsSection from "./ConnectionsSection";
import YourNetworkSection from "./YourNetworkSection";
import DeleteAccountSection from "./DeleteAccountSection";
import { ToastProvider } from "./ToastProvider";
import styles from "./dashboard-page.module.css";
import widgetUiStyles from "./widget-ui.module.css";

type ConnectionsSectionProps = Parameters<typeof ConnectionsSection>[0];
type YourNetworkSectionProps = Parameters<typeof YourNetworkSection>[0];

type ConnectionsData = {
  incoming: ConnectionsSectionProps["incoming"];
  outgoing: ConnectionsSectionProps["outgoing"];
  accepted: YourNetworkSectionProps["accepted"];
};

export default function DashboardPage({
  profile,
  workSamples,
  connections,
  email,
}: {
  profile: Profile;
  workSamples: WorkSample[];
  connections: ConnectionsData;
  // Fetched by the page but not rendered right now — the "Everyone in the
  // network" directory is hidden for now (see YourNetworkSection instead),
  // kept in the prop list so it's a one-line change to bring back.
  directory?: DirectoryEntry[];
  email: string | null;
}) {
  // Runs on every dashboard load, new signup or returning session alike --
  // identify() is idempotent and cheap, and this is the one place both
  // cases are guaranteed to pass through (unlike the sign-in button, which
  // a returning user with a persisted session never clicks again).
  // signup_completed only fires once, right after identify() so it lands
  // attached to the person rather than anonymous -- gated on ?new_signup=1,
  // set by SignInButton right at the moment of actual sign-in (the freshest
  // point to tell a brand-new account from a returning one; see its
  // comment), not re-derived here from a separate, less reliable read.
  useEffect(() => {
    posthog.identify(profile.id, { email, name: profile.name });

    const params = new URLSearchParams(window.location.search);
    if (params.get("new_signup") === "1") {
      posthog.capture("signup_completed");
      params.delete("new_signup");
      const query = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per
    // mount only; re-identifying on every unrelated re-render is pointless.
  }, []);


  // Merge field-by-field rather than initialSettings ?? DEFAULT_SETTINGS —
  // existing profiles saved their widget_settings under an older schema
  // (missing newer fields entirely), so an all-or-nothing fallback leaves
  // those fields undefined and crashes the controls below.
  const settings: WidgetSettings = { ...DEFAULT_SETTINGS, ...profile.widget_settings };

  const [label, setLabel] = useState(settings.label);

  // The widget's own theme toggle (inside the live preview below) calls
  // onSaveTheme whenever it's clicked from the dashboard, making that the
  // new saved default for the embed everywhere it's shown -- unlike a real
  // embed's viewer toggling their own view, which never persists.
  //
  // settingsRef always holds the latest known settings so a save never
  // clobbers a different field saved moments earlier: NetworkWidget only
  // ever wires up onThemeChange once (it loads its script and initializes
  // on mount, guarded against re-running), so the closure it captures has
  // to read live state via a ref rather than a plain render-scoped variable
  // if it's going to see a label change that happened after that mount.
  const settingsRef = useRef(settings);

  const saveSettings = useCallback(async (patch: Partial<WidgetSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    await updateWidgetSettings(next);
  }, []);

  async function handleSaveLabel(newLabel: string) {
    setLabel(newLabel);
    await saveSettings({ label: newLabel });
  }

  // Stable identity matters here specifically: this gets threaded down into
  // NetworkWidget, which is memoized precisely so unrelated re-renders (e.g.
  // a toast popping up) don't reapply its dangerouslySetInnerHTML and wipe
  // out the live D3 widget. A new function reference on every render would
  // defeat that memoization.
  const handleSaveTheme = useCallback(
    async (newTheme: "light" | "dark") => {
      await saveSettings({ theme: newTheme });
    },
    [saveSettings],
  );

  // Who's actually in the network right now — changes whenever a connection
  // is added, removed, or merged, regardless of order, so the live preview
  // below can key off it and remount (re-fetch) instead of showing stale data.
  const networkVersion = connections.accepted
    .map((r) => r.other?.id ?? "")
    .filter(Boolean)
    .sort()
    .join(",");

  return (
    <ToastProvider>
      <div className={styles.pageShell}>
        <header className={styles.header}>
          <div className={styles.headerBrand}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a
                fixed 26px-tall header logo isn't worth next/image's
                overhead (remote loader config, layout-shift machinery)
                for a single static asset. */}
            <img src="/linkenode-logo.png" alt="linkenode" width={130} height={16} />
          </div>
          <form action={signOut} onSubmit={() => posthog.reset()}>
            <button type="submit" className={styles.signOutBtn} aria-label="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Profile</p>
            <div className={widgetUiStyles.mainCol}>
              <ProfileSection profile={profile} />
            </div>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Connections</p>
            <div className={widgetUiStyles.mainCol}>
              <ConnectionsSection incoming={connections.incoming} outgoing={connections.outgoing} />
              <YourNetworkSection
                accepted={connections.accepted}
                owner={{ id: profile.id, name: profile.name, avatar_url: profile.avatar_url }}
              />
            </div>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Work samples</p>
            <div className={widgetUiStyles.mainCol}>
              <WorkSamplesSection profileId={profile.id} workSamples={workSamples} />
            </div>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Embed</p>
            <WidgetPreviewFrame
              embedKey={profile.embed_key}
              networkVersion={networkVersion}
              label={label}
              onSaveLabel={handleSaveLabel}
              onSaveTheme={handleSaveTheme}
            />
          </section>
        </main>

        <DeleteAccountSection profileName={profile.name} />
      </div>
    </ToastProvider>
  );
}
