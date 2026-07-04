import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MarkDoneButton, ReassignSelect } from "@/components/family/TaskActions";
import { formatRelativeDate, formatTime } from "@/lib/format";
import type { TaskKind, TaskStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<TaskKind, string> = {
  visit:       "🚶 Visit",
  shopping:    "🛒 Shopping",
  transport:   "🚗 Transport",
  appointment: "📅 Appointment",
  other:       "✦ Task",
};

const STATUS_TONE: Record<TaskStatus, "sage" | "sky" | "neutral"> = {
  open: "neutral",
  claimed: "sky",
  done: "sage",
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
    <main className="flex-1 pb-16 anim-fade-in">
      <header className="hdr-sage px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <Link href="/family/tasks" className="inline-block text-xs font-bold text-white/85 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full mb-3">
            ← Back
          </Link>
          <div className="text-[11px] font-extrabold text-white/80 uppercase tracking-wide">
            {task.assignee?.preferred_name ? `For ${task.assignee.preferred_name}` : "Unclaimed"}
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">{task.title}</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-5 space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Badge tone="sage">{TYPE_LABEL[task.task_type]}</Badge>
          <Badge tone={STATUS_TONE[task.status]}>{task.status}</Badge>
        </div>

        {task.due_date && (
          <Card className="text-center">
            <div className="text-[10px] font-extrabold text-text-mid uppercase tracking-wide mb-1">Due</div>
            <div className="font-extrabold text-text-dark">
              {formatRelativeDate(task.due_date)}
              {task.due_time ? ` · ${formatTime(task.due_time)}` : ""}
            </div>
          </Card>
        )}

        {task.description && (
          <Card>
            <div className="text-[10px] font-extrabold text-text-mid uppercase tracking-wide mb-1">Notes</div>
            <p className="text-sm text-text-dark whitespace-pre-wrap leading-relaxed">{task.description}</p>
          </Card>
        )}

        <Card className="space-y-3">
          <div className="text-sm font-extrabold text-text-dark">Assigned to</div>
          <ReassignSelect
            taskId={task.id}
            members={(members ?? []).map((m) => ({ id: m.id, preferred_name: m.preferred_name }))}
            currentId={task.assigned_to}
          />
        </Card>

        {task.status !== "done" && (
          <Card accent="sage" className="space-y-3 mt-6">
            <div className="text-sm font-extrabold text-text-dark">When the task is finished</div>
            <p className="text-xs text-text-mid">
              Marks this task complete and removes it from the active list.
            </p>
            <MarkDoneButton taskId={task.id} />
          </Card>
        )}
      </div>
    </main>
  );
}
