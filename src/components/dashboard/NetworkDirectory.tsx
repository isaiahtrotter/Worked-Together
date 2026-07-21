"use client";

import { useState } from "react";
import { sendConnectionRequest } from "@/app/dashboard/connections/actions";
import type { DirectoryEntry } from "@/lib/dal";
import posthog from "@/lib/posthog";
import styles from "./widget-ui.module.css";

export default function NetworkDirectory({
  initialDirectory,
}: {
  initialDirectory: DirectoryEntry[];
}) {
  const [directory, setDirectory] = useState(initialDirectory);
  const [error, setError] = useState<string | null>(null);

  function handleConnect(id: string) {
    setDirectory((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "pending_outgoing" } : p)),
    );
    sendConnectionRequest(id)
      .then(() => posthog.capture("connection_added", { matched_existing_user: true }))
      .catch((err) => {
        setDirectory((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "not_connected" } : p)),
        );
        setError(err instanceof Error ? err.message : "Couldn't send request.");
      });
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Everyone in the network</p>
      {error && <p className={styles.error}>{error}</p>}

      {directory.length === 0 ? (
        <p className={styles.emptyState}>No one else has signed up yet.</p>
      ) : (
        <div className={styles.directoryGrid}>
          {directory.map((p) => (
            <div key={p.id} className={styles.directoryCard}>
              <span
                className={styles.directoryAvatar}
                style={p.avatar_url ? { backgroundImage: `url(${p.avatar_url})` } : undefined}
              >
                {!p.avatar_url && p.name.charAt(0).toUpperCase()}
              </span>
              <p className={styles.directoryName}>{p.name}</p>
              {p.bio && <p className={styles.directoryBio}>{p.bio}</p>}

              {p.status === "not_connected" && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => handleConnect(p.id)}
                >
                  Connect
                </button>
              )}
              {p.status === "pending_outgoing" && (
                <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>
              )}
              {p.status === "pending_incoming" && (
                <span className={`${styles.badge} ${styles.badgeIncoming}`}>
                  Wants to connect
                </span>
              )}
              {p.status === "connected" && (
                <span className={`${styles.badge} ${styles.badgeConnected}`}>Connected</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
