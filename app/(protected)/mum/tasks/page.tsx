import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { formatShortDate, formatTime } from "@/lib/format";
import { clsx } from "@/lib/cx";

export const dynamic = "force-dynamic";

type View = "calendar" | "day";

export default async function MumTasks({
  searchParams,
}: {
  searchParams: Promise<{ view?: View; date?: string; month?: string }>;
}) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const { view = "calendar", date: dateParam, month: monthParam } = await searchParams;

  const today = isoLocalDate(new Date());

  if (view === "day") {
    const day = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
    const monthForBack = day.slice(0, 7);

    const [{ data: dayAppts }, { data: dayTasks }] = await Promise.all([
      admin
        .from("appointments")
        .select("id, title, appointment_time, location, specialist")
        .eq("appointment_date", day),
      admin
        .from("tasks")
        .select("id, title, due_time, status, appointment_id, task_assignees!inner(user_id)")
        .eq("task_assignees.user_id", user.id)
        .eq("due_date", day)
        .neq("visibility", "private")
        .neq("visibility", "family_only"),
    ]);

    // Helper tasks tied to any of today's appointments — shown as "who's helping".
    const apptIds = (dayAppts ?? []).map((a) => a.id);
    const { data: helperTasks } = apptIds.length > 0
      ? await admin
          .from("tasks")
          .select("appointment_id, assignees:task_assignees(user:profiles(preferred_name))")
          .in("appointment_id", apptIds)
          .neq("status", "done")
      : { data: [] as { appointment_id: string | null; assignees: { user: { preferred_name: string } | null }[] }[] };

    const helpersByAppt = new Map<string, string[]>();
    for (const t of helperTasks ?? []) {
      if (!t.appointment_id) continue;
      const names = t.assignees.map((a) => a.user?.preferred_name).filter((n): n is string => Boolean(n));
      if (names.length === 0) continue;
      const arr = helpersByAppt.get(t.appointment_id) ?? [];
      arr.push(...names);
      helpersByAppt.set(t.appointment_id, arr);
    }

    const dayLabel = new Date(`${day}T00:00:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

    return (
      <main className="flex-1 bg-warm-bg pb-16 anim-fade-in">
        <header className="hdr-peach-soft px-6 pt-12 pb-5 rounded-b-3xl">
          <div className="flex items-center gap-3">
            <Link href={`/mum/tasks?view=calendar&month=${monthForBack}`} className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center shrink-0" aria-label="Back to calendar">
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                <path d="M8 2L2 8l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <h1 className="text-xl font-extrabold text-white">{dayLabel}</h1>
          </div>
        </header>

        <div className="px-4 mt-4 space-y-4">
          <Link
            href={`/family/appointments/new?date=${day}`}
            className="inline-block px-4 py-2 cta-peach rounded-xl text-white text-sm font-extrabold"
          >
            + Add Appointment
          </Link>

          <div className="space-y-2">
            <h2 className="text-sm font-extrabold text-text-dark px-1">Appointments</h2>
            {(dayAppts?.length ?? 0) === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                <p className="text-sm text-text-mid">No appointments on this day.</p>
              </div>
            ) : (
              dayAppts!.map((a) => {
                const helpers = helpersByAppt.get(a.id) ?? [];
                return (
                  <Link key={a.id} href={`/family/appointments/${a.id}`} className="block rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                    <div className="text-[15px] font-extrabold text-text-dark">{a.title}</div>
                    <div className="text-xs text-text-mid mt-0.5">
                      {a.appointment_time ? formatTime(a.appointment_time) : ""}
                      {a.location ? ` · ${a.location}` : ""}
                    </div>
                    {helpers.length > 0 && (
                      <div className="text-xs text-sage-600 font-semibold mt-1.5">
                        {helpers.join(", ")} {helpers.length === 1 ? "is" : "are"} helping with this
                      </div>
                    )}
                  </Link>
                );
              })
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-extrabold text-text-dark px-1">Your tasks</h2>
            {(dayTasks?.length ?? 0) === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                <p className="text-sm text-text-mid">Nothing on your to-do list this day.</p>
              </div>
            ) : (
              dayTasks!.map((t) => (
                <div key={t.id} className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3">
                  <div className="text-[15px] font-extrabold text-text-dark">{t.title}</div>
                  {t.due_time && <span className="text-xs text-text-mid font-semibold">{formatTime(t.due_time)}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    );
  }

  // Calendar view
  const now = new Date();
  let calYear = now.getFullYear();
  let calMonth = now.getMonth();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    calYear = y;
    calMonth = m - 1;
  }
  const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
  const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: monthAppts }, { data: monthTasks }, { data: upcomingAppts }, { data: upcomingTasks }] = await Promise.all([
    admin.from("appointments").select("appointment_date").gte("appointment_date", monthStart).lte("appointment_date", monthEnd),
    admin.from("tasks").select("due_date, task_assignees!inner(user_id)").eq("task_assignees.user_id", user.id).gte("due_date", monthStart).lte("due_date", monthEnd),
    admin.from("appointments").select("id, title, appointment_date, appointment_time, location").gte("appointment_date", today).order("appointment_date", { ascending: true }).limit(5),
    admin.from("tasks").select("id, title, due_date, due_time, task_assignees!inner(user_id)").eq("task_assignees.user_id", user.id).gte("due_date", today).neq("status", "done").neq("visibility", "private").neq("visibility", "family_only").order("due_date", { ascending: true }).limit(5),
  ]);

  const markedDates = new Set([...(monthAppts ?? []).map((a) => a.appointment_date), ...(monthTasks ?? []).map((t) => t.due_date!)]);
  const { days, label } = buildCalendarGrid(calYear, calMonth, today, markedDates);

  const prevMonth = new Date(calYear, calMonth - 1, 1);
  const nextMonth = new Date(calYear, calMonth + 1, 1);
  const prevParam = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const nextParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

  const upcoming = [
    ...(upcomingAppts ?? []).map((a) => ({ id: a.id, kind: "appt" as const, title: a.title, date: a.appointment_date, time: a.appointment_time, subtitle: a.location })),
    ...(upcomingTasks ?? []).map((t) => ({ id: t.id, kind: "task" as const, title: t.title, date: t.due_date!, time: t.due_time, subtitle: null })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  return (
    <main className="flex-1 bg-warm-bg pb-16 anim-fade-in">
      <header className="hdr-peach-soft px-6 pt-12 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Tasks</h1>
            <p className="text-sm text-white/80">{label}</p>
          </div>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white rounded-[18px] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-center mb-3">
            <Link href={`/mum/tasks?view=calendar&month=${prevParam}`} className="w-8 h-8 flex items-center justify-center text-text-mid text-xl rounded-xl hover:bg-cream" aria-label="Previous month">‹</Link>
            <span className="text-base font-extrabold text-text-dark">{label}</span>
            <Link href={`/mum/tasks?view=calendar&month=${nextParam}`} className="w-8 h-8 flex items-center justify-center text-text-mid text-xl rounded-xl hover:bg-cream" aria-label="Next month">›</Link>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-[11px] font-extrabold text-text-mid py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, i) => (
              <Link
                key={i}
                href={`/mum/tasks?view=day&date=${day.date}`}
                className={clsx("block text-center py-1.5 px-0.5 rounded-lg hover:bg-cream", day.isToday && "bg-peach-100")}
              >
                <div className={clsx(
                  "text-[13px] leading-none",
                  day.isCurrentMonth ? (day.isToday ? "font-extrabold text-peach-600" : "font-semibold text-text-dark") : "text-text-mid/40",
                )}>
                  {day.label}
                </div>
                {day.hasItem && <div className="w-[5px] h-[5px] rounded-full bg-peach-500 mx-auto mt-[3px]" />}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-text-dark px-1">Coming up</h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-text-mid">Nothing scheduled.</p>
            </div>
          ) : (
            upcoming.map((item) => (
              <Link
                key={`${item.kind}-${item.id}`}
                href={item.kind === "appt" ? `/family/appointments/${item.id}` : `/mum/tasks?view=day&date=${item.date}`}
                className="block rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-[15px] font-extrabold text-text-dark">{item.title}</div>
                  <div className="text-xs text-text-mid font-semibold shrink-0">{formatShortDate(item.date)}</div>
                </div>
                <div className="text-xs text-text-mid mt-0.5">
                  {item.time ? formatTime(item.time) : ""}
                  {item.subtitle ? ` · ${item.subtitle}` : ""}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

type CalDay = { label: string; date: string; isCurrentMonth: boolean; isToday: boolean; hasItem: boolean };

function buildCalendarGrid(year: number, month: number, today: string, markedDates: Set<string>): { days: CalDay[]; label: string } {
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const label = `${MONTH_NAMES[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalDay[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ label: String(d), date: dateStr, isCurrentMonth: false, isToday: dateStr === today, hasItem: markedDates.has(dateStr) });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ label: String(d), date: dateStr, isCurrentMonth: true, isToday: dateStr === today, hasItem: markedDates.has(dateStr) });
  }

  let trailing = 1;
  while (days.length % 7 !== 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(trailing).padStart(2, "0")}`;
    days.push({ label: String(trailing), date: dateStr, isCurrentMonth: false, isToday: dateStr === today, hasItem: markedDates.has(dateStr) });
    trailing++;
  }

  return { days, label };
}

function isoLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
