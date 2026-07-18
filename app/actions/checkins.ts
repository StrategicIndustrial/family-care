"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import type { Mood } from "@/lib/supabase/types";
import type { CheckinPeriod } from "@/lib/checkin-window";

export async function submitCheckin(mood: Mood, period: CheckinPeriod, note?: string): Promise<void> {
  const ctx = await requireRole("patient", "primary_carer");
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("checkins")
    .insert({ user_id: ctx.userId, mood, period, note: note?.trim() || null });

  if (error) throw new Error(`Could not save check-in: ${error.message}`);
  revalidatePath("/mum");
  revalidatePath("/dad");
  revalidatePath("/family/chronicle");
}
