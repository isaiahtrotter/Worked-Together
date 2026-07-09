"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkSample } from "@/lib/dal";
import { removeWorkSample } from "@/app/dashboard/profile/actions";
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
  const [isPending, startTransition] = useTransition();

  function handleRemove(id: string, url: string) {
    startTransition(async () => {
      await removeWorkSample(id, url);
      router.refresh();
    });
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Work samples</p>

      <div className={styles.sampleGrid}>
        {workSamples.map((sample) => (
          <div
            key={sample.id}
            className={styles.sampleThumb}
            style={{ backgroundImage: `url(${sample.url})` }}
          >
            <button
              type="button"
              className={styles.removeThumbBtn}
              onClick={() => handleRemove(sample.id, sample.url)}
              disabled={isPending}
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {workSamples.length === 0 && (
        <p className={styles.emptyState}>No work samples yet.</p>
      )}

      <WorkSampleUpload profileId={profileId} />
    </div>
  );
}
