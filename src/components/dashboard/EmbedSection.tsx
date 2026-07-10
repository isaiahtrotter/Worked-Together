"use client";

import { useState } from "react";
import styles from "./widget-ui.module.css";

const TRIGGER_SNIPPET = `<a href="#" data-network-widget-open>View my network</a>`;

export default function EmbedSection({ embedKey }: { embedKey: string }) {
  const [mode, setMode] = useState<"floating" | "inline">("floating");
  const [copied, setCopied] = useState(false);
  const [triggerCopied, setTriggerCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const scriptTag = `<script src="${origin}/widget.js" data-embed-key="${embedKey}"${
    mode === "inline" ? ' data-mode="inline"' : ""
  } async></script>`;

  const snippet =
    mode === "inline"
      ? `<div style="width: 480px; height: 600px;">\n  ${scriptTag}\n</div>`
      : scriptTag;

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function copyTrigger() {
    navigator.clipboard.writeText(TRIGGER_SNIPPET);
    setTriggerCopied(true);
    setTimeout(() => setTriggerCopied(false), 1500);
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Embed on your site</p>

      <div className={styles.modeToggle}>
        <button
          type="button"
          onClick={() => setMode("floating")}
          className={`${styles.modeOption} ${mode === "floating" ? styles.modeOptionActive : ""}`}
        >
          Floating button
        </button>
        <button
          type="button"
          onClick={() => setMode("inline")}
          className={`${styles.modeOption} ${mode === "inline" ? styles.modeOptionActive : ""}`}
        >
          Inline, always open
        </button>
      </div>

      <pre className={styles.snippet}>{snippet}</pre>
      <button onClick={copy} className={styles.btnPrimary}>
        {copied ? "Copied!" : "Copy to clipboard"}
      </button>

      {mode === "floating" && (
        <>
          <p className={styles.cardLabel} style={{ marginTop: 20 }}>
            Open it from a link, instead of the button
          </p>
          <p className={styles.hint} style={{ marginBottom: 8 }}>
            Add this attribute to any link or button anywhere on your site and
            clicking it opens the widget — no extra JavaScript needed.
          </p>
          <pre className={styles.snippet}>{TRIGGER_SNIPPET}</pre>
          <button onClick={copyTrigger} className={styles.btnSecondary}>
            {triggerCopied ? "Copied!" : "Copy to clipboard"}
          </button>
        </>
      )}
    </div>
  );
}
