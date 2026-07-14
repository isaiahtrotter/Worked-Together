"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BANNER_MAX_BYTES,
  BANNER_ALLOWED_TYPES,
  validateFile,
  extensionFor,
} from "@/lib/uploadValidation";
import { updateBannerUrl } from "@/app/dashboard/profile/actions";
import { updateOwnerPreview } from "@/lib/widgetLiveUpdate";
import styles from "./widget-ui.module.css";

export default function BannerUpload({
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
      maxBytes: BANNER_MAX_BYTES,
      allowedTypes: BANNER_ALLOWED_TYPES,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      // Reuses the "avatars" bucket's existing RLS policy, which only
      // checks that the path segment before the first "." is the
      // uploader's own profile id — a UUID never contains a ".", so
      // "<id>.banner.<ext>" still satisfies it without a new policy.
      const path = `${profileId}.banner.${extensionFor(file)}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const versionedUrl = `${publicUrl}?t=${Date.now()}`;
      await updateBannerUrl(versionedUrl);
      setPreview(versionedUrl);
      updateOwnerPreview({ bannerUrl: versionedUrl });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setError(null);
    const previous = preview;
    setPreview(null);
    updateOwnerPreview({ bannerUrl: null });
    try {
      await updateBannerUrl(null);
      const path = previous
        ?.split("/storage/v1/object/public/avatars/")[1]
        ?.split("?")[0];
      if (path) {
        const supabase = createClient();
        await supabase.storage.from("avatars").remove([path]);
      }
      router.refresh();
    } catch (err) {
      setPreview(previous);
      updateOwnerPreview({ bannerUrl: previous });
      setError(err instanceof Error ? err.message : "Couldn't remove banner.");
    }
  }

  return (
    <div>
      <div
        className={styles.bannerRect}
        style={preview ? { backgroundImage: `url(${preview})` } : undefined}
      >
        <button
          type="button"
          className={styles.bannerClickArea}
          onClick={() => inputRef.current?.click()}
          aria-label="Change banner"
        >
          {!preview && (uploading ? "Uploading…" : "+ Add banner")}
          <span className={styles.photoHoverOverlay}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        </button>
        {preview && (
          <button
            type="button"
            className={styles.removeThumbBtn}
            onClick={handleRemove}
            aria-label="Remove banner"
          >
            ×
          </button>
        )}
      </div>
      <p className={styles.hint}>
        JPG, PNG, or WEBP. Max 3MB. Best at a 3:1 ratio (e.g. 1200×400px) —
        it&apos;s cropped to fill, so keep the important part centered.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={BANNER_ALLOWED_TYPES.join(",")}
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
