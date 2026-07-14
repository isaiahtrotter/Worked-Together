"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/dashboard/actions";
import styles from "./canvas.module.css";

const SECTIONS: { id: string; label: string; icon: ReactNode }[] = [
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "connections",
    label: "Connections",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "widget-preview",
    label: "Widget",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
];

export default function CanvasNav({
  onNavigate,
  onFitView,
}: {
  onNavigate: (frameId: string) => void;
  onFitView: () => void;
}) {
  return (
    <>
      <div className={styles.brandChip} data-canvas-passthrough>
        <span className={styles.brandIcon}>W</span>
        <span className={styles.brandText}>Worked Together</span>
      </div>

      <form action={signOut} className={styles.signOutChip} data-canvas-passthrough>
        <button type="submit" className={styles.signOutBtn} aria-label="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </form>

      <nav className={styles.bottomNav} data-canvas-passthrough>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={styles.bottomNavItem}
            onClick={() => onNavigate(section.id)}
          >
            {section.icon}
            <span>{section.label}</span>
          </button>
        ))}

        <div className={styles.bottomNavDivider} />

        <button type="button" className={styles.bottomNavItem} onClick={onFitView}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          <span>Fit view</span>
        </button>
      </nav>
    </>
  );
}
