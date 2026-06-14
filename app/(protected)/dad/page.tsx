import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { UpdatePost } from "@/components/shared/UpdatePost";
import { TaskCard } from "@/components/shared/TaskCard";
import { AppointmentRow } from "@/components/shared/AppointmentRow";
import { DadMedicationCard } from "@/components/dad/DadMedicationCard";
import { TaskDoneButton } from "@/components/dad/TaskDoneButton";
import { UpdateComposer } from "@/components/dad/UpdateComposer";
import { formatLongDate, formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Dad's dashboard. Brief §6.2:
//   1. Today header (date + single-line status)
//   2. Medications (Mum's actives, with Taken ✓)
//   3. Today's tasks (assigned to Dad, due today or overdue)
//   4. This week (tasks + appointments next 7 days)
//   5. Family updates feed (newest first, flagged at top)
//   6. Quick flag button → composer
export default async function DadHome() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const today = isoLocalDate(new Date());
  const weekOut = isoLocalDate(addDays(new Date(), 7));
  const dayStart = new Date(`${today}T00:00:00+08:00`).toISOString();

  const [
    { data: profile },
    { data: medications },
    { data: logsToday },
    { data: dadTasks },
    { data: weekTasks },
    { data: weekAppts },
    { data: updates },
  ] = await Promise.all([
    admin.from("profiles").select("preferred_name").eq("id", user.id).single(),
    admin.from("medications").select("id, name, dosage, frequency")
      .eq("is_active", true).order("created_at", { ascending: true }),
    admin.from("medication_logs").select("medication_id, taken_at, logged_by")
      .gte("taken_at", dayStart).order("taken_at", { ascending: false }),
    admin.from("tasks").select(`
        id, title, task_type, due_date, due_time, status,
        assignee:profiles!tasks_assigned_to_fkey ( preferred_name, avatar_url )
      `)
      .eq("assigned_to", user.id).neq("status", "done")
      .or(`due_date.lte.${today},due_date.is.null`)
      .order("due_date", { ascending: true, nullsFirst: false }),
    admin.from("tasks").select(`
        id, title, task_type, due_date, due_time, status,
        assignee:profiles!tasks_assigned_to_fkey ( preferred_name, avatar_url )
      `)
      .gte("due_date", today).lte("due_date", weekOut)
      .neq("status", "done").order("due_date", { ascending: true }),
    admin.from("appointments").select("id, title, appointment_date, appointment_time, specialist, location")
      .gte("appointment_date", today).lte("appointment_date", weekOut)
      .order("appointment_date", { ascending: true }),
    admin.from("updates").select(`
        id, body, is_flagged, created_at,
        author:profiles!updates_author_id_fkey ( preferred_name, avatar_url )
      `)
      .order("is_flagged", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Determine if Mum's meds are "due" — i.e. any active med has no log today.
  const loggedMedIds = new Set((logsToday ?? []).map((l) => l.medication_id));
  const medsDue = (medications ?? []).filter((m) => !loggedMedIds.has(m.id)).length;
  const logByMed = new Map<string, string>();
  for (const l of logsToday ?? []) {
    if (!logByMed.has(l.medication_id)) logByMed.set(l.medication_id, l.taken_at);
  }

  const dadTaskCount = dadTasks?.length ?? 0;
  const apptThisWeek = weekAppts?.length ?? 0;
  const statusLine = [
    `${dadTaskCount} task${dadTaskCount === 1 ? "" : "s"} today`,
    `${apptThisWeek} appointment${apptThisWeek === 1 ? "" : "s"} this week`,
    medsDue > 0 ? "Mum's meds due" : "Mum's meds logged",
  ].join(" · ");

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* ---------- Header ---------- */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-dark">
              Hi {profile?.preferred_name ?? "Dad"}
            </h1>
            <p className="text-text-mid">{formatLongDate(new Date())}</p>
            <p className="text-sm text-text-mid mt-1">{statusLine}</p>
          </div>
          <SignOutButton />
        </header>

        {/* ---------- Medications ---------- */}
        {(medications?.length ?? 0) > 0 && (
          <Section title="Medications">
            <div className="space-y-3">
              {medications!.map((m) => (
                <DadMedicationCard
                  key={m.id}
                  id={m.id}
                  name={m.name}
                  dosage={m.dosage}
                  frequency={m.frequency}
                  loggedAt={logByMed.get(m.id) ?? null}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ---------- Today's tasks ---------- */}
        <Section title="Today's tasks">
          {dadTaskCount === 0 ? (
            <EmptyHint>Nothing on your plate today.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {dadTasks!.map((t) => (
                <TaskCard
                  key={t.id}
                  title={t.title}
                  taskType={t.task_type}
                  dueDate={t.due_date}
                  dueTime={t.due_time}
                  status={t.status}
                  action={<TaskDoneButton taskId={t.id} />}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ---------- This week ---------- */}
        <Section title="This week">
          {((weekTasks?.length ?? 0) + (weekAppts?.length ?? 0)) === 0 ? (
            <EmptyHint>A quiet week ahead.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {(weekTasks ?? []).map((t) => (
                <Card key={t.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="font-medium text-text-dark">{t.title}</div>
                      <div className="text-sm text-text-mid">
                        {t.assignee?.preferred_name ?? "Unclaimed"}
                      </div>
                    </div>
                    <div className="text-sm text-text-mid">
                      {t.due_date ? formatShortDate(t.due_date) : "—"}
                    </div>
                  </div>
                </Card>
              ))}
              {(weekAppts ?? []).map((a) => (
                <AppointmentRow
                  key={a.id}
                  title={a.title}
                  date={a.appointment_date}
                  time={a.appointment_time}
                  specialist={a.specialist}
                  location={a.location}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ---------- Quick flag composer ---------- */}
        <Section title="Let the family know">
          <UpdateComposer />
        </Section>

        {/* ---------- Family updates feed ---------- */}
        <Section title="Family updates">
          {(updates?.length ?? 0) === 0 ? (
            <EmptyHint>No updates yet.</EmptyHint>
          ) : (
            <div className="space-y-3">
              {updates!.map((u) => (
                <UpdatePost
                  key={u.id}
                  body={u.body}
                  authorName={u.author?.preferred_name ?? "Someone"}
                  authorAvatarUrl={u.author?.avatar_url}
                  createdAt={u.created_at}
                  flagged={u.is_flagged}
                />
              ))}
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}

// ---------- helpers ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium text-text-dark">{title}</h2>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-mid">{children}</p>;
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
