"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth-helpers";

// Lets any authenticated user update their preferred_name and phone.
// RLS policy on profiles already restricts UPDATE to id = auth.uid().
export async function updateOwnProfile(formData: FormData) {
  const ctx = await requireSession();

  const preferred_name = String(formData.get("preferred_name") ?? "").trim();
  const phone_raw = String(formData.get("phone") ?? "").trim();
  const phone = phone_raw === "" ? null : phone_raw;

  if (!preferred_name) throw new Error("Preferred name is required.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ preferred_name, phone })
    .eq("id", ctx.userId);
  if (error) throw new Error(`Could not save profile: ${error.message}`);

  revalidatePath("/family/profile");
  revalidatePath("/family");
}
