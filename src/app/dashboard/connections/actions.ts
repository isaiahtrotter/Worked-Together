"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/dal";
import { detectProfileFromLink } from "@/lib/detectProfileFromLink";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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
    // Placeholder profiles (added without an account) are private to
    // whoever added them — never searchable by anyone else.
    .not("user_id", "is", null)
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

export async function cancelConnectionRequest(requestId: string) {
  const me = await getOwnProfile();
  if (!me) throw new Error("Profile not found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("connection_requests")
    .delete()
    .eq("id", requestId)
    .eq("requester_id", me.id);
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

export async function saveEndorsement(toProfileId: string, text: string) {
  const me = await getOwnProfile();
  if (!me) throw new Error("Profile not found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("endorsements")
    .upsert(
      { from_profile_id: me.id, to_profile_id: toProfileId, text },
      { onConflict: "from_profile_id,to_profile_id" },
    );

  if (error) throw error;

  revalidatePath("/dashboard");
}

// Best-effort — re-hosts a detected profile photo into our own "avatars"
// bucket (same bucket/path convention as a real user's own avatar upload)
// rather than hotlinking the external image, so it doesn't break if the
// source site removes/changes it or blocks hotlinking later. Never throws;
// returns null on any failure and the placeholder just ends up with no
// avatar (same as any profile without a photo).
async function reuploadAvatarFromUrl(
  supabase: SupabaseServerClient,
  imageUrl: string,
  placeholderId: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : contentType.includes("jpeg") || contentType.includes("jpg")
            ? "jpg"
            : null;
    if (!ext) return null;

    const blob = await res.blob();
    if (blob.size > 3 * 1024 * 1024) return null;

    const path = `${placeholderId}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType });
    if (error) return null;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${publicUrl}?t=${Date.now()}`;
  } catch {
    return null;
  }
}

export async function addPlaceholderConnection({
  link,
}: {
  link: string;
}): Promise<{ error: string | null }> {
  const trimmedLink = link.trim();
  if (!trimmedLink) return { error: "Link is required." };

  const me = await getOwnProfile();
  if (!me) return { error: "Profile not found." };

  const supabase = await createClient();
  const detected = await detectProfileFromLink(trimmedLink);
  if (!detected.name) {
    return { error: "Couldn't find a name at that link — try a different link." };
  }

  const { data: placeholder, error: insertError } = await supabase
    .from("profiles")
    .insert({
      name: detected.name,
      website: trimmedLink,
      user_id: null,
      placeholder_owner_id: me.id,
      embed_key: crypto.randomUUID(),
    })
    .select("id")
    .single();

  if (insertError || !placeholder) {
    return { error: insertError?.message ?? "Couldn't add connection." };
  }

  if (detected.imageUrl) {
    const avatarUrl = await reuploadAvatarFromUrl(supabase, detected.imageUrl, placeholder.id);
    if (avatarUrl) {
      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", placeholder.id);
    }
  }

  const { error: requestError } = await supabase.from("connection_requests").insert({
    requester_id: me.id,
    recipient_id: placeholder.id,
    // Immediately accepted — there's no other side who could ever respond.
    status: "accepted",
  });
  if (requestError) return { error: requestError.message };

  revalidatePath("/dashboard");
  return { error: null };
}

export async function dismissMergeSuggestion(placeholderId: string, targetProfileId: string) {
  const me = await getOwnProfile();
  if (!me) throw new Error("Profile not found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ merge_dismissed_target_id: targetProfileId })
    .eq("id", placeholderId)
    .eq("placeholder_owner_id", me.id);
  if (error) throw error;

  revalidatePath("/dashboard");
}

// Merges a placeholder profile into a real one — always available, not just
// for the auto-detected suggestion (the owner can pick any real profile).
// Repoints the existing connection_requests row in place (rather than
// creating a new one) so connection_notes, which key off
// connection_request_id, keep working with no migration of their own.
// Endorsements reference profile ids directly, so those get reassigned.
export async function mergeProfiles(
  placeholderId: string,
  targetProfileId: string,
): Promise<{ error: string | null }> {
  const me = await getOwnProfile();
  if (!me) return { error: "Profile not found." };

  const supabase = await createClient();

  const [{ data: placeholder, error: placeholderError }, { data: target, error: targetError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, placeholder_owner_id")
        .eq("id", placeholderId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("id, user_id")
        .eq("id", targetProfileId)
        .maybeSingle(),
    ]);

  if (placeholderError) return { error: placeholderError.message };
  if (targetError) return { error: targetError.message };
  if (!placeholder || placeholder.user_id || placeholder.placeholder_owner_id !== me.id) {
    return { error: "That connection can't be merged." };
  }
  if (!target || !target.user_id) {
    return { error: "That profile isn't a real account yet." };
  }

  const { data: placeholderRequest, error: prError } = await supabase
    .from("connection_requests")
    .select("id")
    .eq("requester_id", me.id)
    .eq("recipient_id", placeholderId)
    .maybeSingle();
  if (prError) return { error: prError.message };

  if (placeholderRequest) {
    const { data: existingReal } = await supabase
      .from("connection_requests")
      .select("id")
      .or(
        `and(requester_id.eq.${me.id},recipient_id.eq.${targetProfileId}),and(requester_id.eq.${targetProfileId},recipient_id.eq.${me.id})`,
      )
      .maybeSingle();

    if (existingReal) {
      // Already connected for real — nothing to repoint, just drop the
      // placeholder's own connection artifacts.
      await supabase.from("connection_notes").delete().eq("connection_request_id", placeholderRequest.id);
      await supabase.from("connection_requests").delete().eq("id", placeholderRequest.id);
    } else {
      const { error: repointError } = await supabase
        .from("connection_requests")
        .update({ recipient_id: targetProfileId })
        .eq("id", placeholderRequest.id);
      if (repointError) return { error: repointError.message };
    }
  }

  await supabase
    .from("endorsements")
    .update({ to_profile_id: targetProfileId })
    .eq("to_profile_id", placeholderId);
  // Defensive — a placeholder can never actually write an endorsement since
  // it can't log in, but cheap to cover if that ever changes.
  await supabase
    .from("endorsements")
    .update({ from_profile_id: targetProfileId })
    .eq("from_profile_id", placeholderId);

  const { error: deleteError } = await supabase.from("profiles").delete().eq("id", placeholderId);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/dashboard");
  return { error: null };
}

// Permanently removes a placeholder profile — no real account to merge into,
// just delete it and everything attached to it (the connection, any note,
// any endorsement, its avatar file). Only the owner can do this.
export async function deletePlaceholderConnection(
  placeholderId: string,
): Promise<{ error: string | null }> {
  const me = await getOwnProfile();
  if (!me) return { error: "Profile not found." };

  const supabase = await createClient();

  const { data: placeholder, error: placeholderError } = await supabase
    .from("profiles")
    .select("id, user_id, placeholder_owner_id, avatar_url")
    .eq("id", placeholderId)
    .maybeSingle();
  if (placeholderError) return { error: placeholderError.message };
  if (!placeholder || placeholder.user_id || placeholder.placeholder_owner_id !== me.id) {
    return { error: "That connection can't be deleted." };
  }

  const { data: placeholderRequest } = await supabase
    .from("connection_requests")
    .select("id")
    .eq("requester_id", me.id)
    .eq("recipient_id", placeholderId)
    .maybeSingle();

  if (placeholderRequest) {
    await supabase.from("connection_notes").delete().eq("connection_request_id", placeholderRequest.id);
    await supabase.from("connection_requests").delete().eq("id", placeholderRequest.id);
  }

  await supabase.from("endorsements").delete().eq("to_profile_id", placeholderId);
  await supabase.from("endorsements").delete().eq("from_profile_id", placeholderId);

  if (placeholder.avatar_url) {
    const path = placeholder.avatar_url.split("/storage/v1/object/public/avatars/")[1]?.split("?")[0];
    if (path) await supabase.storage.from("avatars").remove([path]);
  }

  const { error: deleteError } = await supabase.from("profiles").delete().eq("id", placeholderId);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/dashboard");
  return { error: null };
}
