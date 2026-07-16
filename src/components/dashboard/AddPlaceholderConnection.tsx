"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addPlaceholderConnection } from "@/app/dashboard/connections/actions";
import styles from "./widget-ui.module.css";

export default function AddPlaceholderConnection() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await addPlaceholderConnection({ link });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setLink("");
    setIsOpen(false);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className={styles.smallLinkBtn}
        onClick={() => setIsOpen(true)}
        style={{ marginBottom: 14, display: "block" }}
      >
        Add someone without an account
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <div className={styles.fieldRowGroup}>
        <div className={styles.fieldRow} style={{ flex: "1 1 100%" }}>
          <span className={styles.label}>Link to their work</span>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Twitter, Behance, Dribbble, anything"
            className={styles.input}
            required
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" className={styles.btnSecondary} disabled={submitting}>
          {submitting ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          className={styles.smallLinkBtn}
          onClick={() => setIsOpen(false)}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.hint}>
        We&apos;ll try to pull their name and photo from the link automatically.
      </p>
    </form>
  );
}
