"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSessionUser, type WidgetSettings } from "@/lib/dal";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateWidgetSettings(settings: WidgetSettings) {
  const user = await requireSessionUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ widget_settings: settings })
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
}
