"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/dal";
import { updateProfile } from "@/app/dashboard/profile/actions";
import AvatarUpload from "./AvatarUpload";
import styles from "./widget-ui.module.css";

export default function ProfileSection({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, {
    error: null,
  });

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Your profile</p>

      <AvatarUpload profileId={profile.id} currentUrl={profile.avatar_url} />

      <form action={formAction}>
        {state.error && <p className={styles.error}>{state.error}</p>}

        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={profile.name}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="bio">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={profile.bio ?? ""}
            rows={3}
            className={styles.textarea}
          />
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="website">
            Website
          </label>
          <input
            id="website"
            name="website"
            defaultValue={profile.website ?? ""}
            placeholder="yoursite.com"
            className={styles.input}
          />
        </div>

        <button type="submit" disabled={pending} className={styles.btnPrimary}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
