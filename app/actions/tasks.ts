"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole, requireSession } from "@/lib/auth-helpers";
import { syncSourceToCalendars } from "@/lib/calendar/push";
import type { TaskKind, TaskPriority, TaskVisibility } from "@/lib/supabase/types";

const VALID_TYPES: TaskKind[] = ["visit", "shopping", "transport", "appointment", "other"];
const VALID_VISIBILITY: TaskVisibility[] = ["everyone", "family_only", "private"];
const VALID_PRIORITY: TaskPriority[] = ["low", "medium", "high"];

function revalidateTaskPaths(taskId?: string) {
  revalidatePath("/family/tasks");
  if (taskId) revalidatePath(`/family/tasks/${taskId}`);
  revalidatePath("/family");
  revalidatePath("/dad");
  revalidatePath("/extended");
  revalidatePath("/mum/tasks");
  revalidatePath("/mum");
}

// Create a task — primary_carer + family. A task can be assigned to
// more than one person; the "assigned_to" form field may repeat.
export async function createTask(formData: FormData) {
  const ctx = await requireRole("primary_carer", "family");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const task_type = String(formData.get("task_type") ?? "") as TaskKind;
  const due_date = String(formData.get("due_date") ?? "").trim() || null;
  const due_time = String(formData.get("due_time") ?? "").trim() || null;
  const assigneeIds = [...new Set(formData.getAll("assigned_to").map(String).filter(Boolean))];
  const visibility = (String(formData.get("visibility") ?? "family_only") || "family_only") as TaskVisibility;
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;
  const appointment_id = String(formData.get("appointment_id") ?? "").trim() || null;
  const push_to_calendar = formData.get("push_to_calendar") === "on";

  if (!title) throw new Error("Title is required.");
  if (!VALID_TYPES.includes(task_type)) throw new Error("Invalid task type.");
  if (!VALID_VISIBILITY.includes(visibility)) throw new Error("Invalid visibility.");
  if (!VALID_PRIORITY.includes(priority)) throw new Error("Invalid priority.");

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title, description, task_type, due_date, due_time,
      visibility, priority, appointment_id, push_to_calendar,
      created_by: ctx.userId,
      status: assigneeIds.length > 0 ? "claimed" : "open",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not create task: ${error?.message}`);

  if (assigneeIds.length > 0) {
    const { error: assigneeError } = await supabase
      .from("task_assignees")
      .insert(assigneeIds.map((user_id) => ({ task_id: data.id, user_id })));
    if (assigneeError) throw new Error(`Task created but could not assign: ${assigneeError.message}`);
  }

  if (push_to_calendar) await syncSourceToCalendars("task", data.id, "create");

  revalidateTaskPaths();
  redirect("/family/tasks");
}

// Claim/join a task — family + extended. Additive: inserts the caller
// as an assignee without touching anyone already assigned, so claiming
// a task someone else is already on doesn't remove their assignment.
// Bumps status open -> claimed; a no-op if it's already claimed or done.
export async function claimTask(formData: FormData) {
  const ctx = await requireRole("family", "extended");
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) throw new Error("Missing task.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("task_assignees")
    .insert({ task_id: taskId, user_id: ctx.userId });
  if (error && error.code !== "23505") throw new Error(`Could not claim: ${error.message}`);

  const { error: statusError } = await supabase
    .from("tasks")
    .update({ status: "claimed" })
    .eq("id", taskId)
    .eq("status", "open");
  if (statusError) throw new Error(`Could not claim: ${statusError.message}`);

  revalidateTaskPaths(taskId);
}

// Toggle complete/incomplete. RLS scopes who can actually update the
// row: primary_carer/family can touch any task, extended only tasks
// they're an assignee of (task_assignees), patient not at all.
// "next" lets the task-detail page flip a done task back to claimed
// ("Mark as Incomplete"), matching the design's toggle affordance.
export async function markTaskDoneAction(formData: FormData) {
  await requireSession();
  const taskId = String(formData.get("task_id") ?? "");
  const next = String(formData.get("next") ?? "done") === "incomplete" ? "claimed" : "done";
  if (!taskId) throw new Error("Missing task.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("tasks").update({ status: next }).eq("id", taskId);
  if (error) throw new Error(`Could not update: ${error.message}`);

  revalidateTaskPaths(taskId);
}

// Take over a claimed task — sets attending_user_id to the caller without
// changing the assignee list, and posts a visible update announcing the
// handoff. Distinct from setTaskAssignees: this is a lightweight
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

  revalidateTaskPaths(taskId);
}

// Replaces the full "hide from" list for a task in one go — simpler
// than diffing add/remove given the UI is a small multi-select checkbox
// group, not an incremental picker.
export async function setTaskHiddenFrom(formData: FormData): Promise<void> {
  await requireRole("primary_carer", "family");
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) throw new Error("Missing task.");
  const userIds = formData.getAll("hidden_from").map(String).filter(Boolean);

  const supabase = await getSupabaseServerClient();
  const { error: deleteError } = await supabase.from("task_hidden_from").delete().eq("task_id", taskId);
  if (deleteError) throw new Error(`Could not update: ${deleteError.message}`);

  if (userIds.length > 0) {
    const { error: insertError } = await supabase
      .from("task_hidden_from")
      .insert(userIds.map((user_id) => ({ task_id: taskId, user_id })));
    if (insertError) throw new Error(`Could not update: ${insertError.message}`);
  }

  revalidatePath(`/family/tasks/${taskId}`);
  revalidatePath("/family/tasks");
}

// Toggle "send to my calendar" on an existing task. RLS scopes who can
// actually flip it, same as markTaskDoneAction.
export async function setTaskPushToCalendar(formData: FormData): Promise<void> {
  await requireSession();
  const taskId = String(formData.get("task_id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!taskId) throw new Error("Missing task.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("tasks").update({ push_to_calendar: enabled }).eq("id", taskId);
  if (error) throw new Error(`Could not update: ${error.message}`);

  await syncSourceToCalendars("task", taskId, enabled ? "create" : "delete");
  revalidatePath(`/family/tasks/${taskId}`);
}

// Replaces the full assignee list for a task in one go — primary_carer +
// family only. Multi-select, so "add self alongside others" is just
// checking one more box rather than a separate action; claimTask above
// covers the additive family/extended self-serve case.
export async function setTaskAssignees(formData: FormData): Promise<void> {
  await requireRole("primary_carer", "family");
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) throw new Error("Missing task.");
  const userIds = [...new Set(formData.getAll("assigned_to").map(String).filter(Boolean))];

  const supabase = await getSupabaseServerClient();
  const { error: deleteError } = await supabase.from("task_assignees").delete().eq("task_id", taskId);
  if (deleteError) throw new Error(`Could not update: ${deleteError.message}`);

  if (userIds.length > 0) {
    const { error: insertError } = await supabase
      .from("task_assignees")
      .insert(userIds.map((user_id) => ({ task_id: taskId, user_id })));
    if (insertError) throw new Error(`Could not update: ${insertError.message}`);
  }

  const { error: statusError } = await supabase
    .from("tasks")
    .update({ status: userIds.length > 0 ? "claimed" : "open" })
    .eq("id", taskId)
    .neq("status", "done");
  if (statusError) throw new Error(`Could not update: ${statusError.message}`);

  revalidateTaskPaths(taskId);
}
