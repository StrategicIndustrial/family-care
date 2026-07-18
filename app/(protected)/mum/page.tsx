import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { MumCareMedRow } from "@/components/mum/MumCareMedRow";
import { MoodCheckIn } from "@/components/shared/MoodCheckIn";
import { getCurrentPeriod, perthTodayDateStr } from "@/lib/checkin-window";
import { formatLongDate, formatShortDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MumHome() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();

  const todayIso = isoLocalDate(new Date());
  const weekOutIso = isoLocalDate(addDays(new Date(), 7));
  const dayStart = new Date(`${todayIso}T00:00:00+08:00`).toISOString();

  const period = getCurrentPeriod();
  const perthToday = perthTodayDateStr();

  const [
    { data: profile },
    { data: medications },
    { data: logsToday },
    { data: nextAppt },
    { data: myTasks },
    { data: recentUpdates },
    { data: existingCheckin },
  ] = await Promise.all([
    admin.from("profiles").select("preferred_name").eq("id", user.id).single(),
    admin.from("medications").select("id, name, dosage, frequency")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    admin.from("medication_logs").select("medication_id, taken_at")
      .eq("logged_by", user.id)
      .gte("taken_at", dayStart)
      .order("taken_at", { ascending: false }),
    admin.from("appointments")
      .select("id, title, appointment_date, appointment_time, location")
      .gte("appointment_date", todayIso)
      .lte("appointment_date", weekOutIso)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    admin.from("tasks")
      .select("id, title, status")
      .eq("assigned_to", user.id)
      .neq("status", "done")
      .limit(10),
    admin.from("updates")
      .select(`id, body, created_at, author:profiles!updates_author_id_fkey ( preferred_name )`)
      .order("created_at", { ascending: false })
      .limit(2),
    period
      ? admin.from("checkins").select("id").eq("user_id", user.id).eq("period", period).gte("created_at", `${perthToday}T00:00:00+08:00`).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const showCheckIn = period !== null && !existingCheckin;

  const preferredName = profile?.preferred_name ?? "Leanne";
  const greeting = greetingForHour(new Date().getHours());

  const logByMed = new Map<string, string>();
  for (const log of logsToday ?? []) {
    if (!logByMed.has(log.medication_id)) logByMed.set(log.medication_id, log.taken_at);
  }

  const openTaskCount = (myTasks ?? []).length;

  const isToday = nextAppt?.appointment_date === todayIso;
  const isTomorrow = nextAppt?.appointment_date === isoLocalDate(addDays(new Date(), 1));

  return (
    <main className="flex-1 bg-warm-bg pb-16 anim-fade-in">
      {/* -------------------- Peach header -------------------- */}
      <header className="hdr-peach-soft px-6 pt-12 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">
              {greeting}, {preferredName} 💕
            </h1>
            <p className="text-[13px] text-white/80 mt-0.5">{formatLongDate(new Date())}</p>
          </div>
          <div className="shrink-0 w-[50px] h-[50px] rounded-full bg-white/25 flex items-center justify-center text-[22px]" aria-hidden="true">
            👩
          </div>
        </div>
      </header>

      <div className="px-3.5 mt-3.5 flex flex-col gap-2.5">
        {showCheckIn && <MoodCheckIn preferredName={preferredName} period={period!} />}

        {/* -------------------- Today's care -------------------- */}
        <section className="bg-white rounded-[18px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-extrabold text-text-dark mb-2.5">Today&apos;s care</h2>

          {/* Medication rows */}
          {(medications ?? []).map((m) => (
            <MumCareMedRow
              key={m.id}
              id={m.id}
              name={m.name}
              frequency={m.frequency}
              loggedAt={logByMed.get(m.id) ?? null}
            />
          ))}

          {/* Next appointment */}
          {nextAppt && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-sage-50 rounded-xl mt-2">
              <div className="text-xl" aria-hidden="true">📅</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold text-text-dark truncate">
                  {isToday ? nextAppt.title : isTomorrow ? `${nextAppt.title} tomorrow` : nextAppt.title}
                </div>
                <div className="text-xs text-sage-600">
                  {nextAppt.appointment_time ? formatTime(nextAppt.appointment_time) : ""}
                  {nextAppt.location ? ` · ${nextAppt.location}` : ""}
                  {!isToday && !isTomorrow && nextAppt.appointment_date ? ` · ${formatShortDate(nextAppt.appointment_date)}` : ""}
                </div>
              </div>
            </div>
          )}

          {!nextAppt && (medications?.length ?? 0) === 0 && (
            <p className="text-sm text-text-mid text-center py-2">No care items today.</p>
          )}
        </section>

        {/* -------------------- Family updates preview -------------------- */}
        <Link href="/family/updates" className="block bg-white rounded-[18px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-extrabold text-text-dark">Family updates</span>
            <span className="text-xs text-sage-600 font-extrabold">See all ›</span>
          </div>
          {(recentUpdates ?? []).length === 0 ? (
            <p className="text-sm text-text-mid">No updates yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentUpdates!.map((u) => (
                <div key={u.id} className="flex items-start gap-2">
                  <div className="w-[30px] h-[30px] rounded-full bg-lavender-100 flex items-center justify-center text-[13px] shrink-0" aria-hidden="true">
                    🧑
                  </div>
                  <div className="bg-lavender-50 rounded-[10px_10px_10px_3px] px-3 py-2 flex-1 min-w-0">
                    <div className="text-[11px] font-extrabold text-lavender-600 mb-0.5">
                      {u.author?.preferred_name ?? "Family"}
                    </div>
                    <div className="text-[13px] text-lavender-text leading-snug line-clamp-2">{u.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Link>

        {/* -------------------- Shortcut -------------------- */}
        <Link
          href="/mum/tasks"
          className="flex items-center gap-3 px-[18px] py-3.5 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        >
          <div className="w-[38px] h-[38px] rounded-[11px] bg-peach-100 flex items-center justify-center text-base shrink-0" aria-hidden="true">🗓️</div>
          <div className="flex-1">
            <div className="text-[15px] font-extrabold text-text-dark">Tasks & Appointments</div>
            <div className="text-xs text-text-mid">
              {openTaskCount === 0 && !nextAppt ? "Nothing scheduled" : [openTaskCount > 0 ? `${openTaskCount} to do` : null, nextAppt ? "Upcoming appointment" : null].filter(Boolean).join(" · ")}
            </div>
          </div>
          <span className="text-line text-lg" aria-hidden="true">›</span>
        </Link>
      </div>
    </main>
  );
}

function greetingForHour(h: number): string {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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
