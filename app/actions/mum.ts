"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

async function requirePatient(): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // Use service role to read role — patient can read own profile, so this
  // could use the user session, but service role keeps the check uniform.
  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "patient") throw new Error("Not allowed.");
  return user.id;
}

// Log that Mum has taken a medication. RLS lets the patient INSERT only
// where logged_by = auth.uid(); we go through the user-session client so
// the row is owned by Mum, not the service principal.
export async function logMedicationByMum(medicationId: string): Promise<void> {
  const userId = await requirePatient();
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("medication_logs")
    .insert({ medication_id: medicationId, logged_by: userId });

  if (error) throw new Error(`Could not log medication: ${error.message}`);
  revalidatePath("/mum");
}
