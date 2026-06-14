"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

async function requirePrimaryCarer(): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "primary_carer") throw new Error("Not allowed.");
  return user.id;
}

// Dad logs a medication on Mum's behalf.
export async function logMedicationByDad(medicationId: string): Promise<void> {
  const userId = await requirePrimaryCarer();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("medication_logs")
    .insert({ medication_id: medicationId, logged_by: userId });

  if (error) throw new Error(`Could not log medication: ${error.message}`);
  revalidatePath("/dad");
}

// Mark a task complete. RLS lets primary_carer update any task.
export async function markTaskDone(taskId: string): Promise<void> {
  await requirePrimaryCarer();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId);

  if (error) throw new Error(`Could not update task: ${error.message}`);
  revalidatePath("/dad");
}

// Post a family update from Dad's quick-flag composer.
export async function postFamilyUpdate(body: string, flagged: boolean): Promise<void> {
  const userId = await requirePrimaryCarer();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Update is empty.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("updates")
    .insert({ author_id: userId, body: trimmed, is_flagged: flagged });

  if (error) throw new Error(`Could not post update: ${error.message}`);
  revalidatePath("/dad");
}
