"use client";

import { useCallback, useState } from "react";
import SignInButton from "@/components/SignInButton";
import NetworkWidget from "@/components/NetworkWidget";
import { LauncherIcon } from "@/components/dashboard/widgetStyleShared";
import { DEMO_WIDGET_DATA } from "@/lib/demoNetworkData";
import styles from "./MarketingHero.module.css";

const FEATURES = [
  {
    icon: "/icon-be-seen.png",
    title: "Be seen on your friends’ sites",
    body: "Your work and recommendations show up on every portfolio you're connected to.",
  },
  {
    icon: "/icon-recommendations.png",
    title: "Real recommendations",
    body: "Showcase all the recommendations that your connections have written about you",
  },
  {
    icon: "/icon-setup.png",
    title: "2 minute setup",
    body: "Put a single line of code in your <body> tag and you’re done.",
  },
];

function toggleDemo() {
  document.dispatchEvent(new CustomEvent("linkenode:toggle"));
}

// Same tablet-width breakpoint as MarketingHero.module.css's stacked
// layout -- the widget only auto-opens on the desktop (side-by-side) view;
// on mobile/tablet it stays closed until the user taps .mobileTrigger.
const DESKTOP_BREAKPOINT = 1200;

function openOnDesktop() {
  if (window.innerWidth > DESKTOP_BREAKPOINT) {
    document.dispatchEvent(new CustomEvent("linkenode:open"));
  }
}

export default function MarketingHero() {
  // Dropped once the entrance animation finishes (rather than left
  // attached via animation-fill-mode) -- see .laptopStageEntering's comment
  // in MarketingHero.module.css for why a still-"filling" animation keeps
  // this element confining the widget even on mobile, where it needs to
  // truly have no transform at all once it settles.
  const [laptopEntering, setLaptopEntering] = useState(true);

  // Once open on mobile, the panel spans the full page width and its own
  // "Made with Linkenode" link sits right where .mobileTrigger lives,
  // blocking clicks to it -- hide the trigger while expanded (the panel
  // already has its own close button) by watching #widget-root's class
  // directly, since it can also change via the outside-click collapse
  // handler, not just our own toggleDemo calls.
  const [widgetExpanded, setWidgetExpanded] = useState(false);

  // Stable identity is required here, not just nice-to-have: NetworkWidget's
  // effect (which fetches data, injects the engine script, and calls
  // __initNetworkWidget) has onReady in its dependency array. A new
  // function reference -- e.g. from this component re-rendering because
  // widgetExpanded changed -- reruns that effect, and its cleanup sets a
  // `cancelled` flag the in-flight fetch/import Promise.all checks before
  // calling __initNetworkWidget. Mid-flight, that silently aborts
  // initialization forever (the widget never becomes ready at all).
  const handleWidgetReady = useCallback(() => {
    openOnDesktop();
    const root = document.getElementById("widget-root");
    if (!root) return;
    const sync = () => setWidgetExpanded(root.classList.contains("expanded"));
    sync();
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["class"] });
  }, []);

  return (
    <div className={styles.hero}>
      <div className={styles.leftCol}>
        <h1 className={styles.heading}>
          Your portfolio,
          <br />
          backed by
          <br />
          real designers
        </h1>
        <p className={styles.subheading}>Show the people who vouch for you with one line of code.</p>

        <div className={styles.ctaRow}>
          {/* data-network-widget-open tells the widget engine's own
              outside-click-collapse listener to ignore clicks on this
              button -- otherwise the same click that opens the widget
              (via toggleDemo below) immediately reads as an "outside
              click" and collapses it again, since this button sits
              outside #widget-root. */}
          <button
            type="button"
            className={styles.liveDemoBtn}
            onClick={toggleDemo}
            data-network-widget-open
          >
            Live Demo
          </button>
          <SignInButton />
        </div>

        <div className={styles.features}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.card}>
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny
                  (16x16) user-provided icon files, used exactly as given. */}
              <div className={styles.cardIcon}>
                <img src={f.icon} alt="" />
              </div>
              <div>
                <p className={styles.cardTitle}>{f.title}</p>
                <p className={styles.cardBody}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`${styles.laptopStage} ${laptopEntering ? styles.laptopStageEntering : ""}`}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setLaptopEntering(false);
        }}
      >
        <div className={styles.laptop}>
          {/* eslint-disable-next-line @next/next/no-img-element -- these are
              user-provided mockup assets (public/laptop-mockup*.png), used
              exactly as given rather than recreated; next/image's
              remote-loader machinery isn't worth it for static hero assets.
              The mobile source swaps in below the same breakpoint the
              stacked layout kicks in at -- on mobile the widget now opens on
              the real page (see .widgetHost's mobile override) rather than
              confined to this image, so its "screen" no longer needs to
              show a functional collapsed-pill state. */}
          <picture>
            <source media="(max-width: 1200px)" srcSet="/laptop-mockup-mobile.png" />
            <img src="/laptop-mockup.png" alt="" className={styles.laptopImg} />
          </picture>

          {/* Positioned to match the screen region measured directly out of
              laptop-mockup.png (1220x698 source): left 10.74%, top 2.44%,
              width 79.18%, height 87.39% -- so the real widget's launcher
              pill and expanded panel land exactly on the screen, not
              floating over the aluminum bezel. */}
          <div className={styles.widgetHost}>
            <NetworkWidget
              embedKey="demo"
              mode="floating"
              demoData={DEMO_WIDGET_DATA}
              onReady={handleWidgetReady}
            />
          </div>
        </div>
      </div>

      {/* Stand-in for the widget's own launcher pill on mobile/tablet (that
          pill is hidden there via CSS -- it's confined to the shrunk laptop
          screen and too small to comfortably tap). Fixed to the real page
          instead, dispatching the same toggle event. Hidden once expanded --
          see widgetExpanded above. */}
      {!widgetExpanded && (
        <button
          type="button"
          className={styles.mobileTrigger}
          onClick={toggleDemo}
          data-network-widget-open
        >
          <LauncherIcon />
          <span>View My Network</span>
        </button>
      )}
    </div>
  );
}
