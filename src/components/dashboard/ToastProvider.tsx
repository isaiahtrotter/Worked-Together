"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./widget-ui.module.css";

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const VISIBLE_MS = 2000;
const FADE_MS = 300;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ShowToast>((msg) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setMessage(msg);
    // Rendered first with visible=false so the fade-in transition (rather
    // than an instant appearance) actually runs, then faded back out and
    // unmounted after the CSS transition finishes.
    setVisible(false);
    requestAnimationFrame(() => setVisible(true));
    hideTimer.current = setTimeout(() => setVisible(false), VISIBLE_MS);
    clearTimer.current = setTimeout(() => setMessage(null), VISIBLE_MS + FADE_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div className={`${styles.toast} ${visible ? styles.toastVisible : ""}`} role="status">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
