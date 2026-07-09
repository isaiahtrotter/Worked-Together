"use client";

import { useRef, useState } from "react";
import NetworkWidget from "@/components/NetworkWidget";
import { updateWidgetSettings } from "@/app/dashboard/actions";
import type { WidgetSettings } from "@/lib/dal";
import styles from "./widget-ui.module.css";

const DEFAULT_SETTINGS: WidgetSettings = {
  theme: "light",
  cornerRadius: 24,
  shadow: true,
};

export default function PreviewPanel({
  embedKey,
  initialSettings,
}: {
  embedKey: string;
  initialSettings: WidgetSettings | null;
}) {
  const settings = initialSettings ?? DEFAULT_SETTINGS;
  const containerRef = useRef<HTMLDivElement>(null);
  const currentThemeRef = useRef(settings.theme);

  const [cornerRadius, setCornerRadius] = useState(settings.cornerRadius);
  const [theme, setTheme] = useState(settings.theme);
  const [shadow, setShadow] = useState(settings.shadow);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  function getWidgetRoot(): HTMLElement | null {
    return containerRef.current?.querySelector("#widget-root") ?? null;
  }

  function handleRadiusChange(value: number) {
    setCornerRadius(value);
    getWidgetRoot()?.style.setProperty("--wt-radius", `${value}px`);
  }

  function handleShadowChange(value: boolean) {
    setShadow(value);
    getWidgetRoot()?.style.setProperty(
      "--wt-shadow",
      value ? "0 20px 60px rgba(0,0,0,0.25)" : "none",
    );
  }

  function handleThemeChange(value: "light" | "dark") {
    setTheme(value);
    if (currentThemeRef.current !== value) {
      const toggleBtn = containerRef.current?.querySelector<HTMLButtonElement>(
        "#theme-toggle-btn",
      );
      toggleBtn?.click();
      currentThemeRef.current = value;
    }
  }

  async function handleSave() {
    setSaveState("saving");
    await updateWidgetSettings({ theme, cornerRadius, shadow });
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1500);
  }

  return (
    <>
      <div className={styles.previewCard} ref={containerRef}>
        <NetworkWidget embedKey={embedKey} mode="inline" />
      </div>

      <div className={`${styles.card} ${styles.controlsCard}`}>
        <p className={styles.cardLabel}>Appearance</p>

        <div className={styles.controlRow}>
          <div className={styles.controlLabelRow}>
            <span>Corner radius</span>
            <span>{cornerRadius}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            value={cornerRadius}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className={styles.slider}
          />
        </div>

        <div className={styles.controlRow}>
          <div className={styles.controlLabelRow}>
            <span>Default theme</span>
          </div>
          <div className={styles.themeToggleRow}>
            <button
              type="button"
              className={`${styles.themeOption} ${theme === "light" ? styles.themeOptionActive : ""}`}
              onClick={() => handleThemeChange("light")}
            >
              Light
            </button>
            <button
              type="button"
              className={`${styles.themeOption} ${theme === "dark" ? styles.themeOptionActive : ""}`}
              onClick={() => handleThemeChange("dark")}
            >
              Dark
            </button>
          </div>
        </div>

        <div className={styles.controlRow}>
          <div className={styles.controlLabelRow}>
            <span>Box shadow</span>
            <button
              type="button"
              className={`${styles.switch} ${shadow ? styles.switchOn : ""}`}
              onClick={() => handleShadowChange(!shadow)}
              aria-label="Toggle box shadow"
            >
              <span className={styles.switchKnob} />
            </button>
          </div>
        </div>

        <button type="button" onClick={handleSave} className={styles.btnPrimary}>
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved!" : "Save appearance"}
        </button>
        <p className={styles.hint}>
          Only affects your own widget — this is saved to your profile and
          used everywhere your network is embedded.
        </p>
      </div>
    </>
  );
}
