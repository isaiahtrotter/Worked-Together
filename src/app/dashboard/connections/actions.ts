"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/dal";

export type SearchStatus = "not_connected" | "pending_outgoing" | "pending_incoming" | "connected";

export type SearchResult = {
  id: string;
  name: string;
  avatar_url: string | null;
  status: SearchStatus;
};

export async function searchProfilesByName(
  query: string,
): Promise<{ results: SearchResult[]; error: string | null }> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return { results: [], error: null };

  const me = await getOwnProfile();
  if (!me) return { results: [], error: "Profile not found." };

  const supabase = await createClient();
  const { data: matches, error } = await supabase
    .from("profiles")
    .select("id, name, avatar_url")
    .ilike("name", `%${trimmed}%`)
    .neq("id", me.id)
    .limit(10);

  if (error) return { results: [], error: error.message };
  if (!matches?.length) return { results: [], error: null };

  const ids = matches.map((m) => m.id);
  const { data: existing, error: reqError } = await supabase
    .from("connection_requests")
    .select("requester_id, recipient_id, status")
    .or(
      `and(requester_id.eq.${me.id},recipient_id.in.(${ids.join(",")})),and(recipient_id.eq.${me.id},requester_id.in.(${ids.join(",")}))`,
    );

  if (reqError) return { results: [], error: reqError.message };

  const results: SearchResult[] = matches.map((m) => {
    const rel = existing?.find(
      (r) => r.requester_id === m.id || r.recipient_id === m.id,
    );
    let status: SearchStatus = "not_connected";
    if (rel) {
      if (rel.status === "accepted") status = "connected";
      else if (rel.requester_id === me.id) status = "pending_outgoing";
      else status = "pending_incoming";
    }
    return { id: m.id, name: m.name, avatar_url: m.avatar_url, status };
  });

  return { results, error: null };
}

export async function sendConnectionRequest(recipientId: string) {
  const me = await getOwnProfile();
  if (!me) throw new Error("Profile not found.");

  const supabase = await createClient();
  const { error } = await supabase.from("connection_requests").insert({
    requester_id: me.id,
    recipient_id: recipientId,
    status: "pending",
  });
  if (error) throw error;

  revalidatePath("/dashboard");
}

export async function respondToRequest(requestId: string, accept: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("connection_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", requestId);
  if (error) throw error;

  revalidatePath("/dashboard");
}

export async function saveConnectionNote(formData: FormData): Promise<void> {
  const requestId = formData.get("requestId") as string;
  const note = (formData.get("note") as string) ?? "";

  const me = await getOwnProfile();
  if (!me) throw new Error("Profile not found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("connection_notes")
    .upsert(
      { connection_request_id: requestId, profile_id: me.id, note },
      { onConflict: "connection_request_id,profile_id" },
    );

  if (error) throw error;

  revalidatePath("/dashboard");
}
