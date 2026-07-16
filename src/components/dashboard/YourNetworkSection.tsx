"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveConnectionNote,
  saveEndorsement,
  searchProfilesByName,
  mergeProfiles,
  dismissMergeSuggestion,
  deletePlaceholderConnection,
  type SearchResult,
} from "@/app/dashboard/connections/actions";
import { MiniAvatar } from "./ConnectionsSection";
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
};

const NOTE_MAX_LENGTH = 80;
const FILTER_THRESHOLD = 6;
const VISIBLE_CAP = 8;
const MERGE_SEARCH_DEBOUNCE_MS = 200;

export default function YourNetworkSection({ accepted }: { accepted: AcceptedRow[] }) {
  const router = useRouter();
  const [acceptedState, setAcceptedState] = useState(accepted);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [mergePickerForRequestId, setMergePickerForRequestId] = useState<string | null>(null);
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeResults, setMergeResults] = useState<SearchResult[]>([]);
  const [mergeSearching, setMergeSearching] = useState(false);
  const [mergeActionError, setMergeActionError] = useState<string | null>(null);
  const mergeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setAcceptedState(accepted), [accepted]);

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

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return acceptedState;
    return acceptedState.filter((row) =>
      (row.other?.name ?? "").toLowerCase().includes(trimmed),
    );
  }, [acceptedState, query]);

  const visible = showAll ? filtered : filtered.slice(0, VISIBLE_CAP);
  const hiddenCount = filtered.length - visible.length;

  function openMergePicker(requestId: string) {
    setMergePickerForRequestId(requestId);
    setMergeQuery("");
    setMergeResults([]);
    setMergeActionError(null);
  }

  function handleMerge(requestId: string, placeholderId: string, targetId: string) {
    setMergePickerForRequestId(null);
    setAcceptedState((prev) => prev.filter((r) => r.request.id !== requestId));
    mergeProfiles(placeholderId, targetId)
      .then((result) => {
        if (result.error) setMergeActionError(result.error);
        router.refresh();
      })
      .catch((err) => {
        setMergeActionError(err instanceof Error ? err.message : "Couldn't merge.");
        router.refresh();
      });
  }

  function handleDeletePlaceholder(requestId: string, placeholderId: string) {
    setAcceptedState((prev) => prev.filter((r) => r.request.id !== requestId));
    deletePlaceholderConnection(placeholderId)
      .then((result) => {
        if (result.error) setMergeActionError(result.error);
        router.refresh();
      })
      .catch((err) => {
        setMergeActionError(err instanceof Error ? err.message : "Couldn't delete.");
        router.refresh();
      });
  }

  function handleDismissSuggestion(placeholderId: string, targetId: string) {
    dismissMergeSuggestion(placeholderId, targetId)
      .then(() => router.refresh())
      .catch(() => router.refresh());
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Your network</p>

      {acceptedState.length > FILTER_THRESHOLD && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name"
          className={styles.input}
          style={{ width: "100%", marginBottom: 10 }}
        />
      )}

      <div className={styles.networkGrid}>
        {visible.map(({ request, other, note, endorsement, mergeSuggestion }) => {
          const isOpen = expandedId === request.id;
          const isPlaceholder = !!other && !other.user_id;
          return (
            <div key={request.id} className={styles.networkCard}>
              <button
                type="button"
                className={styles.networkCardHeader}
                onClick={() => setExpandedId(isOpen ? null : request.id)}
              >
                <span className={styles.searchDropdownIdentity}>
                  <MiniAvatar url={other?.avatar_url} name={other?.name ?? "?"} />
                  <span className={styles.connectionName}>{other?.name ?? "Unknown"}</span>
                  {isPlaceholder && <span className={styles.badge}>Unclaimed</span>}
                </span>
                <span className={styles.networkRowMeta}>
                  {note && <span className={styles.networkDot} title="Has a private note" />}
                  {endorsement && (
                    <span className={styles.networkStar} title="Has a recommendation">
                      ★
                    </span>
                  )}
                  <span className={styles.networkChevron}>{isOpen ? "−" : "+"}</span>
                </span>
              </button>

              {isOpen && (
                <div className={styles.networkCardBody}>
                  <form action={saveConnectionNote} className={styles.noteForm}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input
                      name="note"
                      defaultValue={note}
                      maxLength={NOTE_MAX_LENGTH}
                      placeholder="How do you know them? (private)"
                      className={styles.input}
                    />
                    <button type="submit" className={styles.smallLinkBtn}>
                      Save
                    </button>
                  </form>
                  {other && (
                    <form
                      action={async (formData) => {
                        await saveEndorsement(
                          other.id,
                          (formData.get("endorsement") as string) ?? "",
                        );
                      }}
                      className={styles.noteForm}
                    >
                      <input
                        name="endorsement"
                        defaultValue={endorsement}
                        placeholder="Write a public recommendation…"
                        className={styles.input}
                      />
                      <button type="submit" className={styles.smallLinkBtn}>
                        Save
                      </button>
                    </form>
                  )}

                  {isPlaceholder && other && (
                    <div style={{ marginTop: 4 }}>
                      {mergeSuggestion && (
                        <div className={styles.controlRow} style={{ marginBottom: 8 }}>
                          <span className={styles.hint} style={{ margin: 0 }}>
                            {`This might be ${mergeSuggestion.name} — they've since made a real account.`}
                          </span>
                          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                            <button
                              type="button"
                              className={styles.btnSecondary}
                              onClick={() =>
                                handleMerge(request.id, other.id, mergeSuggestion.id)
                              }
                            >
                              Merge
                            </button>
                            <button
                              type="button"
                              className={styles.smallLinkBtn}
                              onClick={() => handleDismissSuggestion(other.id, mergeSuggestion.id)}
                            >
                              Not them
                            </button>
                          </div>
                        </div>
                      )}

                      {mergePickerForRequestId === request.id ? (
                        <div className={styles.searchWrap} style={{ marginBottom: 0 }}>
                          <input
                            value={mergeQuery}
                            onChange={(e) => setMergeQuery(e.target.value)}
                            placeholder="Search by name"
                            className={styles.input}
                            autoFocus
                          />
                          {mergeQuery.trim() && (
                            <div
                              className={styles.searchDropdown}
                              style={{ position: "static", boxShadow: "none", marginTop: 4 }}
                            >
                              {mergeSearching && (
                                <div className={styles.searchDropdownItem}>Searching…</div>
                              )}
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
                                      onClick={() => handleMerge(request.id, other.id, r.id)}
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
                            onClick={() => setMergePickerForRequestId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 12 }}>
                          <button
                            type="button"
                            className={styles.smallLinkBtn}
                            onClick={() => openMergePicker(request.id)}
                          >
                            Merge into another profile…
                          </button>
                          <button
                            type="button"
                            className={styles.smallLinkBtn}
                            onClick={() => handleDeletePlaceholder(request.id, other.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      {mergeActionError && (
                        <p className={styles.error}>{mergeActionError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className={styles.emptyState}>
          {acceptedState.length === 0 ? "No connections yet." : "No matches."}
        </p>
      )}

      {hiddenCount > 0 && (
        <div className={styles.networkShowMoreRow}>
          <button type="button" className={styles.smallLinkBtn} onClick={() => setShowAll(true)}>
            Show {hiddenCount} more
          </button>
        </div>
      )}
    </div>
  );
}
