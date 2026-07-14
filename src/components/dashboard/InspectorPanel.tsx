"use client";

import type { ButtonHoverStyle } from "@/lib/dal";
import { FontPicker, HOVER_STYLES, MAX_CORNER_RADIUS } from "./widgetStyleShared";
import type { ButtonStyleValues } from "./WidgetPreviewFrame";
import styles from "./widget-ui.module.css";
import canvasStyles from "./canvas.module.css";

export type SelectedFrame = "button" | "inline" | null;

type AppearanceValues = { cornerRadius: number; theme: "light" | "dark"; shadow: number };

type AppearanceActions = {
  onRadiusChange: (value: number) => void;
  onShadowChange: (value: number) => void;
  onThemeChange: (value: "light" | "dark") => void;
  onReset: () => void;
};

type ButtonStyleActions = {
  onFontFamilyChange: (value: string) => void;
  onFontSizeChange: (value: number) => void;
  onFontWeightChange: (value: number) => void;
  onLetterSpacingChange: (value: number) => void;
  onPaddingXChange: (value: number) => void;
  onPaddingYChange: (value: number) => void;
  onBorderColorChange: (value: string) => void;
  onBorderWidthChange: (value: number) => void;
  onBorderRadiusChange: (value: number) => void;
  onBackgroundColorChange: (value: string) => void;
  onHoverStyleChange: (value: ButtonHoverStyle) => void;
  onReset: () => void;
};

function SaveFooter({
  onSave,
  saveState,
  saveError,
}: {
  onSave: () => void;
  saveState: "idle" | "saved" | "error";
  saveError: string | null;
}) {
  return (
    <>
      <button type="button" onClick={onSave} className={styles.btnPrimary} style={{ marginTop: 4 }}>
        {saveState === "saved" ? "Saved!" : saveState === "error" ? "Try again" : "Save appearance"}
      </button>
      {saveError && <p className={styles.error}>{saveError}</p>}
      <p className={styles.hint}>
        Only affects your own widget — this is saved to your profile and used
        everywhere your network is embedded.
      </p>
    </>
  );
}

export default function InspectorPanel({
  selectedFrame,
  onClose,
  appearance,
  appearanceActions,
  buttonStyle,
  buttonStyleActions,
  onSave,
  saveState,
  saveError,
}: {
  selectedFrame: SelectedFrame;
  onClose: () => void;
  appearance: AppearanceValues;
  appearanceActions: AppearanceActions;
  buttonStyle: ButtonStyleValues;
  buttonStyleActions: ButtonStyleActions;
  onSave: () => void;
  saveState: "idle" | "saved" | "error";
  saveError: string | null;
}) {
  const open = selectedFrame !== null;

  return (
    <div
      data-inspector-panel
      data-canvas-passthrough
      className={`${canvasStyles.inspectorPanel} ${open ? canvasStyles.inspectorPanelOpen : ""}`}
    >
      {selectedFrame === "inline" && (
        <>
          <div className={canvasStyles.inspectorHeader}>
            <p className={canvasStyles.inspectorTitle}>Appearance</p>
            <button
              type="button"
              className={canvasStyles.inspectorCloseBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className={styles.controlLabelRow} style={{ marginBottom: 4, justifyContent: "flex-end" }}>
            <button type="button" className={styles.smallLinkBtn} onClick={appearanceActions.onReset}>
              Reset
            </button>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Radius</span>
            <input
              type="range"
              min={0}
              max={MAX_CORNER_RADIUS}
              value={appearance.cornerRadius}
              onChange={(e) => appearanceActions.onRadiusChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{appearance.cornerRadius}px</span>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Shadow</span>
            <input
              type="range"
              min={0}
              max={100}
              value={appearance.shadow}
              onChange={(e) => appearanceActions.onShadowChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{appearance.shadow}%</span>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Theme</span>
            <div className={styles.themeToggleRow}>
              <button
                type="button"
                className={`${styles.themeOption} ${appearance.theme === "light" ? styles.themeOptionActive : ""}`}
                onClick={() => appearanceActions.onThemeChange("light")}
              >
                Light
              </button>
              <button
                type="button"
                className={`${styles.themeOption} ${appearance.theme === "dark" ? styles.themeOptionActive : ""}`}
                onClick={() => appearanceActions.onThemeChange("dark")}
              >
                Dark
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <SaveFooter onSave={onSave} saveState={saveState} saveError={saveError} />
          </div>
        </>
      )}

      {selectedFrame === "button" && (
        <>
          <div className={canvasStyles.inspectorHeader}>
            <p className={canvasStyles.inspectorTitle}>Button style</p>
            <button
              type="button"
              className={canvasStyles.inspectorCloseBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className={styles.controlLabelRow} style={{ marginBottom: 4, justifyContent: "flex-end" }}>
            <button type="button" className={styles.smallLinkBtn} onClick={buttonStyleActions.onReset}>
              Reset
            </button>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.label}>Font</span>
            <FontPicker value={buttonStyle.buttonFontFamily} onChange={buttonStyleActions.onFontFamilyChange} />
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Font size</span>
            <input
              type="range"
              min={11}
              max={20}
              value={buttonStyle.buttonFontSize}
              onChange={(e) => buttonStyleActions.onFontSizeChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{buttonStyle.buttonFontSize}px</span>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Weight</span>
            <input
              type="range"
              min={400}
              max={700}
              step={100}
              value={buttonStyle.buttonFontWeight}
              onChange={(e) => buttonStyleActions.onFontWeightChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{buttonStyle.buttonFontWeight}</span>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Letter spacing</span>
            <input
              type="range"
              min={-1}
              max={3}
              step={0.1}
              value={buttonStyle.buttonLetterSpacing}
              onChange={(e) => buttonStyleActions.onLetterSpacingChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{buttonStyle.buttonLetterSpacing.toFixed(1)}px</span>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Padding X</span>
            <input
              type="range"
              min={8}
              max={28}
              value={buttonStyle.buttonPaddingX}
              onChange={(e) => buttonStyleActions.onPaddingXChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{buttonStyle.buttonPaddingX}px</span>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Padding Y</span>
            <input
              type="range"
              min={6}
              max={20}
              value={buttonStyle.buttonPaddingY}
              onChange={(e) => buttonStyleActions.onPaddingYChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{buttonStyle.buttonPaddingY}px</span>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Radius</span>
            <input
              type="range"
              min={0}
              max={30}
              value={buttonStyle.buttonBorderRadius}
              onChange={(e) => buttonStyleActions.onBorderRadiusChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{buttonStyle.buttonBorderRadius}px</span>
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Background</span>
            <input
              type="color"
              value={buttonStyle.buttonBackgroundColor}
              onChange={(e) => buttonStyleActions.onBackgroundColorChange(e.target.value)}
              className={styles.colorInput}
            />
            <span className={styles.controlInlineLabel} style={{ marginLeft: 8 }}>
              Border
            </span>
            <input
              type="color"
              value={buttonStyle.buttonBorderColor}
              onChange={(e) => buttonStyleActions.onBorderColorChange(e.target.value)}
              className={styles.colorInput}
            />
          </div>

          <div className={styles.controlRowInline}>
            <span className={styles.controlInlineLabel}>Border width</span>
            <input
              type="range"
              min={0}
              max={4}
              value={buttonStyle.buttonBorderWidth}
              onChange={(e) => buttonStyleActions.onBorderWidthChange(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlInlineValue}>{buttonStyle.buttonBorderWidth}px</span>
          </div>

          <div className={styles.fieldRow}>
            <span className={styles.label}>Hover effect</span>
            <div className={styles.hoverStyleRow}>
              {HOVER_STYLES.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  className={`${styles.modeOption} ${buttonStyle.buttonHoverStyle === h.value ? styles.modeOptionActive : ""}`}
                  onClick={() => buttonStyleActions.onHoverStyleChange(h.value)}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <SaveFooter onSave={onSave} saveState={saveState} saveError={saveError} />
        </>
      )}
    </div>
  );
}
