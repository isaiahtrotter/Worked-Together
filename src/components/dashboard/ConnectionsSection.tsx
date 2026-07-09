"use client";

import { useState, useTransition } from "react";
import {
  searchProfilesByName,
  sendConnectionRequest,
  respondToRequest,
  saveConnectionNote,
  type SearchResult,
} from "@/app/dashboard/connections/actions";
import styles from "./widget-ui.module.css";

type OtherProfile = { id: string; name: string; avatar_url: string | null } | undefined;

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
  const [isPending, startTransition] = useTransition();

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { results, error } = await searchProfilesByName(query);
      setResults(results);
      setSearchError(error);
    });
  }

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Connections</p>

      <form onSubmit={runSearch} className={styles.searchForm}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name"
          className={styles.input}
        />
        <button type="submit" disabled={isPending} className={styles.btnSecondary}>
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>
      {searchError && <p className={styles.error}>{searchError}</p>}
      <ul className={styles.list}>
        {results.map((r) => (
          <li key={r.id} className={styles.row}>
            <span>{r.name}</span>
            {r.status === "not_connected" && (
              <form action={sendConnectionRequest.bind(null, r.id)}>
                <button type="submit" className={styles.btnSecondary}>
                  Send request
                </button>
              </form>
            )}
            {r.status === "pending_outgoing" && <span className={styles.badge}>Pending</span>}
            {r.status === "pending_incoming" && (
              <span className={styles.badge}>Wants to connect</span>
            )}
            {r.status === "connected" && <span className={styles.badge}>Connected</span>}
          </li>
        ))}
      </ul>

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
