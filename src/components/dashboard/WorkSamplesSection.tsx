"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkSample } from "@/lib/dal";
import { removeWorkSample, reorderWorkSamples } from "@/app/dashboard/profile/actions";
import WorkSampleUpload from "./WorkSampleUpload";
import styles from "./widget-ui.module.css";

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
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSamples(workSamples);
  }, [workSamples]);

  function handleRemove(id: string, url: string) {
    setPending(true);
    removeWorkSample(id, url).then(() => router.refresh());
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = samples.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setSamples(next);
    setDragIndex(null);
    setPending(true);
    reorderWorkSamples(next.map((s) => s.id))
      .then(() => router.refresh())
      .finally(() => setPending(false));
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Work samples</p>

      <div className={styles.sampleGrid}>
        {samples.map((sample, index) => (
          <div
            key={sample.id}
            className={styles.sampleThumb}
            style={{
              backgroundImage: `url(${sample.url})`,
              opacity: dragIndex === index ? 0.4 : 1,
            }}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => setDragIndex(null)}
          >
            <button
              type="button"
              className={styles.removeThumbBtn}
              onClick={() => handleRemove(sample.id, sample.url)}
              disabled={pending}
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {samples.length === 0 && (
        <p className={styles.emptyState}>No work samples yet.</p>
      )}
      {samples.length > 1 && (
        <p className={styles.hint} style={{ marginTop: -8, marginBottom: 12 }}>
          Drag to reorder.
        </p>
      )}

      <WorkSampleUpload profileId={profileId} />
    </div>
  );
}
