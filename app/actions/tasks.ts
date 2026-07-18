"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole, requireSession } from "@/lib/auth-helpers";
import type { TaskKind, TaskPriority, TaskVisibility } from "@/lib/supabase/types";

const VALID_TYPES: TaskKind[] = ["visit", "shopping", "transport", "appointment", "other"];
const VALID_VISIBILITY: TaskVisibility[] = ["everyone", "family_only", "private"];
const VALID_PRIORITY: TaskPriority[] = ["low", "medium", "high"];

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
  const visibility = (String(formData.get("visibility") ?? "family_only") || "family_only") as TaskVisibility;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const appointment_id = String(formData.get("appointment_id") ?? "").trim() || null;

  if (!title) throw new Error("Title is required.");
  if (!VALID_TYPES.includes(task_type)) throw new Error("Invalid task type.");
  if (!VALID_VISIBILITY.includes(visibility)) throw new Error("Invalid visibility.");
  if (!VALID_PRIORITY.includes(priority)) throw new Error("Invalid priority.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("tasks").insert({
    title, description, task_type, due_date, due_time,
    assigned_to, visibility, priority, appointment_id,
    created_by: ctx.userId,
    status: assigned_to ? "claimed" : "open",
  });
  if (error) throw new Error(`Could not create task: ${error.message}`);

  revalidatePath("/family/tasks");
  revalidatePath("/family");
  revalidatePath("/dad");
  revalidatePath("/extended");
  revalidatePath("/mum/tasks");
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

// Toggle complete/incomplete — assignee or a privileged role (primary_carer / family).
// "next" lets the task-detail page flip a done task back to claimed
// ("Mark as Incomplete"), matching the design's toggle affordance.
export async function markTaskDoneAction(formData: FormData) {
  const ctx = await requireSession();
  const taskId = String(formData.get("task_id") ?? "");
  const next = String(formData.get("next") ?? "done") === "incomplete" ? "claimed" : "done";
  if (!taskId) throw new Error("Missing task.");

  // primary_carer + family can mark any task done; others only when assigned to self.
  const supabase = await getSupabaseServerClient();
  let query = supabase.from("tasks").update({ status: next }).eq("id", taskId);
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

// Take over a claimed task — sets attending_user_id to the caller without
// changing assigned_to (the "owner of record"), and posts a visible update
// announcing the handoff. Distinct from reassignTask: this is a lightweight
// self-service "I've got this one" rather than an admin reassignment.
export async function takeOverTask(taskId: string): Promise<void> {
  const ctx = await requireRole("primary_carer", "family");

  const supabase = await getSupabaseServerClient();
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("title, visibility, attending_user_id, attending:profiles!tasks_attending_user_id_fkey(preferred_name)")
    .eq("id", taskId)
    .single();
  if (fetchError || !task) throw new Error("Task not found.");
  if (task.attending_user_id === ctx.userId) return;

  const fromName = task.attending?.preferred_name ?? "no one";
  const body = task.visibility === "everyone"
    ? `${ctx.preferredName} took over "${task.title}" from ${fromName}`
    : `${ctx.preferredName} took over a task from ${fromName}`;

  const [taskRes, updateRes] = await Promise.all([
    supabase.from("tasks").update({ attending_user_id: ctx.userId }).eq("id", taskId),
    supabase.from("updates").insert({ author_id: ctx.userId, body, is_flagged: false }),
  ]);
  if (taskRes.error) throw new Error(`Could not take over: ${taskRes.error.message}`);
  if (updateRes.error) throw new Error(`Took over but couldn't post update: ${updateRes.error.message}`);

  revalidatePath("/family/tasks");
  revalidatePath(`/family/tasks/${taskId}`);
  revalidatePath("/family");
  revalidatePath("/dad");
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
