"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSessionUser, type WidgetSettings } from "@/lib/dal";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Cascades through everything owned by or attached to this account (see
// delete_own_account in supabase/policies-reference.sql, section 13) so no
// connection, note, or endorsement lingers for anyone who was connected to
// them, then signs out. Also deletes the underlying auth.users row via the
// admin API, but only if SUPABASE_SERVICE_ROLE_KEY is configured -- see
// src/lib/supabase/admin.ts.
//
// Returns { error } rather than throwing -- Next.js redacts any error thrown
// across a Server Action boundary in production ("An error occurred in the
// Server Components render...", no message, just a digest), even one
// constructed with a deliberately friendly message. Returning it as data is
// the only way the caller's toast actually shows something useful instead of
// that generic string.
//
// Deliberately doesn't call redirect() here -- this is invoked imperatively
// from a client component's confirm dialog (not a <form action>), and a
// server action's redirect() thrown mid-promise-chain would just get
// swallowed by the caller's own .catch(). The caller navigates itself once
// this resolves.
function avatarStoragePath(avatarUrl: string | null): string | null {
  return avatarUrl?.split("/storage/v1/object/public/avatars/")[1]?.split("?")[0] ?? null;
}

export async function deleteAccount(): Promise<{ error: string | null }> {
  const user = await requireSessionUser();
  const supabase = await createClient();

  const { data: me, error: meError } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (meError) return { error: `Couldn't delete account: ${meError.message}` };
  if (!me) return { error: "No profile found for this account." };

  const { data: placeholders, error: placeholdersError } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("placeholder_owner_id", me.id);
  if (placeholdersError) {
    return { error: `Couldn't delete account: ${placeholdersError.message}` };
  }

  // Storage has to be cleaned up through its own API, not SQL -- Supabase
  // runs a protective trigger that blocks direct DELETEs against
  // storage.objects ("Direct deletion from storage tables is not allowed.
  // Use the Storage API instead."), since that would drop the metadata row
  // without removing the actual file from the object store. This has to
  // happen before delete_own_account() below, while these rows (and the
  // avatar_url/paths they point to) still exist to look up. Best-effort --
  // a failed removal here shouldn't block the rest of account deletion,
  // since the row that referenced it is about to be gone either way.
  const avatarPaths = [me, ...(placeholders ?? [])]
    .map((p) => avatarStoragePath(p.avatar_url))
    .filter((p): p is string => !!p);
  if (avatarPaths.length > 0) {
    await supabase.storage.from("avatars").remove(avatarPaths);
  }
  const { data: workSampleFiles } = await supabase.storage.from("work-samples").list(me.id);
  if (workSampleFiles && workSampleFiles.length > 0) {
    await supabase.storage.from("work-samples").remove(workSampleFiles.map((f) => `${me.id}/${f.name}`));
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    // Surface Postgres/PostgREST's own message+hint rather than a canned
    // guess -- a stale PostgREST schema cache (common right after creating a
    // function via the SQL editor -- see supabase/policies-reference.sql,
    // section 13), a permissions issue, and the function genuinely missing
    // all report as "error" here but need different fixes, and error.hint
    // usually says which.
    return {
      error: `Couldn't delete account: ${error.message}${error.hint ? ` — ${error.hint}` : ""}`,
    };
  }

  try {
    const admin = createAdminClient();
    if (admin) {
      await admin.auth.admin.deleteUser(user.id);
    }
    await supabase.auth.signOut();
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Account data was deleted, but signing out failed — try refreshing.",
    };
  }

  return { error: null };
}

export async function updateWidgetSettings(settings: WidgetSettings) {
  const user = await requireSessionUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ widget_settings: settings })
    .eq("user_id", user.id)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    // RLS silently filters out updates it doesn't allow rather than
    // erroring — 0 rows affected means the update policy (or the
    // widget_settings column) is missing in Supabase, not a client bug.
    throw new Error(
      "Nothing was saved — the profiles table may be missing its update policy or the widget_settings column. See supabase/policies-reference.sql.",
    );
  }
  revalidatePath("/dashboard");
}
