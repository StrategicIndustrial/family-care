"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";

// Generic update post — primary_carer + family.
export async function postUpdate(body: string, flagged: boolean): Promise<void> {
  const ctx = await requireRole("primary_carer", "family");
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Update is empty.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("updates")
    .insert({ author_id: ctx.userId, body: trimmed, is_flagged: flagged });
  if (error) throw new Error(`Could not post update: ${error.message}`);

  revalidatePath("/family");
  revalidatePath("/family/updates");
  revalidatePath("/dad");
  revalidatePath("/extended");
}
