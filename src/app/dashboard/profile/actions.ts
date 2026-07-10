"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSessionUser } from "@/lib/dal";

export type ActionState = { error: string | null };

async function getOwnProfileId(): Promise<string> {
  const user = await requireSessionUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Profile not found");
  return data.id;
}

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireSessionUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      name: formData.get("name"),
      bio: formData.get("bio"),
      website: formData.get("website"),
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateAvatarUrl(url: string) {
  const user = await requireSessionUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function addWorkSample(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const url = (formData.get("url") as string)?.trim();
  if (!url) return { error: "Upload an image first." };

  const supabase = await createClient();
  const profileId = await getOwnProfileId();

  const { count } = await supabase
    .from("work_samples")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);

  const { error } = await supabase
    .from("work_samples")
    .insert({ profile_id: profileId, url, sort_order: count ?? 0 });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}

export async function reorderWorkSamples(orderedIds: string[]) {
  const supabase = await createClient();
  const profileId = await getOwnProfileId();

  const { error } = (
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("work_samples")
          .update({ sort_order: index })
          .eq("id", id)
          .eq("profile_id", profileId),
      ),
    )
  ).find((r) => r.error) ?? { error: null };

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function removeWorkSample(id: string, url: string) {
  const supabase = await createClient();
  await getOwnProfileId();

  const { error } = await supabase.from("work_samples").delete().eq("id", id);
  if (error) throw error;

  const path = url.split("/storage/v1/object/public/work-samples/")[1];
  if (path) {
    await supabase.storage.from("work-samples").remove([path]);
  }

  revalidatePath("/dashboard");
}
