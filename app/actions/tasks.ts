"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole, requireSession } from "@/lib/auth-helpers";
import type { TaskKind } from "@/lib/supabase/types";

const VALID_TYPES: TaskKind[] = ["visit", "shopping", "transport", "appointment", "other"];

// Create a task — primary_carer + family.
export async function createTask(formData: FormData) {
  const ctx = await requireRole("primary_carer", "family");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const task_type = String(formData.get("task_type") ?? "") as TaskKind;
  const due_date = String(formData.get("due_date") ?? "").trim() || null;
  const due_time = String(formData.get("due_time") ?? "").trim() || null;
  const assigned_to_raw = String(formData.get("assigned_to") ?? "").trim();
  const assigned_to = assigned_to_raw ? assigned_to_raw : null;

  if (!title) throw new Error("Title is required.");
  if (!VALID_TYPES.includes(task_type)) throw new Error("Invalid task type.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("tasks").insert({
    title, description, task_type, due_date, due_time,
    assigned_to,
    created_by: ctx.userId,
    status: assigned_to ? "claimed" : "open",
  });
  if (error) throw new Error(`Could not create task: ${error.message}`);

  revalidatePath("/family/tasks");
  revalidatePath("/family");
  revalidatePath("/dad");
  revalidatePath("/extended");
  redirect("/family/tasks");
}

// Claim an unclaimed task — extended + family.
// Extended is the canonical case; family can also claim for themselves.
export async function claimTask(formData: FormData) {
  const ctx = await requireRole("family", "extended");
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) throw new Error("Missing task.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assigned_to: ctx.userId, status: "claimed" })
    .eq("id", taskId)
    .is("assigned_to", null);
  if (error) throw new Error(`Could not claim: ${error.message}`);

  revalidatePath("/family/tasks");
  revalidatePath("/family");
  revalidatePath("/extended");
}

// Mark complete — assignee or a privileged role (primary_carer / family).
export async function markTaskDoneAction(formData: FormData) {
  const ctx = await requireSession();
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) throw new Error("Missing task.");

  // primary_carer + family can mark any task done; others only when assigned to self.
  const supabase = await getSupabaseServerClient();
  let query = supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
  if (ctx.role !== "primary_carer" && ctx.role !== "family") {
    query = query.eq("assigned_to", ctx.userId);
  }
  const { error } = await query;
  if (error) throw new Error(`Could not update: ${error.message}`);

  revalidatePath("/family/tasks");
  revalidatePath("/family");
  revalidatePath("/dad");
  revalidatePath("/mum");
  revalidatePath("/extended");
}

// Reassign — primary_carer + family. Redirects back to /family/tasks after
// save, since updating assignment is usually a "save and back out" interaction.
export async function reassignTask(formData: FormData) {
  await requireRole("primary_carer", "family");
  const taskId = String(formData.get("task_id") ?? "");
  const assigned_to_raw = String(formData.get("assigned_to") ?? "").trim();
  const assigned_to = assigned_to_raw ? assigned_to_raw : null;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({ assigned_to, status: assigned_to ? "claimed" : "open" })
    .eq("id", taskId);
  if (error) throw new Error(`Could not reassign: ${error.message}`);

  revalidatePath("/family/tasks");
  revalidatePath("/family");
  revalidatePath("/dad");
  revalidatePath("/extended");
  redirect("/family/tasks");
}
