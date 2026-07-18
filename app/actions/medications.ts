"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import { syncSourceToCalendars } from "@/lib/calendar/push";

function parseReminderTimes(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => /^\d{2}:\d{2}$/.test(t));
}

function revalidateMedicationPaths() {
  revalidatePath("/mum/medical/medications");
  revalidatePath("/family/medical/medications");
  revalidatePath("/mum");
  revalidatePath("/dad");
}

export async function createMedication(formData: FormData): Promise<void> {
  await requireRole("patient", "primary_carer");

  const name = String(formData.get("name") ?? "").trim();
  const dosage = String(formData.get("dosage") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const prescriber = String(formData.get("prescriber") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const reminder_times = parseReminderTimes(String(formData.get("reminder_times") ?? ""));

  if (!name || !dosage || !frequency) throw new Error("Name, dosage, and frequency are required.");

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("medications")
    .insert({ name, dosage, frequency, prescriber, notes, reminder_times })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not add medication: ${error?.message}`);

  if (reminder_times.length > 0) {
    await syncSourceToCalendars("medication", data.id, "create");
  }

  revalidateMedicationPaths();
}

export async function updateMedication(formData: FormData): Promise<void> {
  await requireRole("patient", "primary_carer");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dosage = String(formData.get("dosage") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const prescriber = String(formData.get("prescriber") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const reminder_times = parseReminderTimes(String(formData.get("reminder_times") ?? ""));

  if (!id) throw new Error("Missing medication.");
  if (!name || !dosage || !frequency) throw new Error("Name, dosage, and frequency are required.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("medications")
    .update({ name, dosage, frequency, prescriber, notes, reminder_times })
    .eq("id", id);
  if (error) throw new Error(`Could not update medication: ${error.message}`);

  await syncSourceToCalendars("medication", id, reminder_times.length > 0 ? "update" : "delete");
  revalidateMedicationPaths();
}

export async function deactivateMedication(formData: FormData): Promise<void> {
  await requireRole("patient", "primary_carer");

  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!id) throw new Error("Missing medication.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("medications").update({ is_active: next }).eq("id", id);
  if (error) throw new Error(`Could not update medication: ${error.message}`);

  if (!next) await syncSourceToCalendars("medication", id, "delete");
  revalidateMedicationPaths();
}
