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

// Removes an already-accepted connection between two real accounts (either
// side can do this). Placeholder connections have their own dedicated
// deletePlaceholderConnection below, since that also has to clean up the
// placeholder profile row itself, not just the connection between it and
// its owner.
export async function removeConnection(requestId: string) {
  const me = await getOwnProfile();
  if (!me) throw new Error("Profile not found.");

  const supabase = await createClient();
  const { data: request, error: fetchError } = await supabase
    .from("connection_requests")
    .select("id, requester_id, recipient_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (
    !request ||
    request.status !== "accepted" ||
    (request.requester_id !== me.id && request.recipient_id !== me.id)
  ) {
    throw new Error("That connection can't be removed.");
  }

  await supabase.from("connection_notes").delete().eq("connection_request_id", requestId);
  const { error } = await supabase.from("connection_requests").delete().eq("id", requestId);
  if (error) throw error;

  revalidatePath("/dashboard");
}

export async function respondToRequest(requestId: string, accept: boolean) {
  const supabase = await createClient();

  if (accept) {
    // Runs as a SECURITY DEFINER function (see policies-reference.sql
    // section 12) because accepting a request that's carrying a pending
    // merge has to touch the placeholder owner's own rows, not just the
    // accepting user's.
    const { error } = await supabase.rpc("accept_connection_request", {
      request_id: requestId,
    });
    if (error) {
      // That function may not exist yet if section 12 hasn't been run
      // against the live database -- degrade to a plain accept rather than
      // failing outright. Any pending merge just won't finalize until then.
      const { error: fallbackError } = await supabase
        .from("connection_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);
      if (fallbackError) throw fallbackError;
    }
  } else {
    const { error } = await supabase
      .from("connection_requests")
      .update({ status: "declined" })
      .eq("id", requestId);
    if (error) throw error;
  }

  revalidatePath("/dashboard");
}

export async function saveConnectionNote(requestId: string, note: string): Promise<void> {
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

  // Clearing a recommendation back to nothing should remove the
  // relationship entirely -- upserting empty text instead would leave a
  // real row behind, which every reader (the widget's "Endorsed by" list,
  // the endorsesOwner badge) treats as "an endorsement exists," rendering
  // as a blank quote rather than showing no endorsement at all.
  if (!text.trim()) {
    const { error } = await supabase
      .from("endorsements")
      .delete()
      .eq("from_profile_id", me.id)
      .eq("to_profile_id", toProfileId);
    if (error) throw error;
    revalidatePath("/dashboard");
    return;
  }

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

// "Merge" doesn't merge instantly. It sends a normal connection invitation
// to the real account (same mechanism as sendConnectionRequest), flagged
// with merge_placeholder_id -- only once THEY accept it does the
// placeholder actually fold into their profile: endorsements reassigned,
// the placeholder deleted (see finalize_placeholder_merge /
// accept_connection_request in supabase/policies-reference.sql, section
// 12). The one case where there's nothing to ask permission for is if the
// two accounts are already connected for real, which finalizes right away.
export async function inviteMergeConnection(
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

  const { data: existingReal, error: existingError } = await supabase
    .from("connection_requests")
    .select("id, status")
    .or(
      `and(requester_id.eq.${me.id},recipient_id.eq.${targetProfileId}),and(requester_id.eq.${targetProfileId},recipient_id.eq.${me.id})`,
    )
    .maybeSingle();
  if (existingError) return { error: existingError.message };

  if (existingReal?.status === "accepted") {
    // Already connected for real -- nothing to wait on, fold it in now.
    const { error } = await supabase.rpc("finalize_placeholder_merge", {
      placeholder_id: placeholderId,
      target_id: targetProfileId,
    });
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { error: null };
  }

  if (existingReal) {
    // A request already exists between them for some other reason -- ride
    // along on it instead of sending a second, redundant one.
    const { error } = await supabase
      .from("connection_requests")
      .update({ merge_placeholder_id: placeholderId })
      .eq("id", existingReal.id);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { error: null };
  }

  const { error: insertError } = await supabase.from("connection_requests").insert({
    requester_id: me.id,
    recipient_id: targetProfileId,
    status: "pending",
    merge_placeholder_id: placeholderId,
  });
  if (insertError) return { error: insertError.message };

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
