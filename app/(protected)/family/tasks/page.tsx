import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { TaskCard } from "@/components/shared/TaskCard";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/cx";

export const dynamic = "force-dynamic";

type Filter = "all" | "week" | "unclaimed" | "mine";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "week",      label: "This week" },
  { key: "unclaimed", label: "Unclaimed" },
  { key: "mine",      label: "Mine" },
];

export default async function FamilyTasks({
  searchParams,
}: {
  searchParams: Promise<{ filter?: Filter }>;
}) {
  const { filter = "all" } = await searchParams;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const today = isoLocalDate(new Date());
  const weekOut = isoLocalDate(addDays(new Date(), 7));

  let query = admin
    .from("tasks")
    .select(`
      id, title, task_type, due_date, due_time, status, assigned_to,
      assignee:profiles!tasks_assigned_to_fkey ( preferred_name, avatar_url )
    `)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filter === "week") {
    query = query.gte("due_date", today).lte("due_date", weekOut);
  } else if (filter === "unclaimed") {
    query = query.is("assigned_to", null);
  } else if (filter === "mine") {
    query = query.eq("assigned_to", user.id);
  }

  const { data: tasks } = await query;

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold text-text-dark">Tasks</h1>
          <Link href="/family/tasks/new">
            <Button variant="primary">+ New</Button>
          </Link>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Filter">
          {FILTERS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/family/tasks${key === "all" ? "" : `?filter=${key}`}`}
              className={clsx(
                "rounded-full px-3 py-1.5 text-sm border",
                filter === key
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-text-mid border-line hover:text-text-dark",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="space-y-2">
          {(tasks?.length ?? 0) === 0 ? (
            <p className="text-sm text-text-mid">No tasks here — try another filter.</p>
          ) : (
            tasks!.map((t) => (
              <Link key={t.id} href={`/family/tasks/${t.id}`} className="block">
                <TaskCard
                  title={t.title}
                  taskType={t.task_type}
                  dueDate={t.due_date}
                  dueTime={t.due_time}
                  status={t.status}
                  assigneeName={t.assignee?.preferred_name ?? null}
                  assigneeAvatarUrl={t.assignee?.avatar_url}
                />
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function isoLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
