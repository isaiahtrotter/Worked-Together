"use client";

import { useCallback, useEffect, useState } from "react";
import NetworkWidget from "@/components/NetworkWidget";
import { BUTTON_LABEL_MAX_LENGTH, DEFAULT_SETTINGS, LauncherIcon } from "./widgetStyleShared";
import { useToast } from "./ToastProvider";
import styles from "./widget-ui.module.css";

type Corner = "bottom-right" | "bottom-left";

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// Renders the same snippet string as actual syntax-highlighted tokens
// instead of one flat-colored blob -- the format is fixed (a single
// <script> tag), so hand-tokenizing it is simpler than pulling in a
// generic highlighter for one line of markup.
function EmbedSnippet({
  origin,
  embedKey,
  corner,
}: {
  origin: string;
  embedKey: string;
  corner: Corner;
}) {
  const attrs: Array<[string, string]> = [["data-embed-key", embedKey]];
  if (corner !== "bottom-right") attrs.push(["data-corner", corner]);

  return (
    <>
      <span className={styles.tokPunct}>{"<"}</span>
      <span className={styles.tokTag}>script</span>{" "}
      <span className={styles.tokAttr}>src</span>
      <span className={styles.tokPunct}>=</span>
      <span className={styles.tokString}>&quot;{origin}/widget.js&quot;</span>{" "}
      {attrs.map(([name, value]) => (
        <span key={name}>
          <span className={styles.tokAttr}>{name}</span>
          <span className={styles.tokPunct}>=</span>
          <span className={styles.tokString}>&quot;{value}&quot;</span>{" "}
        </span>
      ))}
      <span className={styles.tokAttr}>async</span>
      <span className={styles.tokPunct}>{"></"}</span>
      <span className={styles.tokTag}>script</span>
      <span className={styles.tokPunct}>{">"}</span>
    </>
  );
}

// One shared graphic, mirrored via the black pill's x position, rather than
// two near-duplicate SVGs -- bottom-left sits at x=10, bottom-right at
// x=335 (the same numbers as the two designs this was built from).
function CornerGraphic({ corner }: { corner: Corner }) {
  const buttonX = corner === "bottom-left" ? 10 : 335;
  return (
    <svg viewBox="0 0 402 270" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="400" height="268" rx="9" fill="white" />
      <rect x="1" y="1" width="400" height="268" rx="9" stroke="#E5E5E5" strokeWidth="2" />
      <rect y="176" width="112" height="94" fill="#E5E5E5" />
      <rect y="45" width="112" height="128" fill="#E5E5E5" />
      <rect x="115" y="45" width="287" height="225" fill="#E5E5E5" />
      <rect x={buttonX} y="240" width="56" height="20" rx="7" fill="black" />
      <rect x="10" y="14" width="14" height="14" rx="7" fill="#E5E5E5" />
      <rect x="223" y="18.5" width="31" height="5" rx="2.5" fill="#E5E5E5" />
      <rect x="264" y="18.5" width="29" height="5" rx="2.5" fill="#E5E5E5" />
      <rect x="303" y="18.5" width="43" height="5" rx="2.5" fill="#E5E5E5" />
      <rect x="356" y="18.5" width="35" height="5" rx="2.5" fill="#E5E5E5" />
    </svg>
  );
}

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
  const [hovering, setHovering] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const [labelDraft, setLabelDraft] = useState(label);
  useEffect(() => setLabelDraft(label), [label]);

  const attrs = [`data-embed-key="${embedKey}"`];
  if (corner !== "bottom-right") attrs.push(`data-corner="${corner}"`);
  const snippet = `<script src="${origin}/widget.js" ${attrs.join(" ")} async></script>`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    // The mouse is almost always still over the snippet right after a
    // click -- drive the overlay off explicit hover state (not CSS :hover)
    // so "Copied to clipboard" fades all the way to nothing instead of
    // instantly revealing the icon+"Copy to clipboard" prompt underneath
    // once the 2s timer clears. A real new hover (mouseenter after this)
    // brings the prompt back normally.
    setHovering(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveLabel() {
    const trimmed = labelDraft.trim();
    // Clearing it isn't a valid label to save -- snap the input (and with
    // it the button preview, which already falls back to `label` while
    // labelDraft is empty) back to the last saved text instead of leaving
    // the field blank.
    if (!trimmed) {
      setLabelDraft(label);
      return;
    }
    if (trimmed === label) return;
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
      <div className={styles.card}>
        <p className={styles.cardLabel}>Widget</p>
        <p className={styles.hint} style={{ margin: "4px 0 16px" }}>
          Light and dark mode here are applied as the default state when opened.
        </p>
        <NetworkWidget
          key={networkVersion}
          embedKey={embedKey}
          mode="inline"
          onThemeChange={handleThemeChange}
        />
      </div>

      <div className={styles.buttonPreviewWrap}>
        <div className={styles.inputWithCounter}>
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value.slice(0, BUTTON_LABEL_MAX_LENGTH))}
            onBlur={saveLabel}
            maxLength={BUTTON_LABEL_MAX_LENGTH}
            placeholder={DEFAULT_SETTINGS.label}
            className={styles.input}
          />
          <span className={styles.inputCounter}>
            {labelDraft.length}/{BUTTON_LABEL_MAX_LENGTH}
          </span>
        </div>

        <div className={styles.buttonMimic}>
          <LauncherIcon />
          <span className={styles.buttonMimicLabel}>{labelDraft || label}</span>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.cardLabel}>Button placement</p>
        <div className={styles.cornerPickerRow}>
          <button
            type="button"
            className={`${styles.cornerOption} ${corner === "bottom-left" ? styles.cornerOptionActive : ""}`}
            onClick={() => setCorner("bottom-left")}
            aria-pressed={corner === "bottom-left"}
            aria-label="Bottom left"
          >
            <CornerGraphic corner="bottom-left" />
          </button>
          <button
            type="button"
            className={`${styles.cornerOption} ${corner === "bottom-right" ? styles.cornerOptionActive : ""}`}
            onClick={() => setCorner("bottom-right")}
            aria-pressed={corner === "bottom-right"}
            aria-label="Bottom right"
          >
            <CornerGraphic corner="bottom-right" />
          </button>
        </div>

        <div
          className={styles.snippetWrap}
          onClick={copy}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          role="button"
          tabIndex={0}
          aria-label="Copy embed code to clipboard"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              copy();
            }
          }}
          style={{ marginTop: 16 }}
        >
          <pre className={styles.snippet}>
            <EmbedSnippet origin={origin} embedKey={embedKey} corner={corner} />
          </pre>
          <div
            className={`${styles.snippetHoverOverlay} ${copied || hovering ? styles.snippetHoverOverlayActive : ""}`}
          >
            {copied ? (
              <span>Copied to clipboard</span>
            ) : (
              hovering && (
                <>
                  <CopyIcon />
                  <span>Copy to clipboard</span>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
