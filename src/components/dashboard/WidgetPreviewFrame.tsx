"use client";

import { useCallback, useEffect, useState } from "react";
import NetworkWidget from "@/components/NetworkWidget";
import { BUTTON_LABEL_MAX_LENGTH, LauncherIcon } from "./widgetStyleShared";
import { useToast } from "./ToastProvider";
import styles from "./widget-ui.module.css";

type Corner = "bottom-right" | "bottom-left";

const CORNERS: { value: Corner; label: string }[] = [
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
];

export default function WidgetPreviewFrame({
  embedKey,
  networkVersion,
  label,
  onSaveLabel,
  onSaveTheme,
}: {
  embedKey: string;
  // Changes whenever who's in the network changes (add/remove/merge) —
  // used as NetworkWidget's key below to force a full remount + refetch,
  // since the widget only ever fetches once per mount otherwise (see
  // NetworkWidget.tsx's `initialized` ref).
  networkVersion: string;
  label: string;
  onSaveLabel: (label: string) => Promise<void>;
  onSaveTheme: (theme: "light" | "dark") => Promise<void>;
}) {
  const toast = useToast();

  // Inline embed mode is hidden for now (floating is the only option exposed
  // here) — the widget engine itself still fully supports data-mode="inline"
  // via a hand-written script tag, this just isn't surfaced in the snippet
  // builder at the moment.
  const [corner, setCorner] = useState<Corner>("bottom-right");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const [labelDraft, setLabelDraft] = useState(label);
  useEffect(() => setLabelDraft(label), [label]);

  const attrs = [`data-embed-key="${embedKey}"`];
  if (corner !== "bottom-right") attrs.push(`data-corner="${corner}"`);
  const snippet = `<script src="${origin}/widget.js" ${attrs.join(" ")} async></script>`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveLabel() {
    const trimmed = labelDraft.trim();
    if (!trimmed || trimmed === label) return;
    try {
      await onSaveLabel(trimmed);
      toast("Saved");
    } catch {
      toast("Couldn't save — try again");
    }
  }

  // Stable identity: this is threaded into the memoized NetworkWidget below,
  // which only re-renders (and wipes its live D3 state) when a prop's
  // identity actually changes -- a fresh closure every render would trigger
  // that on every keystroke in the fields on this page.
  const handleThemeChange = useCallback(
    async (theme: "light" | "dark") => {
      try {
        await onSaveTheme(theme);
        toast("Saved");
      } catch {
        toast("Couldn't save — try again");
      }
    },
    [onSaveTheme, toast],
  );

  return (
    <div className={styles.mainCol}>
      <div className={styles.previewCard}>
        <NetworkWidget
          key={networkVersion}
          embedKey={embedKey}
          mode="inline"
          onThemeChange={handleThemeChange}
        />
      </div>

      <div className={styles.buttonPreviewWrap}>
        <div className={styles.buttonMimic}>
          <LauncherIcon />
          <span className={styles.buttonMimicLabel}>{labelDraft || label}</span>
        </div>

        <div className={styles.fieldRow} style={{ marginTop: 16, marginBottom: 0 }}>
          <span className={styles.label}>Button text</span>
          <div className={styles.inputWithCounter}>
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value.slice(0, BUTTON_LABEL_MAX_LENGTH))}
              onBlur={saveLabel}
              maxLength={BUTTON_LABEL_MAX_LENGTH}
              className={styles.input}
            />
            <span className={styles.inputCounter}>
              {labelDraft.length}/{BUTTON_LABEL_MAX_LENGTH}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.cardLabel}>Embed on your site</p>

        <div className={styles.fieldRow} style={{ flex: "0 0 160px" }}>
          <span className={styles.label}>Corner</span>
          <select
            value={corner}
            onChange={(e) => setCorner(e.target.value as Corner)}
            className={styles.input}
          >
            {CORNERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <pre className={styles.snippet}>{snippet}</pre>
        <button onClick={copy} className={styles.btnPrimary}>
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
      </div>
    </div>
  );
}
