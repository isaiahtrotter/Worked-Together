"use client";

import { useState } from "react";
import styles from "./widget-ui.module.css";

export default function EmbedSection({ embedKey }: { embedKey: string }) {
  const [mode, setMode] = useState<"floating" | "inline">("floating");
  const [copied, setCopied] = useState(false);
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
    </div>
  );
}
