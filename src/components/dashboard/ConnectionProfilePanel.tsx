"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveConnectionNote,
  saveEndorsement,
  searchProfilesByName,
  inviteMergeConnection,
  dismissMergeSuggestion,
  type SearchResult,
} from "@/app/dashboard/connections/actions";
import { MiniAvatar } from "./ConnectionsSection";
import { useToast } from "./ToastProvider";
import { updateConnectionEndorsementPreview, updateConnectionPreview } from "@/lib/widgetLiveUpdate";
import styles from "./widget-ui.module.css";

type OtherProfile =
  | { id: string; name: string; avatar_url: string | null; user_id: string | null }
  | undefined;
type MergeSuggestion = { id: string; name: string; avatar_url: string | null } | null;
type AcceptedRow = {
  request: { id: string };
  other: OtherProfile;
  note: string;
  endorsement: string;
  mergeSuggestion?: MergeSuggestion;
  pendingMergeTarget?: MergeSuggestion;
};

const NOTE_MAX_LENGTH = 60;
const ENDORSEMENT_MAX_LENGTH = 1000;
const MERGE_SEARCH_DEBOUNCE_MS = 200;

export default function ConnectionProfilePanel({
  row,
  owner,
  draft,
  onDraftChange,
  onSaved,
  onClose,
  onRequestDelete,
}: {
  row: AcceptedRow;
  owner: { id: string; name: string; avatar_url: string | null };
  // Unsaved text lives in the parent (keyed by request id), not just here --
  // this panel gets unmounted on close/hover-away, so anything typed but not
  // saved would otherwise vanish the moment you click out by accident.
  draft?: { note?: string; endorsement?: string };
  onDraftChange: (patch: { note?: string; endorsement?: string }) => void;
  onSaved: () => void;
  onClose: () => void;
  // Fires for both a real connection's "Remove connection" and a
  // placeholder's "Delete" -- the parent decides which server action to
  // run (and shows the confirm dialog) since it already knows which kind
  // this row is.
  onRequestDelete: (name: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { request, other, note, endorsement, mergeSuggestion, pendingMergeTarget } = row;
  const isPlaceholder = !!other && !other.user_id;

  const [noteDraft, setNoteDraft] = useState(draft?.note ?? note);
  const [endorsementDraft, setEndorsementDraft] = useState(draft?.endorsement ?? endorsement);
  const [saving, setSaving] = useState(false);
  // Resyncs only when this panel starts showing a genuinely different
  // connection (request.id changes) -- not on every note/endorsement prop
  // change, which would otherwise clobber an in-progress edit whenever an
  // unrelated refresh updates this same row's data while it's open.
  useEffect(() => {
    setNoteDraft(draft?.note ?? note);
    setEndorsementDraft(draft?.endorsement ?? endorsement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  const isDirty = noteDraft !== note || (!!other && endorsementDraft !== endorsement);

  const [mergePickerOpen, setMergePickerOpen] = useState(false);
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeResults, setMergeResults] = useState<SearchResult[]>([]);
  const [mergeSearching, setMergeSearching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const mergeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mergeDebounceRef.current) clearTimeout(mergeDebounceRef.current);
    const trimmed = mergeQuery.trim();
    if (!trimmed) {
      setMergeResults([]);
      setMergeSearching(false);
      return;
    }
    setMergeSearching(true);
    mergeDebounceRef.current = setTimeout(async () => {
      const { results } = await searchProfilesByName(trimmed);
      setMergeResults(results);
      setMergeSearching(false);
    }, MERGE_SEARCH_DEBOUNCE_MS);
    return () => {
      if (mergeDebounceRef.current) clearTimeout(mergeDebounceRef.current);
    };
  }, [mergeQuery]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSave() {
    if (!isDirty) return;
    setSaving(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (noteDraft !== note) tasks.push(saveConnectionNote(request.id, noteDraft));
      if (other && endorsementDraft !== endorsement) tasks.push(saveEndorsement(other.id, endorsementDraft));
      await Promise.all(tasks);
      toast("Saved");
      onSaved();
      router.refresh();
    } catch {
      toast("Couldn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  function openMergePicker() {
    setMergePickerOpen(true);
    setMergeQuery("");
    setMergeResults([]);
    setActionError(null);
  }

  function handleMerge(targetId: string) {
    if (!other) return;
    setMergePickerOpen(false);
    // Doesn't merge instantly -- this just sends a connection invitation.
    // It'll actually fold in once they accept it (or immediately if the
    // two accounts already happen to be connected).
    inviteMergeConnection(other.id, targetId)
      .then((result) => {
        if (result.error) {
          setActionError(result.error);
        } else {
          toast("Invitation sent");
        }
        router.refresh();
      })
      .catch((err) => {
        setActionError(err instanceof Error ? err.message : "Couldn't send invitation.");
        router.refresh();
      });
  }

  function handleDismissSuggestion(targetId: string) {
    if (!other) return;
    dismissMergeSuggestion(other.id, targetId)
      .then(() => router.refresh())
      .catch(() => router.refresh());
  }

  return (
    <div className={styles.profilePanelCard}>
      <div className={styles.profileDialogHeader}>
        <span
          className={styles.profileDialogAvatar}
          style={other?.avatar_url ? { backgroundImage: `url(${other.avatar_url})` } : undefined}
        >
          {!other?.avatar_url && (other?.name ?? "?").charAt(0).toUpperCase()}
        </span>
        <span className={styles.profileDialogIdentity}>
          <span className={styles.profileDialogName}>{other?.name ?? "Unknown"}</span>
          {isPlaceholder && <span className={styles.badge}>Unclaimed</span>}
        </span>
        <button
          type="button"
          className={styles.profileDialogCloseBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={styles.profileDialogFields}>
        <div className={styles.controlRow}>
          <span className={styles.label}>How do you know them?</span>
          <div className={styles.inputWithCounter}>
            <input
              name="note"
              value={noteDraft}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="e.g. College roommate"
              className={styles.input}
              style={{ width: "100%" }}
              onChange={(e) => {
                setNoteDraft(e.target.value);
                if (other) updateConnectionPreview(other.id, { relationship: e.target.value });
                onDraftChange({ note: e.target.value });
              }}
            />
            <span className={styles.inputCounter}>
              {noteDraft.length}/{NOTE_MAX_LENGTH}
            </span>
          </div>
        </div>

        {other && (
          <div className={styles.controlRow}>
            <span className={styles.label}>Recommendation</span>
            <div className={styles.textareaWithCounter}>
              <textarea
                name="endorsement"
                value={endorsementDraft}
                maxLength={ENDORSEMENT_MAX_LENGTH}
                placeholder="Write a public recommendation…"
                className={styles.textarea}
                onChange={(e) => {
                  setEndorsementDraft(e.target.value);
                  updateConnectionEndorsementPreview(
                    other.id,
                    owner.id,
                    owner.name,
                    owner.avatar_url,
                    e.target.value,
                  );
                  onDraftChange({ endorsement: e.target.value });
                }}
              />
              <span className={styles.inputCounter}>
                {endorsementDraft.length}/{ENDORSEMENT_MAX_LENGTH}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          className={styles.saveButton}
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {!isPlaceholder && other && (
        <div className={styles.profileDialogFooter}>
          <div className={styles.profileDialogFooterActions}>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={() => onRequestDelete(other.name)}
            >
              Remove connection
            </button>
          </div>
        </div>
      )}

      {isPlaceholder && other && (
        <div className={styles.profileDialogFooter}>
          {pendingMergeTarget && (
            <p className={styles.hint} style={{ margin: "0 0 8px" }}>
              {`Invitation sent to ${pendingMergeTarget.name} — waiting for them to accept.`}
            </p>
          )}

          {!pendingMergeTarget && mergeSuggestion && (
            <div className={styles.controlRow} style={{ marginBottom: 8 }}>
              <span className={styles.hint} style={{ margin: 0 }}>
                {`This might be ${mergeSuggestion.name} — they've since made a real account.`}
              </span>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => handleMerge(mergeSuggestion.id)}
                >
                  Merge
                </button>
                <button
                  type="button"
                  className={styles.smallLinkBtn}
                  onClick={() => handleDismissSuggestion(mergeSuggestion.id)}
                >
                  Not them
                </button>
              </div>
            </div>
          )}

          {!pendingMergeTarget && mergePickerOpen && (
            <div className={styles.searchWrap} style={{ marginBottom: 8 }}>
              <input
                value={mergeQuery}
                onChange={(e) => setMergeQuery(e.target.value)}
                placeholder="Search by name"
                className={styles.input}
                style={{ width: "100%" }}
                autoFocus
              />
              {mergeQuery.trim() && (
                <div
                  className={styles.searchDropdown}
                  style={{ position: "static", boxShadow: "none", marginTop: 4 }}
                >
                  {mergeSearching && <div className={styles.searchDropdownItem}>Searching…</div>}
                  {!mergeSearching && mergeResults.length === 0 && (
                    <div className={styles.searchDropdownItem}>No matches.</div>
                  )}
                  {!mergeSearching &&
                    mergeResults.map((r) => (
                      <div key={r.id} className={styles.searchDropdownItem}>
                        <span className={styles.searchDropdownIdentity}>
                          <MiniAvatar url={r.avatar_url} name={r.name} />
                          <span>{r.name}</span>
                        </span>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleMerge(r.id)}
                        >
                          Merge
                        </button>
                      </div>
                    ))}
                </div>
              )}
              <button
                type="button"
                className={styles.smallLinkBtn}
                style={{ marginTop: 6 }}
                onClick={() => setMergePickerOpen(false)}
              >
                Cancel
              </button>
            </div>
          )}

          <div className={styles.profileDialogFooterActions}>
            {!pendingMergeTarget && !mergePickerOpen && (
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ marginRight: "auto" }}
                onClick={openMergePicker}
              >
                Merge existing profile
              </button>
            )}
            {!mergePickerOpen && (
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => onRequestDelete(other.name)}
              >
                Delete
              </button>
            )}
          </div>

          {actionError && <p className={styles.error}>{actionError}</p>}
        </div>
      )}
    </div>
  );
}
