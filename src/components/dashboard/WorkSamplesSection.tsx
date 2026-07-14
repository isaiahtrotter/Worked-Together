"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkSample } from "@/lib/dal";
import {
  addWorkSample,
  removeWorkSample,
  reorderWorkSamples,
} from "@/app/dashboard/profile/actions";
import { createClient } from "@/lib/supabase/client";
import {
  WORK_SAMPLE_MAX_BYTES,
  WORK_SAMPLE_ALLOWED_TYPES,
  validateFile,
  extensionFor,
} from "@/lib/uploadValidation";
import { updateOwnerPreview } from "@/lib/widgetLiveUpdate";
import styles from "./widget-ui.module.css";

const MAX_SAMPLES = 4;

export default function WorkSamplesSection({
  profileId,
  workSamples,
}: {
  profileId: string;
  workSamples: WorkSample[];
}) {
  const router = useRouter();
  const [samples, setSamples] = useState(workSamples);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const thumbRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRectsRef = useRef(new Map<string, DOMRect>());

  useEffect(() => {
    setSamples(workSamples);
  }, [workSamples]);

  useEffect(() => {
    updateOwnerPreview({ workSamples: samples });
  }, [samples]);

  // FLIP: when a sample's grid position changes (reorder, add, remove),
  // the browser has already snapped it to its new spot by the time this
  // runs — so animate FROM the old offset back to zero instead, giving the
  // "magnetized slide into place" feel rather than an instant jump.
  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    thumbRefs.current.forEach((el, id) => {
      nextRects.set(id, el.getBoundingClientRect());
    });

    nextRects.forEach((next, id) => {
      const prev = prevRectsRef.current.get(id);
      const el = thumbRefs.current.get(id);
      if (!prev || !el) return;

      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (!dx && !dy) return;

      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.getBoundingClientRect(); // force reflow so the start position takes effect
      requestAnimationFrame(() => {
        el.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
      });
    });

    prevRectsRef.current = nextRects;
  }, [samples]);

  function handleRemove(id: string, url: string) {
    const previous = samples;
    setSamples((prev) => prev.filter((s) => s.id !== id));
    removeWorkSample(id, url)
      .then(() => router.refresh())
      .catch((err) => {
        setSamples(previous);
        setError(err instanceof Error ? err.message : "Couldn't remove sample.");
      });
  }

  function reorderTo(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = samples.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setSamples(next);
    setDragIndex(null);
    setOverIndex(null);
    reorderWorkSamples(next.map((s) => s.id)).then(() => router.refresh());
  }

  async function uploadFile(file: File, slotIndex: number) {
    const validationError = validateFile(file, {
      maxBytes: WORK_SAMPLE_MAX_BYTES,
      allowedTypes: WORK_SAMPLE_ALLOWED_TYPES,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploadingSlot(slotIndex);
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
      setUploadingSlot(null);
    }
  }

  function handleEmptySlotDrop(e: React.DragEvent, slotIndex: number) {
    e.preventDefault();
    setOverIndex(null);
    if (dragIndex !== null) {
      reorderTo(slotIndex);
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file, slotIndex);
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Work samples</p>

      <div className={styles.sampleGrid}>
        {Array.from({ length: MAX_SAMPLES }).map((_, index) => {
          const sample = samples[index];

          if (sample) {
            return (
              <div
                key={sample.id}
                ref={(el) => {
                  if (el) thumbRefs.current.set(sample.id, el);
                  else thumbRefs.current.delete(sample.id);
                }}
                className={`${styles.sampleThumb} ${overIndex === index && dragIndex !== null && dragIndex !== index ? styles.sampleThumbDragOver : ""}`}
                style={{
                  backgroundImage: `url(${sample.url})`,
                  opacity: dragIndex === index ? 0.4 : 1,
                }}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  reorderTo(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
              >
                <button
                  type="button"
                  className={styles.removeThumbBtn}
                  onClick={() => handleRemove(sample.id, sample.url)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            );
          }

          return (
            <div
              key={`empty-${index}`}
              className={`${styles.sampleSlotEmpty} ${overIndex === index ? styles.sampleSlotDragOver : ""}`}
              onClick={() => inputRefs.current[index]?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex((prev) => (prev === index ? null : prev))}
              onDrop={(e) => handleEmptySlotDrop(e, index)}
            >
              {uploadingSlot === index ? "…" : "+"}
              <input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="file"
                accept={WORK_SAMPLE_ALLOWED_TYPES.join(",")}
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) uploadFile(file, index);
                }}
              />
            </div>
          );
        })}
      </div>

      <p className={styles.hint} style={{ margin: 0 }}>
        Drag a sample to reorder it. JPG, PNG, WEBP, or GIF. Max 5MB each.
      </p>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
