import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MarkDoneButton, ReassignSelect } from "@/components/family/TaskActions";
import { formatRelativeDate, formatTime } from "@/lib/format";
import type { TaskKind } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<TaskKind, string> = {
  visit:       "🚶 Visit",
  shopping:    "🛒 Shopping",
  transport:   "🚗 Transport",
  appointment: "📅 Appointment",
  other:       "✦ Task",
};

export default async function TaskDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getSupabaseServiceClient();

  const [{ data: task }, { data: members }] = await Promise.all([
    admin.from("tasks").select(`
        id, title, description, task_type, due_date, due_time, status, assigned_to,
        assignee:profiles!tasks_assigned_to_fkey ( id, preferred_name )
      `).eq("id", id).single(),
    admin.from("profiles").select("id, preferred_name").order("preferred_name", { ascending: true }),
  ]);

  if (!task) notFound();

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <Link href="/family/tasks" className="text-sm text-primary">← Back</Link>
        </header>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge>{TYPE_LABEL[task.task_type]}</Badge>
            <Badge tone={task.status === "done" ? "success" : task.status === "claimed" ? "primary" : "neutral"}>
              {task.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold text-text-dark">{task.title}</h1>
          {task.due_date && (
            <p className="text-text-mid">
              {formatRelativeDate(task.due_date)}
              {task.due_time ? ` · ${formatTime(task.due_time)}` : ""}
            </p>
          )}
        </div>

        {task.description && (
          <Card>
            <p className="text-text-dark whitespace-pre-wrap">{task.description}</p>
          </Card>
        )}

        <Card className="space-y-3">
          <div className="text-sm font-medium text-text-dark">Assigned to</div>
          <ReassignSelect
            taskId={task.id}
            members={(members ?? []).map((m) => ({ id: m.id, preferred_name: m.preferred_name }))}
            currentId={task.assigned_to}
          />
        </Card>

        {task.status !== "done" && (
          <div className="pt-2">
            <MarkDoneButton taskId={task.id} />
          </div>
        )}
      </div>
    </main>
  );
}
