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
  shadow: boolean;
};

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
  embed_key: string;
  widget_settings: WidgetSettings | null;
};

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

  const [profilesRes, notesRes] = await Promise.all([
    otherIds.length
      ? supabase.from("profiles").select("id, name, avatar_url").in("id", otherIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("connection_notes").select("*").eq("profile_id", myId),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (notesRes.error) throw notesRes.error;

  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const noteByRequestId = new Map(
    (notesRes.data ?? []).map((n) => [n.connection_request_id, n.note]),
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
      return {
        request: r,
        other: profileById.get(otherId),
        note: noteByRequestId.get(r.id) ?? "",
      };
    });

  return { incoming, outgoing, accepted };
});
