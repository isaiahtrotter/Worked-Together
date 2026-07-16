"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/dal";
import { updateProfile } from "@/app/dashboard/profile/actions";
import { updateOwnerPreview } from "@/lib/widgetLiveUpdate";
import { useToast } from "./ToastProvider";
import AvatarUpload from "./AvatarUpload";
import styles from "./widget-ui.module.css";

const BIO_MAX_LENGTH = 80;

export default function ProfileSection({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, {
    error: null,
  });
  const [bioLength, setBioLength] = useState((profile.bio ?? "").length);
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyRef = useRef(false);
  const wasPending = useRef(false);
  const toast = useToast();

  // Fires once per submission, whichever field's blur triggered it (all
  // three fields save together, matching the single update() call this
  // always was) -- not on every render, just the pending -> not-pending
  // transition.
  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.error) {
        toast("Couldn't save — try again");
      } else {
        dirtyRef.current = false;
        toast("Saved");
      }
    }
    wasPending.current = pending;
  }, [pending, state, toast]);

  function markDirty() {
    dirtyRef.current = true;
  }

  function handleBlur() {
    if (dirtyRef.current) formRef.current?.requestSubmit();
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Your profile</p>

      <AvatarUpload profileId={profile.id} currentUrl={profile.avatar_url} />

      <form ref={formRef} action={formAction}>
        <div className={styles.fieldRowGroup}>
          <div className={styles.fieldRow}>
            <label className={styles.label} htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              defaultValue={profile.name}
              onChange={(e) => {
                updateOwnerPreview({ name: e.target.value });
                markDirty();
              }}
              onBlur={handleBlur}
              required
              className={styles.input}
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
              onChange={(e) => {
                updateOwnerPreview({ website: e.target.value });
                markDirty();
              }}
              onBlur={handleBlur}
              placeholder="yoursite.com"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="bio">
            Bio
          </label>
          <div className={styles.inputWithCounter}>
            <input
              id="bio"
              name="bio"
              type="text"
              maxLength={BIO_MAX_LENGTH}
              defaultValue={profile.bio ?? ""}
              onChange={(e) => {
                updateOwnerPreview({ bio: e.target.value });
                setBioLength(e.target.value.length);
                markDirty();
              }}
              onBlur={handleBlur}
              className={styles.input}
            />
            <span className={styles.inputCounter}>
              {bioLength}/{BIO_MAX_LENGTH}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
