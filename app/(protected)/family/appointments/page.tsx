import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { AppointmentRow } from "@/components/shared/AppointmentRow";
import { clsx } from "@/lib/cx";

export const dynamic = "force-dynamic";

type View = "calendar" | "list" | "day";

export default async function FamilyAppointments({
  searchParams,
}: {
  searchParams: Promise<{ view?: View; history?: string; month?: string; date?: string }>;
}) {
  const { view = "calendar", history, month: monthParam, date: dateParam } = await searchParams;

  const today = isoLocalDate(new Date());
  const showHistory = view === "list" && history === "1";

  // Parse month parameter for calendar view (YYYY-MM, defaults to current month)
  const now = new Date();
  let calYear = now.getFullYear();
  let calMonth = now.getMonth(); // 0-based

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    calYear = y;
    calMonth = m - 1;
  }

  const admin = getSupabaseServiceClient();

  if (view === "calendar") {
    // Fetch all appointments for the displayed month
    const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data: monthAppts } = await admin
      .from("appointments")
      .select("id, title, appointment_date, appointment_time, specialist, location")
      .gte("appointment_date", monthStart)
      .lte("appointment_date", monthEnd)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true, nullsFirst: false });

    const apptDates = new Set((monthAppts ?? []).map((a) => a.appointment_date));

    // Build calendar grid
    const { days, label } = buildCalendarGrid(calYear, calMonth, today, apptDates);

    // Upcoming appointments from today for the list below the grid
    const { data: upcoming } = await admin
      .from("appointments")
      .select("id, title, appointment_date, appointment_time, specialist, location")
      .gte("appointment_date", today)
      .order("appointment_date", { ascending: true })
      .limit(5);

    const prevMonth = new Date(calYear, calMonth - 1, 1);
    const nextMonth = new Date(calYear, calMonth + 1, 1);
    const prevParam = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    const nextParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

    return (
      <main className="flex-1 pb-28 anim-fade-in">
        <header className="hdr-peach px-6 pt-12 pb-5 rounded-b-3xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Calendar</h1>
              <p className="text-sm text-white/80">{label}</p>
            </div>
            <Link
              href="/family/appointments?view=list"
              className="bg-white/20 rounded-xl px-3.5 py-2 text-white text-[13px] font-extrabold"
            >
              Appointments ›
            </Link>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
          {/* Month grid */}
          <div className="bg-white rounded-[18px] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between items-center mb-3">
              <Link
                href={`/family/appointments?view=calendar&month=${prevParam}`}
                className="w-8 h-8 flex items-center justify-center text-text-mid text-xl rounded-xl hover:bg-cream"
                aria-label="Previous month"
              >
                ‹
              </Link>
              <span className="text-base font-extrabold text-text-dark">{label}</span>
              <Link
                href={`/family/appointments?view=calendar&month=${nextParam}`}
                className="w-8 h-8 flex items-center justify-center text-text-mid text-xl rounded-xl hover:bg-cream"
                aria-label="Next month"
              >
                ›
              </Link>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center text-[11px] font-extrabold text-text-mid py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => (
                <Link
                  key={i}
                  href={`/family/appointments?view=day&date=${day.date}`}
                  className={clsx(
                    "block text-center py-1.5 px-0.5 rounded-lg hover:bg-cream",
                    day.isToday && "bg-peach-100",
                  )}
                >
                  <div className={clsx(
                    "text-[13px] leading-none",
                    day.isCurrentMonth
                      ? day.isToday ? "font-extrabold text-peach-600" : "font-semibold text-text-dark"
                      : "text-text-mid/40",
                  )}>
                    {day.label}
                  </div>
                  {day.hasAppt && (
                    <div className="w-[5px] h-[5px] rounded-full bg-peach-500 mx-auto mt-[3px]" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-peach-500 shrink-0" />
              <span className="text-xs text-text-mid">Appointment</span>
            </div>
          </div>

          {/* Upcoming list */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-sm font-extrabold text-text-dark">Upcoming appointments</h2>
              <Link href="/family/appointments?view=list" className="text-xs text-peach-500 font-extrabold">
                View all ›
              </Link>
            </div>
            {(upcoming?.length ?? 0) === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                <p className="text-sm text-text-mid">No upcoming appointments.</p>
              </div>
            ) : (
              upcoming!.map((a) => (
                <Link key={a.id} href={`/family/appointments/${a.id}`} className="block">
                  <AppointmentRow
                    title={a.title}
                    date={a.appointment_date}
                    time={a.appointment_time}
                    specialist={a.specialist}
                    location={a.location}
                  />
                </Link>
              ))
            )}
          </div>

          <Link
            href="/family/appointments/new"
            className="block w-full py-3.5 cta-peach rounded-2xl text-white text-base font-extrabold text-center
                       shadow-[0_4px_16px_rgba(232,149,106,0.3)]"
          >
            + Add Appointment
          </Link>
        </div>
      </main>
    );
  }

  if (view === "day") {
    const day = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
    const monthParam2 = day.slice(0, 7);

    const [{ data: dayAppts }, { data: dayTasks }] = await Promise.all([
      admin
        .from("appointments")
        .select("id, title, appointment_date, appointment_time, specialist, location")
        .eq("appointment_date", day)
        .order("appointment_time", { ascending: true, nullsFirst: false }),
      admin
        .from("tasks")
        .select("id, title, task_type, due_time, status, assignees:task_assignees(user:profiles(preferred_name))")
        .eq("due_date", day)
        .order("due_time", { ascending: true, nullsFirst: false }),
    ]);

    const dayLabel = new Date(`${day}T00:00:00`).toLocaleDateString("en-AU", {
      weekday: "long", day: "numeric", month: "long",
    });

    return (
      <main className="flex-1 pb-28 anim-fade-in">
        <header className="hdr-peach px-6 pt-12 pb-5 rounded-b-3xl">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Link
              href={`/family/appointments?view=calendar&month=${monthParam2}`}
              className="w-8 h-8 rounded-full bg-white/25 border-none flex items-center justify-center shrink-0"
              aria-label="Back to calendar"
            >
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                <path d="M8 2L2 8l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <h1 className="text-xl font-extrabold text-white">{dayLabel}</h1>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
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
              dayAppts!.map((a) => (
                <Link key={a.id} href={`/family/appointments/${a.id}`} className="block">
                  <AppointmentRow
                    title={a.title}
                    date={a.appointment_date}
                    time={a.appointment_time}
                    specialist={a.specialist}
                    location={a.location}
                  />
                </Link>
              ))
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-extrabold text-text-dark px-1">Tasks due</h2>
            {(dayTasks?.length ?? 0) === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                <p className="text-sm text-text-mid">No tasks due this day.</p>
              </div>
            ) : (
              dayTasks!.map((t) => (
                <Link key={t.id} href={`/family/tasks/${t.id}`} className="block">
                  <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-text-dark">{t.title}</div>
                      <div className="text-xs text-text-mid mt-0.5">{t.assignees.map((a) => a.user?.preferred_name).filter(Boolean).join(", ") || "Unassigned"}</div>
                    </div>
                    {t.due_time && <span className="text-xs text-text-mid font-semibold">{t.due_time}</span>}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    );
  }

  // List view
  const { data: appts } = await admin
    .from("appointments")
    .select("id, title, appointment_date, appointment_time, specialist, location")
    [showHistory ? "lt" : "gte"]("appointment_date", today)
    .order("appointment_date", { ascending: !showHistory });

  return (
    <main className="flex-1 pb-28 anim-fade-in">
      <header className="hdr-peach px-6 pt-12 pb-5 rounded-b-3xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/family/appointments?view=calendar"
            className="w-8 h-8 rounded-full bg-white/25 border-none flex items-center justify-center shrink-0"
            aria-label="Back to calendar"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M8 2L2 8l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Appointments</h1>
            <p className="text-sm text-white/80">Scheduled appointments only</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4">
        <nav className="flex gap-2" aria-label="Filter">
          <Link
            href="/family/appointments?view=list"
            className={clsx(
              "rounded-full px-4 py-1.5 text-xs font-extrabold",
              !showHistory ? "cta-peach text-white" : "bg-white text-text-mid",
            )}
          >
            Upcoming
          </Link>
          <Link
            href="/family/appointments?view=list&history=1"
            className={clsx(
              "rounded-full px-4 py-1.5 text-xs font-extrabold",
              showHistory ? "cta-peach text-white" : "bg-white text-text-mid",
            )}
          >
            History
          </Link>
        </nav>

        <Link
          href="/family/appointments/new"
          className="inline-block px-4 py-2 cta-peach rounded-xl text-white text-sm font-extrabold"
        >
          + Add Appointment
        </Link>

        <div className="space-y-2">
          {(appts?.length ?? 0) === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-text-mid">
                {showHistory ? "No past appointments." : "No appointments scheduled."}
              </p>
            </div>
          ) : (
            appts!.map((a) => (
              <Link key={a.id} href={`/family/appointments/${a.id}`} className="block">
                <AppointmentRow
                  title={a.title}
                  date={a.appointment_date}
                  time={a.appointment_time}
                  specialist={a.specialist}
                  location={a.location}
                />
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

type CalDay = {
  label: string;
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAppt: boolean;
};

function buildCalendarGrid(
  year: number,
  month: number,
  today: string,
  apptDates: Set<string>,
): { days: CalDay[]; label: string } {
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const label = `${MONTH_NAMES[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalDay[] = [];

  // Leading days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ label: String(d), date: dateStr, isCurrentMonth: false, isToday: dateStr === today, hasAppt: apptDates.has(dateStr) });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ label: String(d), date: dateStr, isCurrentMonth: true, isToday: dateStr === today, hasAppt: apptDates.has(dateStr) });
  }

  // Trailing days to complete last row (to multiple of 7)
  let trailing = 1;
  while (days.length % 7 !== 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(trailing).padStart(2, "0")}`;
    days.push({ label: String(trailing), date: dateStr, isCurrentMonth: false, isToday: dateStr === today, hasAppt: apptDates.has(dateStr) });
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
