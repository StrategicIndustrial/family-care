import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { UpdatePost } from "@/components/shared/UpdatePost";
import { TaskCard } from "@/components/shared/TaskCard";
import { AppointmentRow } from "@/components/shared/AppointmentRow";
import { DadMedicationCard } from "@/components/dad/DadMedicationCard";
import { TaskDoneButton } from "@/components/dad/TaskDoneButton";
import { UpdateComposer } from "@/components/dad/UpdateComposer";
import { MoodCheckIn } from "@/components/shared/MoodCheckIn";
import { getCurrentPeriod, perthTodayDateStr } from "@/lib/checkin-window";
import { formatLongDate, formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DadHome() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const today = isoLocalDate(new Date());
  const weekOut = isoLocalDate(addDays(new Date(), 7));
  const dayStart = new Date(`${today}T00:00:00+08:00`).toISOString();

  const period = getCurrentPeriod();
  const perthToday = perthTodayDateStr();

  const [
    { data: profile },
    { data: medications },
    { data: logsToday },
    { data: dadTasks },
    { data: weekTasks },
    { data: weekAppts },
    { data: updates },
    { data: existingCheckin },
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
    period
      ? admin.from("checkins").select("id").eq("user_id", user.id).eq("period", period).gte("created_at", `${perthToday}T00:00:00+08:00`).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const showCheckIn = period !== null && !existingCheckin;

  const loggedMedIds = new Set((logsToday ?? []).map((l) => l.medication_id));
  const medsDue = (medications ?? []).filter((m) => !loggedMedIds.has(m.id)).length;
  const logByMed = new Map<string, string>();
  for (const l of logsToday ?? []) {
    if (!logByMed.has(l.medication_id)) logByMed.set(l.medication_id, l.taken_at);
  }

  const preferredName = profile?.preferred_name ?? "Dad";
  const dadTaskCount = dadTasks?.length ?? 0;

  return (
    <main className="flex-1 pb-24 anim-fade-in">
      {/* -------------------- Sky header -------------------- */}
      <header className="hdr-sky px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="h-15 w-15 rounded-full bg-white/25 flex items-center justify-center text-2xl shrink-0" style={{ width: 60, height: 60 }} aria-hidden="true">
            👨
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-extrabold text-white/80 uppercase tracking-wide">Significant Other</div>
            <h1 className="text-2xl font-extrabold text-white mt-0.5">Hi, {preferredName} 👋</h1>
            <p className="text-xs text-white/80 mt-0.5">{formatLongDate(new Date())}</p>
          </div>
          <div className="shrink-0 self-start"><SignOutButton /></div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        {showCheckIn && <MoodCheckIn preferredName={preferredName} period={period!} />}

        {/* -------------------- Leanne's latest -------------------- */}
        <div className="rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hdr-peach-soft">
          <div className="text-[11px] font-extrabold text-white/85 uppercase tracking-wide mb-1">
            Mum's latest
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl" aria-hidden="true">😊</div>
            <div>
              <div className="text-base font-extrabold text-white">
                {medsDue === 0 ? "Meds taken this morning" : "Waiting on morning meds"}
              </div>
              <div className="text-xs text-white/85">
                {dadTaskCount} task{dadTaskCount === 1 ? "" : "s"} on your plate today
              </div>
            </div>
          </div>
        </div>

        {/* -------------------- Medications -------------------- */}
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

        {/* -------------------- Today's tasks -------------------- */}
        <Section title="Today's tasks" linkHref="/family/tasks" linkLabel="All ›">
          {dadTaskCount === 0 ? (
            <EmptyHint>Nothing on your plate today.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {dadTasks!.map((t) => (
                <Link key={t.id} href={`/family/tasks/${t.id}`} className="block">
                  <TaskCard
                    title={t.title}
                    taskType={t.task_type}
                    dueDate={t.due_date}
                    dueTime={t.due_time}
                    status={t.status}
                    action={<TaskDoneButton taskId={t.id} />}
                  />
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* -------------------- This week -------------------- */}
        <Section title="This week" linkHref="/family/tasks" linkLabel="All ›">
          {((weekTasks?.length ?? 0) + (weekAppts?.length ?? 0)) === 0 ? (
            <EmptyHint>A quiet week ahead.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {(weekTasks ?? []).map((t) => (
                <Link key={t.id} href={`/family/tasks/${t.id}`} className="block">
                  <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <div className="font-extrabold text-text-dark">{t.title}</div>
                        <div className="text-xs text-text-mid mt-0.5">
                          {t.assignee?.preferred_name ?? "Unclaimed"}
                        </div>
                      </div>
                      <div className="text-xs text-text-mid font-semibold">
                        {t.due_date ? formatShortDate(t.due_date) : "—"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {(weekAppts ?? []).map((a) => (
                <Link key={a.id} href={`/family/appointments/${a.id}`} className="block">
                  <AppointmentRow
                    title={a.title}
                    date={a.appointment_date}
                    time={a.appointment_time}
                    specialist={a.specialist}
                    location={a.location}
                  />
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* -------------------- Quick composer -------------------- */}
        <Section title="Let the family know">
          <UpdateComposer />
        </Section>

        {/* -------------------- Feed -------------------- */}
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

function Section({
  title, children, linkHref, linkLabel,
}: {
  title: string;
  children: React.ReactNode;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between px-2">
        <h2 className="text-sm font-extrabold text-text-dark">{title}</h2>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="text-xs text-sky-500 font-bold hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
      <p className="text-sm text-text-mid">{children}</p>
    </div>
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
