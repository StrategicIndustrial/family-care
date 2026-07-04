import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { CheckInButtons } from "@/components/mum/CheckInButtons";
import { MumMedicationCard } from "@/components/mum/MumMedicationCard";
import { formatLongDate, formatRelativeDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// Leanne's home (person in care). Design language: warm peach header, big
// rounded cards, minimal actions. Structure kept from Phase 1 brief;
// visual layer refreshed to match Family Care.dc.html.
export default async function MumHome() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();

  const todayIso = isoLocalDate(new Date());
  const weekOutIso = isoLocalDate(addDays(new Date(), 7));
  const dayStart = new Date(`${todayIso}T00:00:00+08:00`).toISOString();

  const [
    { data: profile },
    { data: visits },
    { data: upcomingVisits },
    { data: medications },
    { data: logsToday },
    { data: checkinToday },
  ] = await Promise.all([
    admin.from("profiles").select("preferred_name").eq("id", user.id).single(),
    admin.from("tasks").select(`
        id, title, due_time, assigned_to,
        assignee:profiles!tasks_assigned_to_fkey ( preferred_name, avatar_url )
      `)
      .eq("task_type", "visit")
      .eq("due_date", todayIso)
      .order("due_time", { ascending: true, nullsFirst: false }),
    admin.from("tasks").select(`
        id, title, due_date, due_time,
        assignee:profiles!tasks_assigned_to_fkey ( preferred_name, avatar_url )
      `)
      .eq("task_type", "visit")
      .gt("due_date", todayIso)
      .lte("due_date", weekOutIso)
      .order("due_date", { ascending: true })
      .order("due_time", { ascending: true, nullsFirst: false }),
    admin.from("medications").select("id, name, dosage, frequency")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    admin.from("medication_logs").select("medication_id, taken_at")
      .eq("logged_by", user.id)
      .gte("taken_at", dayStart)
      .order("taken_at", { ascending: false }),
    admin.from("checkins").select("id")
      .gte("created_at", dayStart)
      .limit(1)
      .maybeSingle(),
  ]);

  const preferredName = profile?.preferred_name ?? "Mum";
  const greeting = greetingForHour(new Date().getHours());

  const logByMed = new Map<string, string>();
  for (const log of logsToday ?? []) {
    if (!logByMed.has(log.medication_id)) logByMed.set(log.medication_id, log.taken_at);
  }

  const hasVisits = (visits?.length ?? 0) > 0;
  const hasUpcoming = (upcomingVisits?.length ?? 0) > 0;
  const checkInDone = !!checkinToday;

  return (
    <main className="flex-1 bg-warm-bg pb-16 anim-fade-in">
      {/* -------------------- Peach header -------------------- */}
      <header className="hdr-peach-soft px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="inline-block bg-white/25 text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full mb-3 tracking-wide">
              Person in Care
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {greeting}, {preferredName} 💕
            </h1>
            <p className="text-sm text-white/85 mt-1">{formatLongDate(new Date())}</p>
          </div>
          <div className="shrink-0 h-14 w-14 rounded-full bg-white/25 flex items-center justify-center text-3xl" aria-hidden="true">
            👵
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 mt-5 space-y-4">
        {/* -------------------- Today's visits -------------------- */}
        <section className="space-y-2">
          <h2 className="text-sm font-extrabold text-text-dark px-2">Today</h2>
          {hasVisits ? (
            <ul className="space-y-2">
              {visits!.map((v) => {
                const name = v.assignee?.preferred_name ?? "Someone";
                const time = v.due_time ? formatTime(v.due_time) : null;
                return (
                  <li key={v.id}
                      className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                    <Avatar name={name} url={v.assignee?.avatar_url ?? null} size="xl" />
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-extrabold text-text-dark truncate">{name}</div>
                      {time && <div className="text-sm text-text-mid">around {time}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-base text-text-mid">Just you and Dad today 💙</p>
            </div>
          )}
        </section>

        {/* -------------------- Coming up -------------------- */}
        {hasUpcoming && (
          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-text-dark px-2">Coming up</h2>
            <ul className="space-y-2">
              {upcomingVisits!.map((v) => {
                const name = v.assignee?.preferred_name ?? "Someone";
                const time = v.due_time ? formatTime(v.due_time) : null;
                return (
                  <li key={v.id}
                      className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                    <Avatar name={name} url={v.assignee?.avatar_url ?? null} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-extrabold text-text-dark truncate">{name}</div>
                      <div className="text-sm text-text-mid">
                        {formatRelativeDate(v.due_date!)}
                        {time ? ` · ${time}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* -------------------- Medications -------------------- */}
        {(medications?.length ?? 0) > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-text-dark px-2">Medications</h2>
            <div className="space-y-3">
              {medications!.map((m) => (
                <MumMedicationCard
                  key={m.id}
                  id={m.id}
                  name={m.name}
                  dosage={m.dosage}
                  frequency={m.frequency}
                  loggedAt={logByMed.get(m.id) ?? null}
                />
              ))}
            </div>
          </section>
        )}

        {/* -------------------- Check-in -------------------- */}
        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-extrabold text-text-dark text-center">
            How are you feeling today?
          </h2>
          {checkInDone ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-lg text-text-dark font-extrabold">
                Thank you, {preferredName} 💙
              </p>
            </div>
          ) : (
            <CheckInButtons preferredName={preferredName} />
          )}
        </section>

        {/* -------------------- Footer -------------------- */}
        <footer className="text-center pt-4 pb-2">
          <p className="text-sm text-text-mid font-semibold">The family is thinking of you.</p>
        </footer>
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
