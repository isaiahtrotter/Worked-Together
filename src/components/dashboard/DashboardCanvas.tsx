"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { updateWidgetSettings } from "@/app/dashboard/actions";
import type {
  DirectoryEntry,
  Profile,
  WidgetSettings,
  WorkSample,
} from "@/lib/dal";
import { useCanvasTransform, type CanvasFrame } from "@/lib/dashboard/useCanvasTransform";
import { DEFAULT_SETTINGS, MAX_CORNER_RADIUS, shadowCss } from "./widgetStyleShared";
import Frame from "./Frame";
import CanvasNav from "./CanvasNav";
import InspectorPanel from "./InspectorPanel";
import WidgetPreviewFrame from "./WidgetPreviewFrame";
import ProfileSection from "./ProfileSection";
import WorkSamplesSection from "./WorkSamplesSection";
import ConnectionsSection from "./ConnectionsSection";
import NetworkDirectory from "./NetworkDirectory";
import YourNetworkSection from "./YourNetworkSection";
import styles from "./canvas.module.css";
import widgetUiStyles from "./widget-ui.module.css";

const INSPECTOR_PANEL_WIDTH = 356;

const FRAMES: CanvasFrame[] = [
  { id: "profile", x: 0, y: 0, width: 820, height: 950, label: "Profile" },
  { id: "connections", x: 900, y: 0, width: 1300, height: 900, label: "Connections" },
  { id: "widget-preview", x: 0, y: 1030, width: 1300, height: 760, label: "Widget" },
];

type SelectedFrame = "button" | "inline" | null;

type ConnectionsSectionProps = Parameters<typeof ConnectionsSection>[0];
type YourNetworkSectionProps = Parameters<typeof YourNetworkSection>[0];

type ConnectionsData = {
  incoming: ConnectionsSectionProps["incoming"];
  outgoing: ConnectionsSectionProps["outgoing"];
  accepted: YourNetworkSectionProps["accepted"];
};

export default function DashboardCanvas({
  profile,
  workSamples,
  connections,
  directory,
}: {
  profile: Profile;
  workSamples: WorkSample[];
  connections: ConnectionsData;
  directory: DirectoryEntry[];
}) {
  // Merge field-by-field rather than initialSettings ?? DEFAULT_SETTINGS —
  // existing profiles saved their widget_settings under an older schema
  // (missing newer fields entirely), so an all-or-nothing fallback leaves
  // those fields undefined and crashes the controls below.
  const settings: WidgetSettings = { ...DEFAULT_SETTINGS, ...profile.widget_settings };
  // shadow itself used to be a boolean; coerce old saved values to the new
  // 0-100 scale (mirrors the same coercion in the widget engine).
  const rawShadow = settings.shadow as number | boolean;
  const initialShadow = typeof rawShadow === "boolean" ? (rawShadow ? 60 : 0) : rawShadow;

  const containerRef = useRef<HTMLDivElement>(null);
  const currentThemeRef = useRef(settings.theme);

  const [cornerRadius, setCornerRadius] = useState(
    Math.min(settings.cornerRadius, MAX_CORNER_RADIUS),
  );
  const [theme, setTheme] = useState(settings.theme);
  const [shadow, setShadow] = useState(initialShadow);
  const [buttonFontFamily, setButtonFontFamily] = useState(settings.buttonFontFamily);
  const [buttonFontSize, setButtonFontSize] = useState(settings.buttonFontSize);
  const [buttonFontWeight, setButtonFontWeight] = useState(settings.buttonFontWeight);
  const [buttonLetterSpacing, setButtonLetterSpacing] = useState(settings.buttonLetterSpacing);
  const [buttonPaddingX, setButtonPaddingX] = useState(settings.buttonPaddingX);
  const [buttonPaddingY, setButtonPaddingY] = useState(settings.buttonPaddingY);
  const [buttonBorderColor, setButtonBorderColor] = useState(settings.buttonBorderColor);
  const [buttonBorderWidth, setButtonBorderWidth] = useState(settings.buttonBorderWidth);
  const [buttonBorderRadius, setButtonBorderRadius] = useState(settings.buttonBorderRadius);
  const [buttonBackgroundColor, setButtonBackgroundColor] = useState(
    settings.buttonBackgroundColor,
  );
  const [buttonHoverStyle, setButtonHoverStyle] = useState(settings.buttonHoverStyle);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [selectedFrame, setSelectedFrame] = useState<SelectedFrame>(null);

  const { viewportRef, transform, dragging, panToFrame, zoomToFit, bind } =
    useCanvasTransform(FRAMES);

  function getWidgetRoot(): HTMLElement | null {
    return containerRef.current?.querySelector("#widget-root") ?? null;
  }

  function handleRadiusChange(value: number) {
    setCornerRadius(value);
    getWidgetRoot()?.style.setProperty("--wt-radius", `${value}px`);
  }

  function handleShadowChange(value: number) {
    setShadow(value);
    getWidgetRoot()?.style.setProperty("--wt-shadow", shadowCss(value));
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

  function handleResetAppearance() {
    handleRadiusChange(DEFAULT_SETTINGS.cornerRadius);
    handleShadowChange(DEFAULT_SETTINGS.shadow);
    handleThemeChange(DEFAULT_SETTINGS.theme);
  }

  function handleResetButtonStyle() {
    setButtonFontFamily(DEFAULT_SETTINGS.buttonFontFamily);
    setButtonFontSize(DEFAULT_SETTINGS.buttonFontSize);
    setButtonFontWeight(DEFAULT_SETTINGS.buttonFontWeight);
    setButtonLetterSpacing(DEFAULT_SETTINGS.buttonLetterSpacing);
    setButtonPaddingX(DEFAULT_SETTINGS.buttonPaddingX);
    setButtonPaddingY(DEFAULT_SETTINGS.buttonPaddingY);
    setButtonBorderColor(DEFAULT_SETTINGS.buttonBorderColor);
    setButtonBorderWidth(DEFAULT_SETTINGS.buttonBorderWidth);
    setButtonBorderRadius(DEFAULT_SETTINGS.buttonBorderRadius);
    setButtonBackgroundColor(DEFAULT_SETTINGS.buttonBackgroundColor);
    setButtonHoverStyle(DEFAULT_SETTINGS.buttonHoverStyle);
  }

  function handleSave() {
    setSaveState("saved");
    setSaveError(null);
    setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1500);

    updateWidgetSettings({
      theme,
      cornerRadius,
      shadow,
      buttonFontFamily,
      buttonFontSize,
      buttonFontWeight,
      buttonLetterSpacing,
      buttonPaddingX,
      buttonPaddingY,
      buttonBorderColor,
      buttonBorderWidth,
      buttonBorderRadius,
      buttonBackgroundColor,
      buttonHoverStyle,
    }).catch((err) => {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Couldn't save appearance.");
    });
  }

  const selectInline = useCallback(() => {
    setSelectedFrame("inline");
    panToFrame("widget-preview", { scale: 1, rightInset: INSPECTOR_PANEL_WIDTH });
  }, [panToFrame]);

  const selectButton = useCallback(() => {
    setSelectedFrame("button");
    panToFrame("widget-preview", { scale: 1, rightInset: INSPECTOR_PANEL_WIDTH });
  }, [panToFrame]);

  const closeInspector = useCallback(() => setSelectedFrame(null), []);

  // The two raw-pixel-math paths inside the widget engine (the dot
  // highlight overlay and the panel resize handle) only stay correct when
  // the ancestor canvas transform is exactly 1:1 — see plan notes. Gating
  // interactivity on the *actual* settled scale (not just "this frame was
  // selected") means it's automatically correct through the pan/zoom
  // animation and if the user zooms away again afterwards.
  const interactive = selectedFrame === "inline" && Math.abs(transform.scale - 1) < 0.01;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedFrame(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Clicking anything that isn't a preview's own select-trigger and isn't
  // inside the inspector panel itself clears the selection — this covers
  // both truly-empty canvas and empty whitespace within an unrelated frame.
  const handleCanvasClick = useCallback((e: ReactMouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-inspector-panel]")) return;
    if (target.closest("[data-select-trigger]")) return;
    setSelectedFrame(null);
  }, []);

  return (
    <div
      className={styles.canvasViewport}
      ref={viewportRef}
      data-dragging={dragging ? "true" : "false"}
      onPointerDown={bind.onPointerDown}
      onPointerMove={bind.onPointerMove}
      onPointerUp={bind.onPointerUp}
      onPointerCancel={bind.onPointerUp}
      onClick={handleCanvasClick}
    >
      <CanvasNav onNavigate={(id) => panToFrame(id, { scale: 1 })} onFitView={zoomToFit} />

      <div
        className={styles.canvasLayer}
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        <Frame frame={FRAMES[0]}>
          <div className={widgetUiStyles.mainCol}>
            <ProfileSection profile={profile} />
            <WorkSamplesSection profileId={profile.id} workSamples={workSamples} />
          </div>
        </Frame>

        <Frame frame={FRAMES[1]}>
          <div className={widgetUiStyles.page}>
            <div className={widgetUiStyles.mainCol}>
              <ConnectionsSection incoming={connections.incoming} outgoing={connections.outgoing} />
            </div>
            <div className={widgetUiStyles.mainCol}>
              <NetworkDirectory initialDirectory={directory} />
            </div>
            <div className={`${widgetUiStyles.mainCol} ${widgetUiStyles.fullSpan}`}>
              <YourNetworkSection accepted={connections.accepted} />
            </div>
          </div>
        </Frame>

        <Frame frame={FRAMES[2]}>
          <WidgetPreviewFrame
            embedKey={profile.embed_key}
            containerRef={containerRef}
            interactive={interactive}
            selectedFrame={selectedFrame}
            onSelectInline={selectInline}
            onSelectButton={selectButton}
            buttonStyle={{
              buttonFontFamily,
              buttonFontSize,
              buttonFontWeight,
              buttonLetterSpacing,
              buttonPaddingX,
              buttonPaddingY,
              buttonBorderColor,
              buttonBorderWidth,
              buttonBorderRadius,
              buttonBackgroundColor,
              buttonHoverStyle,
            }}
          />
        </Frame>
      </div>

      <InspectorPanel
        selectedFrame={selectedFrame}
        onClose={closeInspector}
        appearance={{ cornerRadius, theme, shadow }}
        appearanceActions={{
          onRadiusChange: handleRadiusChange,
          onShadowChange: handleShadowChange,
          onThemeChange: handleThemeChange,
          onReset: handleResetAppearance,
        }}
        buttonStyle={{
          buttonFontFamily,
          buttonFontSize,
          buttonFontWeight,
          buttonLetterSpacing,
          buttonPaddingX,
          buttonPaddingY,
          buttonBorderColor,
          buttonBorderWidth,
          buttonBorderRadius,
          buttonBackgroundColor,
          buttonHoverStyle,
        }}
        buttonStyleActions={{
          onFontFamilyChange: setButtonFontFamily,
          onFontSizeChange: setButtonFontSize,
          onFontWeightChange: setButtonFontWeight,
          onLetterSpacingChange: setButtonLetterSpacing,
          onPaddingXChange: setButtonPaddingX,
          onPaddingYChange: setButtonPaddingY,
          onBorderColorChange: setButtonBorderColor,
          onBorderWidthChange: setButtonBorderWidth,
          onBorderRadiusChange: setButtonBorderRadius,
          onBackgroundColorChange: setButtonBackgroundColor,
          onHoverStyleChange: setButtonHoverStyle,
          onReset: handleResetButtonStyle,
        }}
        onSave={handleSave}
        saveState={saveState}
        saveError={saveError}
      />
    </div>
  );
}
