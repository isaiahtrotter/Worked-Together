"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { removeConnection, deletePlaceholderConnection } from "@/app/dashboard/connections/actions";
import { MiniAvatar } from "./ConnectionsSection";
import ConfirmDialog from "./ConfirmDialog";
import ConnectionProfilePanel from "./ConnectionProfilePanel";
import { useToast } from "./ToastProvider";
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
  // Set once a merge invitation has been sent and is still awaiting a
  // response -- see inviteMergeConnection.
  pendingMergeTarget?: MergeSuggestion;
};

const FILTER_THRESHOLD = 6;
const VISIBLE_CAP = 8;
const PANEL_CLOSE_MS = 300;

// hover: a ghost preview following the cursor, not yet interactive.
// pinned: clicked -- fixed in place, fully opaque, interactive.
// closing: fading back out after a click outside; removed once the fade finishes.
type PanelState = { requestId: string; mode: "hover" | "pinned" | "closing"; top: number } | null;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function YourNetworkSection({
  accepted,
  owner,
}: {
  accepted: AcceptedRow[];
  owner: { id: string; name: string; avatar_url: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [acceptedState, setAcceptedState] = useState(accepted);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>(null);
  // placeholderId set = this is a placeholder's permanent delete (destroys
  // the profile itself); null = a real connection's removeConnection (just
  // drops the relationship, the other account is untouched).
  const [deleteTarget, setDeleteTarget] = useState<{
    requestId: string;
    placeholderId: string | null;
    name: string;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setAcceptedState(accepted), [accepted]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return acceptedState;
    return acceptedState.filter((row) =>
      (row.other?.name ?? "").toLowerCase().includes(trimmed),
    );
  }, [acceptedState, query]);

  const visible = showAll ? filtered : filtered.slice(0, VISIBLE_CAP);
  const hiddenCount = filtered.length - visible.length;
  const panelRow = panelState
    ? (acceptedState.find((r) => r.request.id === panelState.requestId) ?? null)
    : null;

  // Vertical offset relative to the card's own top, from a viewport Y --
  // e.g. an onMouseMove's clientY -- clamped so the panel never drifts
  // above the card or too far past its bottom.
  function offsetFor(clientY: number) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp(clientY - rect.top - 24, 0, Math.max(0, rect.height - 40));
  }

  function handleGridMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (panelState?.mode === "pinned") return;
    const rowEl = (e.target as HTMLElement).closest<HTMLElement>("[data-request-id]");
    if (!rowEl) {
      setPanelState(null);
      return;
    }
    const requestId = rowEl.dataset.requestId!;
    setPanelState({ requestId, mode: "hover", top: offsetFor(e.clientY) });
  }

  function handleGridMouseLeave() {
    setPanelState((prev) => (prev?.mode === "hover" ? null : prev));
  }

  function handleRowClick(requestId: string, e: React.MouseEvent) {
    setPanelState({ requestId, mode: "pinned", top: offsetFor(e.clientY) });
  }

  function startClosingPanel() {
    setPanelState((prev) => (prev ? { ...prev, mode: "closing" } : prev));
  }

  // A click anywhere outside the pinned panel closes it -- except on
  // another network card, which re-pins to that one instead of closing
  // first (its own onClick handles that re-pin).
  useEffect(() => {
    if (panelState?.mode !== "pinned") return;
    function handleDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      if (target.closest("[data-request-id]")) return;
      startClosingPanel();
    }
    document.addEventListener("mousedown", handleDocMouseDown);
    return () => document.removeEventListener("mousedown", handleDocMouseDown);
  }, [panelState?.mode]);

  useEffect(() => {
    if (panelState?.mode !== "closing") return;
    const timer = setTimeout(() => setPanelState(null), PANEL_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [panelState?.mode]);

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const { requestId, placeholderId } = deleteTarget;
    setDeleteTarget(null);
    setAcceptedState((prev) => prev.filter((r) => r.request.id !== requestId));
    const action = placeholderId ? deletePlaceholderConnection(placeholderId) : removeConnection(requestId);
    action
      .then((result) => {
        if (result && "error" in result && result.error) toast(result.error);
        router.refresh();
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : "Couldn't delete.");
        router.refresh();
      });
  }

  return (
    <div className={`${styles.card} ${styles.networkCardRoot}`} ref={wrapperRef}>
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

      <div
        className={styles.networkGrid}
        onMouseMove={handleGridMouseMove}
        onMouseLeave={handleGridMouseLeave}
      >
        {visible.map(({ request, other, note, endorsement }) => {
          const isPlaceholder = !!other && !other.user_id;
          return (
            <div key={request.id} className={styles.networkCard} data-request-id={request.id}>
              <button
                type="button"
                className={styles.networkCardHeader}
                onClick={(e) => handleRowClick(request.id, e)}
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
                  <span className={styles.networkChevron}>›</span>
                </span>
              </button>
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

      {panelRow && panelState && (
        <div
          ref={panelRef}
          className={styles.profilePanelWrap}
          style={{
            top: panelState.top,
            opacity: panelState.mode === "pinned" ? 1 : panelState.mode === "hover" ? 0.5 : 0,
            pointerEvents: panelState.mode === "pinned" ? "auto" : "none",
          }}
        >
          <ConnectionProfilePanel
            row={panelRow}
            owner={owner}
            onClose={startClosingPanel}
            onRequestDelete={(name) => {
              setPanelState(null);
              setDeleteTarget({
                requestId: panelRow.request.id,
                placeholderId: panelRow.other && !panelRow.other.user_id ? panelRow.other.id : null,
                name,
              });
            }}
          />
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.placeholderId ? "Delete this connection?" : "Remove connection?"}
        message={
          deleteTarget
            ? deleteTarget.placeholderId
              ? `This permanently deletes ${deleteTarget.name}. This can't be undone.`
              : `${deleteTarget.name} will no longer be shown in your network, and you'll no longer be shown in theirs.`
            : ""
        }
        confirmLabel={deleteTarget?.placeholderId ? "Delete" : "Remove"}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
