"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import { syncAppointmentToCalendars } from "@/lib/calendar/push";
import type { ApptType } from "@/lib/supabase/types";

const VALID_APPT_TYPES: ApptType[] = ["gp", "specialist", "scan_test", "other"];

export async function createAppointment(formData: FormData) {
  const ctx = await requireRole("primary_carer", "family");

  const title = String(formData.get("title") ?? "").trim();
  const appointment_date = String(formData.get("appointment_date") ?? "").trim();
  const appointment_time = String(formData.get("appointment_time") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const specialist = String(formData.get("specialist") ?? "").trim() || null;
  const notes_before = String(formData.get("notes_before") ?? "").trim() || null;
  const appt_type_raw = String(formData.get("appt_type") ?? "other") as ApptType;
  const appt_type = VALID_APPT_TYPES.includes(appt_type_raw) ? appt_type_raw : "other";

  if (!title) throw new Error("Title is required.");
  if (!appointment_date) throw new Error("Date is required.");

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      title, appointment_date, appointment_time,
      location, specialist, notes_before, appt_type,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not create appointment: ${error?.message}`);

  await syncAppointmentToCalendars(data.id, "create");

  revalidatePath("/family/appointments");
  redirect("/family/appointments");
}

// Edits the core fields — previously there was no way to fix a typo'd
// title/date/time/location after creation at all.
export async function updateAppointmentDetails(formData: FormData) {
  await requireRole("primary_carer", "family");

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const appointment_date = String(formData.get("appointment_date") ?? "").trim();
  const appointment_time = String(formData.get("appointment_time") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const specialist = String(formData.get("specialist") ?? "").trim() || null;
  const appt_type_raw = String(formData.get("appt_type") ?? "other") as ApptType;
  const appt_type = VALID_APPT_TYPES.includes(appt_type_raw) ? appt_type_raw : "other";

  if (!id) throw new Error("Missing appointment.");
  if (!title) throw new Error("Title is required.");
  if (!appointment_date) throw new Error("Date is required.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .update({ title, appointment_date, appointment_time, location, specialist, appt_type })
    .eq("id", id);
  if (error) throw new Error(`Could not update appointment: ${error.message}`);

  await syncAppointmentToCalendars(id, "update");

  revalidatePath(`/family/appointments/${id}`);
  revalidatePath("/family/appointments");
}

export async function deleteAppointment(formData: FormData) {
  await requireRole("primary_carer", "family");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing appointment.");

  // Sync first, while the row (and any pushed-calendar mappings) still
  // exist, so each connected calendar's event actually gets removed
  // rather than orphaned.
  await syncAppointmentToCalendars(id, "delete");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw new Error(`Could not delete appointment: ${error.message}`);

  revalidatePath("/family/appointments");
  redirect("/family/appointments");
}

// Open notes — visible to everyone including Leanne.
export async function updateAppointmentNotes(formData: FormData) {
  await requireRole("primary_carer", "family");

  const id = String(formData.get("id") ?? "");
  const notes_before = String(formData.get("notes_before") ?? "");
  const notes_after = String(formData.get("notes_after") ?? "");

  if (!id) throw new Error("Missing appointment.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .update({
      notes_before: notes_before.trim() || null,
      notes_after: notes_after.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error(`Could not save notes: ${error.message}`);

  await syncAppointmentToCalendars(id, "update");

  revalidatePath(`/family/appointments/${id}`);
  revalidatePath("/family/appointments");
}

// Family-only notes — hidden from the person in care. Kept as a distinct
// action (rather than folding into updateAppointmentNotes) so it can carry
// its own guard if that's ever needed — e.g. restricting who can view them,
// not just who can write them.
export async function updateAppointmentFamilyNotes(formData: FormData) {
  await requireRole("primary_carer", "family");

  const id = String(formData.get("id") ?? "");
  const family_notes_before = String(formData.get("family_notes_before") ?? "");
  const family_notes_after = String(formData.get("family_notes_after") ?? "");

  if (!id) throw new Error("Missing appointment.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("appointments")
    .update({
      family_notes_before: family_notes_before.trim() || null,
      family_notes_after: family_notes_after.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error(`Could not save notes: ${error.message}`);

  revalidatePath(`/family/appointments/${id}`);
  revalidatePath("/family/appointments");
}
