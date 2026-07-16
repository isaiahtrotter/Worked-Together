import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireSessionUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return user;
});

export type WidgetSettings = {
  theme: "light" | "dark";
  cornerRadius: number;
  shadow: number; // 0-100 intensity
  label: string; // launcher button text, capped at BUTTON_LABEL_MAX_LENGTH
};

export type Profile = {
  id: string;
  user_id: string | null; // null for a placeholder profile added without an account
  name: string;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
  embed_key: string;
  widget_settings: WidgetSettings | null;
  placeholder_owner_id: string | null;
  merge_dismissed_target_id: string | null;
};

// Lowercase, strip protocol/www/trailing slash — good enough to notice "the
// same link" without needing exact string equality.
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

export const getOwnProfile = cache(async () => {
  const user = await requireSessionUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
});

export type WorkSample = {
  id: string;
  profile_id: string;
  url: string;
  sort_order: number;
};

export const getOwnWorkSamples = cache(async () => {
  const profile = await getOwnProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_samples")
    .select("*")
    .eq("profile_id", profile.id)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as WorkSample[];
});

export const getOwnConnectionsData = cache(async () => {
  const profile = await getOwnProfile();
  if (!profile) return { incoming: [], outgoing: [], accepted: [] };
  const myId = profile.id;

  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("connection_requests")
    .select("*")
    .or(`requester_id.eq.${myId},recipient_id.eq.${myId}`);
  if (error) throw error;

  const otherIds = Array.from(
    new Set(
      (requests ?? []).map((r) =>
        r.requester_id === myId ? r.recipient_id : r.requester_id,
      ),
    ),
  );

  type OtherProfileRow = {
    id: string;
    name: string;
    avatar_url: string | null;
    user_id: string | null;
    website: string | null;
    placeholder_owner_id?: string | null;
    merge_dismissed_target_id?: string | null;
  };

  // The placeholder-profile columns (placeholder_owner_id,
  // merge_dismissed_target_id — see supabase/policies-reference.sql section
  // 10) may not exist yet if that migration hasn't been run against the
  // live database. Degrade to the base columns in that case rather than
  // throwing and taking down the entire dashboard over a feature whose
  // schema isn't set up yet — merge suggestions just won't compute until
  // then, but everything else keeps working.
  async function fetchOtherProfiles(): Promise<OtherProfileRow[]> {
    if (!otherIds.length) return [];
    const extended = await supabase
      .from("profiles")
      .select("id, name, avatar_url, user_id, website, placeholder_owner_id, merge_dismissed_target_id")
      .in("id", otherIds);
    if (!extended.error) return (extended.data ?? []) as OtherProfileRow[];

    const fallback = await supabase
      .from("profiles")
      .select("id, name, avatar_url, user_id, website")
      .in("id", otherIds);
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []) as OtherProfileRow[];
  }

  const [otherProfiles, notesRes, endorsementsRes, realProfilesRes] = await Promise.all([
    fetchOtherProfiles(),
    supabase.from("connection_notes").select("*").eq("profile_id", myId),
    supabase.from("endorsements").select("*").eq("from_profile_id", myId),
    // Used below to suggest merging a placeholder connection into a matching
    // real account once one exists — only fetched for the "does a real
    // profile with this website already exist" check, nothing else. Only
    // ever references pre-existing columns, so no fallback needed here.
    supabase
      .from("profiles")
      .select("id, name, avatar_url, website")
      .not("website", "is", null)
      .not("user_id", "is", null),
  ]);

  if (notesRes.error) throw notesRes.error;
  if (endorsementsRes.error) throw endorsementsRes.error;
  if (realProfilesRes.error) throw realProfilesRes.error;

  const profileById = new Map(otherProfiles.map((p) => [p.id, p]));
  const noteByRequestId = new Map(
    (notesRes.data ?? []).map((n) => [n.connection_request_id, n.note]),
  );
  const endorsementByToId = new Map(
    (endorsementsRes.data ?? []).map((e) => [e.to_profile_id, e.text]),
  );
  const realProfileByWebsite = new Map(
    (realProfilesRes.data ?? [])
      .filter((p) => p.website)
      .map((p) => [normalizeUrl(p.website as string), p]),
  );

  const incoming = (requests ?? [])
    .filter((r) => r.recipient_id === myId && r.status === "pending")
    .map((r) => ({ request: r, other: profileById.get(r.requester_id) }));

  const outgoing = (requests ?? [])
    .filter((r) => r.requester_id === myId && r.status === "pending")
    .map((r) => ({ request: r, other: profileById.get(r.recipient_id) }));

  const accepted = (requests ?? [])
    .filter((r) => r.status === "accepted")
    .map((r) => {
      const otherId = r.requester_id === myId ? r.recipient_id : r.requester_id;
      const other = profileById.get(otherId);

      let mergeSuggestion: { id: string; name: string; avatar_url: string | null } | null = null;
      if (other && !other.user_id && other.placeholder_owner_id === myId && other.website) {
        const match = realProfileByWebsite.get(normalizeUrl(other.website));
        if (match && match.id !== other.merge_dismissed_target_id) {
          mergeSuggestion = { id: match.id, name: match.name, avatar_url: match.avatar_url };
        }
      }

      // "Merge" sends a connection invitation rather than merging instantly
      // (see finalize_placeholder_merge / accept_connection_request in
      // policies-reference.sql) -- surface whichever invitation is still
      // awaiting a response so the UI doesn't just look like Merge did
      // nothing.
      let pendingMergeTarget: { id: string; name: string; avatar_url: string | null } | null = null;
      if (other && !other.user_id) {
        const pendingInvite = (requests ?? []).find(
          (req) =>
            req.requester_id === myId &&
            req.status === "pending" &&
            req.merge_placeholder_id === other.id,
        );
        if (pendingInvite) {
          const target = profileById.get(pendingInvite.recipient_id);
          if (target) {
            pendingMergeTarget = { id: target.id, name: target.name, avatar_url: target.avatar_url };
          }
        }
      }

      return {
        request: r,
        other,
        note: noteByRequestId.get(r.id) ?? "",
        endorsement: endorsementByToId.get(otherId) ?? "",
        mergeSuggestion,
        pendingMergeTarget,
      };
    });

  return { incoming, outgoing, accepted };
});

export type DirectoryEntry = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  status: "not_connected" | "pending_outgoing" | "pending_incoming" | "connected";
};

export const getNetworkDirectory = cache(async (): Promise<DirectoryEntry[]> => {
  const me = await getOwnProfile();
  if (!me) return [];

  const supabase = await createClient();
  const [{ data: allProfiles, error }, connections] = await Promise.all([
    // Placeholder profiles (added without an account) are private to
    // whoever added them until merged into a real account — never
    // searchable/browsable by anyone else.
    supabase
      .from("profiles")
      .select("id, name, bio, avatar_url")
      .not("user_id", "is", null)
      .order("name"),
    getOwnConnectionsData(),
  ]);
  if (error) throw error;

  const statusById = new Map<string, DirectoryEntry["status"]>();
  connections.incoming.forEach(({ other }) => {
    if (other) statusById.set(other.id, "pending_incoming");
  });
  connections.outgoing.forEach(({ other }) => {
    if (other) statusById.set(other.id, "pending_outgoing");
  });
  connections.accepted.forEach(({ other }) => {
    if (other) statusById.set(other.id, "connected");
  });

  return (allProfiles ?? [])
    .filter((p) => p.id !== me.id)
    .map((p) => ({ ...p, status: statusById.get(p.id) ?? "not_connected" }));
});
