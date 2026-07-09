"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AVATAR_MAX_BYTES,
  AVATAR_ALLOWED_TYPES,
  validateFile,
  extensionFor,
} from "@/lib/uploadValidation";
import { updateAvatarUrl } from "@/app/dashboard/profile/actions";
import styles from "./widget-ui.module.css";

export default function AvatarUpload({
  profileId,
  currentUrl,
}: {
  profileId: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateFile(file, {
      maxBytes: AVATAR_MAX_BYTES,
      allowedTypes: AVATAR_ALLOWED_TYPES,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${profileId}.${extensionFor(file)}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      await updateAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      setPreview(`${publicUrl}?t=${Date.now()}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.avatarUpload}>
      <button
        type="button"
        className={styles.avatarCircle}
        onClick={() => inputRef.current?.click()}
        style={preview ? { backgroundImage: `url(${preview})` } : undefined}
        aria-label="Change avatar"
      >
        {!preview && "+"}
      </button>
      <div>
        <button
          type="button"
          className={styles.smallLinkBtn}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Change photo"}
        </button>
        <p className={styles.hint}>JPG, PNG, or WEBP. Max 1MB.</p>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ALLOWED_TYPES.join(",")}
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
