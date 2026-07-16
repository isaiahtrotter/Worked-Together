"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addPlaceholderConnection } from "@/app/dashboard/connections/actions";
import styles from "./widget-ui.module.css";

export default function AddPlaceholderConnection() {
  const router = useRouter();
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
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.fieldRow}>
        <span className={styles.label}>Link to their work</span>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Twitter, Behance, Dribbble, anything"
          className={styles.input}
          required
        />
      </div>
      <button type="submit" className={styles.btnSecondary} disabled={submitting}>
        {submitting ? "Adding…" : "Add"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.hint}>
        We&apos;ll try to pull their name and photo from the link automatically.
      </p>
    </form>
  );
}
