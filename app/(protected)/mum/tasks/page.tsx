import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { formatRelativeDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MumTasks() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const { data: tasks } = await admin
    .from("tasks")
    .select("id, title, due_date, due_time, status, visibility")
    .eq("assigned_to", user.id)
    .neq("visibility", "private")
    .neq("visibility", "family_only")
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false });

  return (
    <main className="flex-1 bg-warm-bg pb-16 anim-fade-in">
      <header className="hdr-peach-soft px-6 pt-12 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Link
            href="/mum"
            className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center shrink-0"
            aria-label="Back"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M8 2L2 8l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold text-white">My Tasks</h1>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-2.5">
        {(tasks?.length ?? 0) === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <p className="text-base text-text-mid">Nothing on your to-do list 🎉</p>
          </div>
        ) : (
          tasks!.map((t) => (
            <MumTaskRow
              key={t.id}
              id={t.id}
              title={t.title}
              dueDate={t.due_date}
              dueTime={t.due_time}
            />
          ))
        )}
      </div>
    </main>
  );
}

function MumTaskRow({
  id, title, dueDate, dueTime,
}: {
  id: string;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="w-[28px] h-[28px] rounded-full border-2 border-sage-100 bg-white shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-extrabold text-text-dark">{title}</div>
        {dueDate && (
          <div className="text-xs text-text-mid">
            {formatRelativeDate(dueDate)}
            {dueTime ? ` · ${formatTime(dueTime)}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
