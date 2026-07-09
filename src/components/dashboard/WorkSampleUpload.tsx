"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  WORK_SAMPLE_MAX_BYTES,
  WORK_SAMPLE_ALLOWED_TYPES,
  validateFile,
  extensionFor,
} from "@/lib/uploadValidation";
import { addWorkSample } from "@/app/dashboard/profile/actions";
import styles from "./widget-ui.module.css";

export default function WorkSampleUpload({ profileId }: { profileId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateFile(file, {
      maxBytes: WORK_SAMPLE_MAX_BYTES,
      allowedTypes: WORK_SAMPLE_ALLOWED_TYPES,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${profileId}/${crypto.randomUUID()}.${extensionFor(file)}`;
      const { error: uploadError } = await supabase.storage
        .from("work-samples")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("work-samples").getPublicUrl(path);

      const formData = new FormData();
      formData.set("url", publicUrl);
      const result = await addWorkSample({ error: null }, formData);
      if (result.error) throw new Error(result.error);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={styles.smallLinkBtn}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading…" : "+ Add work sample"}
      </button>
      <p className={styles.hint}>JPG, PNG, WEBP, or GIF. Max 3MB each.</p>
      {error && <p className={styles.error}>{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={WORK_SAMPLE_ALLOWED_TYPES.join(",")}
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
