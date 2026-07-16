"use client";

import { memo, useEffect, useRef, useState } from "react";
import { fetchWidgetData } from "@/lib/fetchWidgetData";

const WIDGET_MARKUP = `<div id="widget-root" class="corner-bottom-right">
  <div class="launcher" id="launcher-btn" role="button" aria-label="View My Network">
    <svg width="25" height="14" viewBox="0 0 25 14" fill="none" style="flex-shrink:0;" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.83142 1.18462C2.46521 -0.0329248 4.88956 -0.366307 7.24548 0.439507C8.45198 0.852243 9.4059 1.4845 9.96521 2.16607C9.95051 1.92031 9.99862 1.68096 10.1156 1.45611C10.7492 0.238515 13.1728 -0.0956274 15.5287 0.710015C17.8846 1.51581 19.2812 3.15643 18.6478 4.37408C18.6324 4.40374 18.6146 4.43238 18.597 4.46099C19.4985 4.39843 20.5433 4.53304 21.5746 4.8858C23.9303 5.69171 25.3264 7.33227 24.6927 8.54986C24.2005 9.49537 22.6291 9.90445 20.848 9.66412C22.4649 10.5378 23.3085 11.818 22.7894 12.8155C22.1555 14.0329 19.7321 14.3663 17.3763 13.5606C16.4454 13.2422 15.6662 12.7915 15.101 12.2901C15.088 12.4709 15.0409 12.6475 14.9535 12.8155C14.3197 14.0329 11.8962 14.3662 9.54041 13.5606C7.18438 12.7548 5.78761 11.1142 6.42126 9.89654C6.4592 9.82367 6.50372 9.75404 6.55408 9.68755C5.58769 9.80774 4.42129 9.68846 3.27087 9.29498C0.915004 8.4891 -0.480927 6.84855 0.15271 5.63091C0.662638 4.65175 2.32993 4.2457 4.18884 4.54302C2.3048 3.67511 1.26956 2.26433 1.83142 1.18462ZM16.2084 5.54498C15.3078 5.60701 14.2648 5.47243 13.2347 5.12017C12.0271 4.70713 11.0723 4.0739 10.5131 3.39166C10.5281 3.63803 10.4809 3.87819 10.3636 4.10357C9.85362 5.08314 8.1853 5.48839 6.32556 5.19048C8.21077 6.05833 9.24601 7.4698 8.68396 8.54986C8.64633 8.62212 8.60198 8.69091 8.55212 8.75689C9.51833 8.63685 10.6843 8.75808 11.8344 9.15142C12.7647 9.46962 13.5436 9.91992 14.1088 10.421C14.1218 10.2404 14.1699 10.0643 14.2572 9.89654C14.7493 8.95099 16.3209 8.5411 18.1019 8.7813C16.4855 7.90762 15.6415 6.62822 16.1605 5.63091C16.1756 5.60188 16.1913 5.573 16.2084 5.54498Z" fill="black"/>
    </svg>
    <span id="launcher-icon-emoji" style="display:none;font-size:16px;line-height:1;"></span>
    <span class="launcher-label">View My Network</span>
  </div>

  <div class="panel-expanded">
    <div id="ring-app" style="position:relative;width:100%;height:100%;overflow:hidden;">
      <div id="dot-highlight-layer" style="position:absolute;inset:0;pointer-events:none;z-index:0;"></div>
      <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
      <button id="resize-toggle-btn" aria-label="Show resize handle" style="display:none;position:absolute;top:14px;left:14px;width:30px;height:30px;padding:0;border-radius:99px;border:none;align-items:center;justify-content:center;cursor:pointer;z-index:3;"><span id="resize-toggle-icon"></span></button>
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
          <span>Made with Linkenode</span>
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
  shadow?: number;
  icon?: boolean;
  iconEmoji?: string;
  appOrigin?: string;
  disableCallToAction?: boolean;
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
          window.__initNetworkWidget?.(widgetData, {
            mode,
            appOrigin: window.location.origin,
            // This is only ever the dashboard's own live preview, never a
            // real third-party embed — clicking "Add me"/"Create your
            // network" shouldn't navigate the page you're editing away.
            disableCallToAction: true,
          });
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
