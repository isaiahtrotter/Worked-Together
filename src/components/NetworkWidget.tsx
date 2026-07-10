"use client";

import { memo, useEffect, useRef, useState } from "react";
import { fetchWidgetData } from "@/lib/fetchWidgetData";

const WIDGET_MARKUP = `<div id="widget-root" class="corner-bottom-right">
  <div class="launcher" id="launcher-btn" role="button" aria-label="View My Network">
    <svg width="22" height="22" viewBox="0 0 64 64" style="flex-shrink:0;">
      <line x1="32" y1="32" x2="14" y2="18" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/>
      <line x1="32" y1="32" x2="50" y2="16" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/>
      <line x1="32" y1="32" x2="16" y2="46" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/>
      <line x1="32" y1="32" x2="48" y2="48" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/>
      <circle class="launcher-dot" cx="14" cy="18" r="6" fill="#D94F2B"/>
      <circle class="launcher-dot" cx="50" cy="16" r="6" fill="#AC57D6"/>
      <circle class="launcher-dot" cx="16" cy="46" r="6" fill="#128A66"/>
      <circle class="launcher-dot" cx="48" cy="48" r="6" fill="#C2477F"/>
      <circle cx="32" cy="32" r="9" fill="#1D69E0"/>
    </svg>
    <span class="launcher-label">View My Network</span>
  </div>

  <div class="panel-expanded">
    <div id="ring-app" style="position:relative;width:100%;height:100%;overflow:hidden;">
      <div id="dot-highlight-layer" style="position:absolute;inset:0;pointer-events:none;z-index:0;"></div>
      <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
      <button id="resize-handle" aria-label="Resize" style="position:absolute;top:14px;left:14px;width:30px;height:30px;padding:0;border-radius:99px;border:none;display:flex;align-items:center;justify-content:center;cursor:nwse-resize;z-index:3;touch-action:none;"><span id="resize-icon"></span></button>
      <div style="position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:6px;z-index:2;">
        <button id="theme-toggle-btn" class="proto-btn wm-label" style="padding:8px 12px;border-radius:99px;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;"><span id="theme-icon"></span><span id="theme-label">Light</span></button>
        <button id="widget-close-btn" class="proto-btn" type="button" aria-label="Close" style="width:30px;height:30px;padding:0;border-radius:99px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;"><span id="widget-close-icon"></span></button>
      </div>
      <svg id="graph-svg" width="100%" height="100%" style="display:block;position:relative;z-index:1;"></svg>
      <div id="canvas-links">
        <a href="#" id="add-owner-btn" class="page-link proto-btn" style="padding:8px 12px;border-radius:99px;border-bottom:none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>
          <span id="add-owner-label">Add me</span>
        </a>
        <a href="#" id="share-network-btn" class="page-link proto-btn" style="padding:8px 12px;border-radius:99px;border-bottom:none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><line x1="7.7" y1="7.3" x2="10.5" y2="16.2"/><line x1="16.3" y1="7.3" x2="13.5" y2="16.2"/><line x1="8.3" y1="6" x2="15.7" y2="6"/></svg>
          <span>Create your network</span>
        </a>
      </div>
      <div id="hover-card" style="position:absolute;display:none;pointer-events:none;z-index:2;width:188px;border-radius:10px;padding:12px 14px;box-sizing:border-box;"></div>
      <div id="panel-backdrop"></div>
      <div id="side-panel" style="position:absolute;top:0;right:0;width:300px;max-width:82%;height:100%;transform:translateX(100%);transition:transform .3s ease;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;z-index:2;">
        <div id="panel-content"></div>
      </div>
    </div>
  </div>
</div>`;

type WidgetOptions = {
  mode?: "floating" | "inline";
  theme?: "light" | "dark";
  cornerRadius?: number;
  shadow?: boolean;
};

declare global {
  interface Window {
    d3?: unknown;
    __initNetworkWidget?: (data: unknown, options?: WidgetOptions) => void;
  }
}

function NetworkWidget({
  embedKey,
  mode = "floating",
  onReady,
}: {
  embedKey: string;
  mode?: "floating" | "inline";
  onReady?: () => void;
}) {
  const initialized = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cancelled = false;

    Promise.all([fetchWidgetData(embedKey), import("d3")])
      .then(([widgetData, d3]) => {
        if (cancelled) return;
        window.d3 = d3;
        const script = document.createElement("script");
        script.src = "/network-widget/widget.js";
        script.async = true;
        script.onload = () => {
          if (cancelled) return;
          window.__initNetworkWidget?.(widgetData, { mode });
          onReady?.();
        };
        document.body.appendChild(script);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [embedKey, mode, onReady]);

  if (error) {
    return <p style={{ color: "#a33", fontSize: 13 }}>Couldn&apos;t load network preview: {error}</p>;
  }

  return (
    <div
      style={mode === "inline" ? { width: "100%", height: "100%" } : undefined}
      dangerouslySetInnerHTML={{ __html: WIDGET_MARKUP }}
    />
  );
}

// The widget mounts external scripts and lets vanilla JS mutate its DOM
// directly (D3, live-preview controls). Re-rendering for unrelated parent
// state changes re-applies dangerouslySetInnerHTML and wipes that out from
// under it, so this must only re-render when its own props actually change.
export default memo(NetworkWidget);
