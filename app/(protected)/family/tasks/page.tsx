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

  const SELECT = `
    id, title, task_type, due_date, due_time, status, assigned_to,
    assignee:profiles!tasks_assigned_to_fkey ( preferred_name ),
    creator:profiles!tasks_created_by_fkey ( preferred_name )
  `;

  let activeQuery = admin
    .from("tasks")
    .select(SELECT)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filter === "week") {
    activeQuery = activeQuery.gte("due_date", today).lte("due_date", weekOut);
  } else if (filter === "unclaimed") {
    activeQuery = activeQuery.is("assigned_to", null);
  } else if (filter === "mine") {
    activeQuery = activeQuery.eq("assigned_to", user.id);
  }

  const showRecentlyDone = filter === "all";
  const recentlyDoneQuery = showRecentlyDone
    ? admin.from("tasks").select(SELECT)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(5)
    : null;

  const [{ data: tasks }, recentlyDone] = await Promise.all([
    activeQuery,
    recentlyDoneQuery
      ? recentlyDoneQuery.then((r) => r.data)
      : Promise.resolve(null),
  ]);

  return (
    <main className="flex-1 pb-24 anim-fade-in">
      <header className="hdr-sage px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Family Tasks</h1>
            <p className="text-sm text-white/85 mt-1">
              {(tasks?.length ?? 0)} remaining
            </p>
          </div>
          <Link href="/family/tasks/new">
            <Button variant="lavender" size="sm">+ New</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        <nav className="flex flex-wrap gap-2" aria-label="Filter">
          {FILTERS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/family/tasks${key === "all" ? "" : `?filter=${key}`}`}
              className={clsx(
                "rounded-full px-4 py-1.5 text-xs font-extrabold",
                filter === key
                  ? "cta-sage text-white"
                  : "bg-white text-text-mid",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="space-y-2">
          {(tasks?.length ?? 0) === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-text-mid">No tasks here — try another filter.</p>
            </div>
          ) : (
            tasks!.map((t) => (
              <Link key={t.id} href={`/family/tasks/${t.id}`} className="block">
                <TaskCard
                  title={t.title}
                  taskType={t.task_type}
                  dueDate={t.due_date}
                  dueTime={t.due_time}
                  status={t.status}
                  assignedFor={t.assignee?.preferred_name ?? (t.assigned_to ? null : "Unclaimed")}
                  assignedFrom={t.creator?.preferred_name}
                />
              </Link>
            ))
          )}
        </div>

        {showRecentlyDone && (recentlyDone?.length ?? 0) > 0 && (
          <section className="space-y-2 pt-4 border-t border-line/50">
            <h2 className="text-xs font-extrabold text-text-mid uppercase tracking-wide px-2">
              Recently done
            </h2>
            <div className="space-y-2 opacity-70">
              {recentlyDone!.map((t) => (
                <Link key={t.id} href={`/family/tasks/${t.id}`} className="block">
                  <TaskCard
                    title={t.title}
                    taskType={t.task_type}
                    dueDate={t.due_date}
                    dueTime={t.due_time}
                    status={t.status}
                    assignedFor={t.assignee?.preferred_name}
                    assignedFrom={t.creator?.preferred_name}
                  />
                </Link>
              ))}
            </div>
          </section>
        )}
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
