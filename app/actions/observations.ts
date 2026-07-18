"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import type { ObservationType } from "@/lib/supabase/types";

type Visibility = "everyone" | "family_only" | "private";

// Carer log entry — never visible to the patient role (enforced by RLS,
// not just UI: the observations table's SELECT policies never admit
// role = 'patient', matching the brief's "never visible to Leanne" mandate).
export async function createObservation(
  type: ObservationType,
  body: string,
  visibility: Visibility,
): Promise<void> {
  const ctx = await requireRole("primary_carer", "family");
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Observation is empty.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("observations").insert({
    type,
    body: trimmed,
    author_id: ctx.userId,
    visibility,
  });
  if (error) throw new Error(`Could not save observation: ${error.message}`);

  revalidatePath("/family/observations");
  revalidatePath("/family");
  revalidatePath("/dad");
}
