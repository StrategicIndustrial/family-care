import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { CheckInButtons } from "@/components/mum/CheckInButtons";
import { MumMedicationCard } from "@/components/mum/MumMedicationCard";
import { formatLongDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// Mum's home. Brief §6.1:
//   - Large text, warm palette, no navigation
//   - Greeting, today's visits, medications, check-in, footer
//   - Maximum 3 actions on screen at any time
//
// Data fetches use the service-role client because Mum's RLS limits her to
// tasks assigned to herself + her own medication logs, but the spec
// requires her to see visits planned BY others and pending medication
// state regardless of who'd logged it previously today.
export default async function MumHome() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();

  const todayIso = isoLocalDate(new Date());
  const dayStartIso = new Date().toISOString().slice(0, 10) + "T00:00:00+08:00"; // Perth tz
  const dayStart = new Date(dayStartIso).toISOString();

  const [{ data: profile }, { data: visits }, { data: medications }, { data: logsToday }, { data: checkinToday }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("preferred_name")
        .eq("id", user.id)
        .single(),
      admin
        .from("tasks")
        .select(`
          id, title, due_time, assigned_to,
          assignee:profiles!tasks_assigned_to_fkey ( preferred_name, avatar_url )
        `)
        .eq("task_type", "visit")
        .eq("due_date", todayIso)
        .order("due_time", { ascending: true, nullsFirst: false }),
      admin
        .from("medications")
        .select("id, name, dosage, frequency")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      admin
        .from("medication_logs")
        .select("medication_id, taken_at")
        .eq("logged_by", user.id)
        .gte("taken_at", dayStart)
        .order("taken_at", { ascending: false }),
      admin
        .from("checkins")
        .select("id")
        .gte("created_at", dayStart)
        .limit(1)
        .maybeSingle(),
    ]);

  const preferredName = profile?.preferred_name ?? "Mum";
  const greeting = greetingForHour(new Date().getHours());

  // Build a medId → most recent log timestamp map for today.
  const logByMed = new Map<string, string>();
  for (const log of logsToday ?? []) {
    if (!logByMed.has(log.medication_id)) {
      logByMed.set(log.medication_id, log.taken_at);
    }
  }

  const hasVisits = (visits?.length ?? 0) > 0;
  const checkInDone = !!checkinToday;

  return (
    <main className="flex-1 bg-warm-bg px-6 py-10">
      <div className="max-w-lg mx-auto space-y-10">
        {/* ---------- Greeting ---------- */}
        <header className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-semibold text-text-dark">
            {greeting}, {preferredName} ☀️
          </h1>
          <p className="text-lg text-text-mid">{formatLongDate(new Date())}</p>
        </header>

        {/* ---------- Today's visits ---------- */}
        <section className="space-y-3">
          <h2 className="text-xl font-medium text-text-dark">Today</h2>
          {hasVisits ? (
            <ul className="space-y-2">
              {visits!.map((v) => {
                const name = v.assignee?.preferred_name ?? "Someone";
                const time = v.due_time ? formatTime(v.due_time) : null;
                return (
                  <li
                    key={v.id}
                    className="flex items-center gap-4 rounded-2xl bg-white border border-line p-4"
                  >
                    <Avatar name={name} url={v.assignee?.avatar_url ?? null} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xl font-medium text-text-dark truncate">
                        {name}
                      </div>
                      {time && (
                        <div className="text-base text-text-mid">around {time}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-lg text-text-mid">Just you and Dad today 💙</p>
          )}
        </section>

        {/* ---------- Medications ---------- */}
        {(medications?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-medium text-text-dark">Medications</h2>
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

        {/* ---------- Daily check-in ---------- */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium text-text-dark text-center">
            How are you feeling today?
          </h2>
          {checkInDone ? (
            <p className="text-center text-2xl text-text-dark">
              Thank you, {preferredName} 💙
            </p>
          ) : (
            <CheckInButtons preferredName={preferredName} />
          )}
        </section>

        {/* ---------- Footer: something nice ---------- */}
        <footer className="text-center pt-6">
          <p className="text-lg text-text-mid">The family is thinking of you.</p>
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
  // YYYY-MM-DD in the local TZ — matches Postgres `date` storage.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
