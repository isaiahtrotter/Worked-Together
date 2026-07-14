"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type CanvasFrame = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type CanvasTransform = { x: number; y: number; scale: number };

const MIN_SCALE = 0.4;
const MAX_SCALE = 1.5;
const BOUNDS_PADDING = 160;
const PASSTHROUGH_SELECTOR = "[data-canvas-passthrough]";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Pan/zoom for a small, fixed set of known "frames" (not freeform
// whiteboarding), so this is a hand-rolled hook rather than a canvas
// library — full control over "snap to frame" navigation and over letting
// the live widget preview's own internal drag/zoom fully own its subtree
// (see the `data-canvas-passthrough` handling below).
export function useCanvasTransform(frames: CanvasFrame[]) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<CanvasTransform>({ x: 0, y: 0, scale: 1 });
  const [transform, setTransformState] = useState<CanvasTransform>(transformRef.current);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    captured: boolean;
  } | null>(null);
  const animRef = useRef<number | null>(null);

  const applyTransform = useCallback((next: CanvasTransform) => {
    transformRef.current = next;
    setTransformState(next);
  }, []);

  const bounds = useCallback(() => {
    if (frames.length === 0) return null;
    const minX = Math.min(...frames.map((f) => f.x)) - BOUNDS_PADDING;
    const minY = Math.min(...frames.map((f) => f.y)) - BOUNDS_PADDING;
    const maxX = Math.max(...frames.map((f) => f.x + f.width)) + BOUNDS_PADDING;
    const maxY = Math.max(...frames.map((f) => f.y + f.height)) + BOUNDS_PADDING;
    return { minX, minY, maxX, maxY };
  }, [frames]);

  const clampTransform = useCallback(
    (next: CanvasTransform): CanvasTransform => {
      const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
      const b = bounds();
      const viewport = viewportRef.current;
      if (!b || !viewport) return { ...next, scale };
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const minTx = vw - b.maxX * scale;
      const maxTx = -b.minX * scale;
      const minTy = vh - b.maxY * scale;
      const maxTy = -b.minY * scale;
      // When the content is smaller than the viewport at this scale
      // (minTx > maxTx), there's no "falling off the edge" risk — don't
      // force-center, or panToFrame could never recenter on a specific
      // frame right after a zoomToFit (which by definition fits everything,
      // so this branch would otherwise always win and silently override
      // every subsequent pan request back to the same centered point).
      const x = minTx > maxTx ? next.x : clamp(next.x, minTx, maxTx);
      const y = minTy > maxTy ? next.y : clamp(next.y, minTy, maxTy);
      return { x, y, scale };
    },
    [bounds],
  );

  const stopAnimation = useCallback(() => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (target: CanvasTransform, duration = 380) => {
      stopAnimation();
      const start = { ...transformRef.current };
      const startTime = performance.now();
      const step = (now: number) => {
        const t = clamp((now - startTime) / duration, 0, 1);
        const eased = easeOutCubic(t);
        applyTransform({
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased,
          scale: start.scale + (target.scale - start.scale) * eased,
        });
        animRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [applyTransform, stopAnimation],
  );

  // rightInset lets a caller (opening the inspector panel) keep the target
  // frame centered in the space that remains visible beside the panel,
  // instead of centering it in the full viewport and having the panel
  // immediately cover half of what was just selected.
  const panToFrame = useCallback(
    (frameId: string, opts?: { scale?: number; rightInset?: number }) => {
      const frame = frames.find((f) => f.id === frameId);
      const viewport = viewportRef.current;
      if (!frame || !viewport) return;
      const targetScale = clamp(opts?.scale ?? transformRef.current.scale, MIN_SCALE, MAX_SCALE);
      const rightInset = opts?.rightInset ?? 0;
      const visibleWidth = viewport.clientWidth - rightInset;
      const vh = viewport.clientHeight;
      const centerX = frame.x + frame.width / 2;
      const centerY = frame.y + frame.height / 2;
      const target = clampTransform({
        x: visibleWidth / 2 - centerX * targetScale,
        y: vh / 2 - centerY * targetScale,
        scale: targetScale,
      });
      animateTo(target);
    },
    [frames, clampTransform, animateTo],
  );

  const zoomToFit = useCallback(() => {
    const b = bounds();
    const viewport = viewportRef.current;
    if (!b || !viewport) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const contentW = b.maxX - b.minX;
    const contentH = b.maxY - b.minY;
    const scale = clamp(Math.min(vw / contentW, vh / contentH), MIN_SCALE, MAX_SCALE);
    const centerX = (b.minX + b.maxX) / 2;
    const centerY = (b.minY + b.maxY) / 2;
    animateTo({ x: vw / 2 - centerX * scale, y: vh / 2 - centerY * scale, scale });
  }, [bounds, animateTo]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if ((e.target as HTMLElement).closest(PASSTHROUGH_SELECTOR)) return;
      if (e.button !== 0) return;
      stopAnimation();
      // Don't capture the pointer yet — only once real dragging starts (see
      // onPointerMove's threshold check). Capturing eagerly here would
      // hijack the browser's click-target resolution away from whatever
      // element was actually under the cursor (e.g. a preview's select
      // trigger), breaking plain clicks entirely.
      dragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: transformRef.current.x,
        startY: transformRef.current.y,
        captured: false,
      };
    },
    [stopAnimation],
  );

  const DRAG_THRESHOLD = 4;

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      if (!drag.captured) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.captured = true;
        setDragging(true);
      }
      applyTransform(clampTransform({ ...transformRef.current, x: drag.startX + dx, y: drag.startY + dy }));
    },
    [clampTransform, applyTransform],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setDragging(false);
    }
  }, []);

  // Native (non-passive) listener — React's synthetic onWheel is passive by
  // default, which would silently drop preventDefault() and let the page
  // scroll instead of zooming the canvas.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(PASSTHROUGH_SELECTOR)) return;
      e.preventDefault();
      stopAnimation();
      const rect = viewport.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.001);
      const current = transformRef.current;
      const newScale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
      const x = cursorX - (cursorX - current.x) * (newScale / current.scale);
      const y = cursorY - (cursorY - current.y) * (newScale / current.scale);
      applyTransform(clampTransform({ x, y, scale: newScale }));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [applyTransform, clampTransform, stopAnimation]);

  useEffect(() => {
    if (frames.length === 0) return;
    zoomToFit();
    // Only on mount — re-fitting on every frames-array identity change would
    // fight the user's own pan/zoom once they've started navigating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    viewportRef,
    transform,
    dragging,
    panToFrame,
    zoomToFit,
    bind: { onPointerDown, onPointerMove, onPointerUp },
  };
}
