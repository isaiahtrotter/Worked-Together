"use client";

import { useState } from "react";
import { deleteAccount } from "@/app/dashboard/actions";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./ToastProvider";
import posthog from "@/lib/posthog";
import styles from "./dashboard-page.module.css";

export default function DeleteAccountSection({ profileName }: { profileName: string }) {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleConfirm() {
    setDeleting(true);
    deleteAccount()
      .then(() => {
        posthog.reset();
        // Hard navigation, not router.push -- the session and every bit of
        // this account's data are gone, so a clean reload beats carrying
        // forward any client-side cache/state from the old one.
        window.location.href = "/";
      })
      .catch((err) => {
        setDeleting(false);
        setConfirmOpen(false);
        toast(err instanceof Error ? err.message : "Couldn't delete account — try again");
      });
  }

  return (
    <>
      <button
        type="button"
        className={styles.deleteAccountCorner}
        onClick={() => setConfirmOpen(true)}
        disabled={deleting}
      >
        Delete account
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete your account?"
        message={`This permanently deletes ${profileName}'s profile, every connection, note, endorsement, and work sample. This can't be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete account"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
