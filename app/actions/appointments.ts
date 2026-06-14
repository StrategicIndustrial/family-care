"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";

export async function createAppointment(formData: FormData) {
  const ctx = await requireRole("primary_carer", "family");

  const title = String(formData.get("title") ?? "").trim();
  const appointment_date = String(formData.get("appointment_date") ?? "").trim();
  const appointment_time = String(formData.get("appointment_time") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const specialist = String(formData.get("specialist") ?? "").trim() || null;
  const notes_before = String(formData.get("notes_before") ?? "").trim() || null;

  if (!title) throw new Error("Title is required.");
  if (!appointment_date) throw new Error("Date is required.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("appointments").insert({
    title, appointment_date, appointment_time,
    location, specialist, notes_before,
    created_by: ctx.userId,
  });
  if (error) throw new Error(`Could not create appointment: ${error.message}`);

  revalidatePath("/family/appointments");
  redirect("/family/appointments");
}

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

  revalidatePath(`/family/appointments/${id}`);
  revalidatePath("/family/appointments");
}
