"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchProfilesByName,
  sendConnectionRequest,
  respondToRequest,
  saveConnectionNote,
  type SearchResult,
} from "@/app/dashboard/connections/actions";
import styles from "./widget-ui.module.css";

type OtherProfile = { id: string; name: string; avatar_url: string | null } | undefined;

const SEARCH_DEBOUNCE_MS = 200;

export default function ConnectionsSection({
  incoming,
  outgoing,
  accepted,
}: {
  incoming: { request: { id: string }; other: OtherProfile }[];
  outgoing: { request: { id: string }; other: OtherProfile }[];
  accepted: { request: { id: string }; other: OtherProfile; note: string }[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const seq = ++requestSeq.current;
    debounceRef.current = setTimeout(async () => {
      const { results, error } = await searchProfilesByName(trimmed);
      if (seq !== requestSeq.current) return; // a newer keystroke superseded this
      setResults(results);
      setSearchError(error);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSendRequest(id: string) {
    sendConnectionRequest(id).then(() => {
      setResults((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "pending_outgoing" } : r)),
      );
    });
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Connections</p>

      <div className={styles.searchWrap}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Search by name"
          className={styles.input}
        />
        {isOpen && query.trim() && (
          <div className={styles.searchDropdown}>
            {isSearching && <div className={styles.searchDropdownItem}>Searching…</div>}
            {!isSearching && searchError && (
              <div className={styles.searchDropdownItem}>{searchError}</div>
            )}
            {!isSearching && !searchError && results.length === 0 && (
              <div className={styles.searchDropdownItem}>No matches.</div>
            )}
            {!isSearching &&
              results.map((r) => (
                <div key={r.id} className={styles.searchDropdownItem}>
                  <span>{r.name}</span>
                  {r.status === "not_connected" && (
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSendRequest(r.id)}
                    >
                      Send request
                    </button>
                  )}
                  {r.status === "pending_outgoing" && (
                    <span className={styles.badge}>Pending</span>
                  )}
                  {r.status === "pending_incoming" && (
                    <span className={styles.badge}>Wants to connect</span>
                  )}
                  {r.status === "connected" && <span className={styles.badge}>Connected</span>}
                </div>
              ))}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <>
          <p className={styles.cardLabel} style={{ marginTop: 20 }}>
            Incoming requests
          </p>
          <ul className={styles.list}>
            {incoming.map(({ request, other }) => (
              <li key={request.id} className={styles.row}>
                <span>{other?.name ?? "Unknown"}</span>
                <div className={styles.rowActions}>
                  <form action={respondToRequest.bind(null, request.id, true)}>
                    <button type="submit" className={styles.btnSecondary}>
                      Accept
                    </button>
                  </form>
                  <form action={respondToRequest.bind(null, request.id, false)}>
                    <button type="submit" className={styles.smallLinkBtn}>
                      Decline
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <p className={styles.cardLabel} style={{ marginTop: 20 }}>
            Outgoing requests
          </p>
          <ul className={styles.list}>
            {outgoing.map(({ request, other }) => (
              <li key={request.id} className={styles.row}>
                <span>{other?.name ?? "Unknown"}</span>
                <span className={styles.badge}>Pending</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={styles.cardLabel} style={{ marginTop: 20 }}>
        Your network
      </p>
      <ul className={styles.list}>
        {accepted.map(({ request, other, note }) => (
          <li key={request.id} className={styles.connectionRow}>
            <span className={styles.connectionName}>{other?.name ?? "Unknown"}</span>
            <form action={saveConnectionNote} className={styles.noteForm}>
              <input type="hidden" name="requestId" value={request.id} />
              <input
                name="note"
                defaultValue={note}
                placeholder="How do you know them?"
                className={styles.input}
              />
              <button type="submit" className={styles.smallLinkBtn}>
                Save
              </button>
            </form>
          </li>
        ))}
        {accepted.length === 0 && <li className={styles.emptyState}>No connections yet.</li>}
      </ul>
    </div>
  );
}
