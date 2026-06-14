import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UpdatePost } from "@/components/shared/UpdatePost";
import { AppointmentRow } from "@/components/shared/AppointmentRow";
import { ClaimButton } from "@/components/family/ClaimButton";
import { formatLongDate, formatShortDate, formatTime } from "@/lib/format";
import type { TaskKind } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<TaskKind, string> = {
  visit:       "🚶 Visit",
  shopping:    "🛒 Shopping",
  transport:   "🚗 Transport",
  appointment: "📅 Appointment",
  other:       "✦ Task",
};

export default async function FamilyHome() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const today = isoLocalDate(new Date());
  const weekOut = isoLocalDate(addDays(new Date(), 7));
  const dayStart = new Date(`${today}T00:00:00+08:00`).toISOString();

  const [
    { data: profile },
    { data: weekTasks },
    { data: weekAppts },
    { data: unclaimed },
    { data: updates },
    { data: morningLog },
  ] = await Promise.all([
    admin.from("profiles").select("preferred_name").eq("id", user.id).single(),
    admin.from("tasks").select(`
        id, title, task_type, due_date, due_time, status,
        assignee:profiles!tasks_assigned_to_fkey ( preferred_name )
      `)
      .gte("due_date", today).lte("due_date", weekOut)
      .neq("status", "done")
      .order("due_date", { ascending: true }),
    admin.from("appointments").select("id, title, appointment_date, appointment_time, specialist, location")
      .gte("appointment_date", today).lte("appointment_date", weekOut)
      .order("appointment_date", { ascending: true }),
    admin.from("tasks").select("id, title, task_type, due_date, due_time")
      .is("assigned_to", null).eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false }),
    admin.from("updates").select(`
        id, body, is_flagged, created_at,
        author:profiles!updates_author_id_fkey ( preferred_name, avatar_url )
      `)
      .order("created_at", { ascending: false })
      .limit(5),
    admin.from("medication_logs").select("id").gte("taken_at", dayStart).limit(1),
  ]);

  const morningMedsLogged = (morningLog?.length ?? 0) > 0;

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-10">
        <header>
          <h1 className="text-2xl font-semibold text-text-dark">
            Welcome, {profile?.preferred_name ?? "family"}
          </h1>
          <p className="text-text-mid">{formatLongDate(new Date())}</p>
        </header>

        {/* ---------- Med status ---------- */}
        <section>
          <Card className={morningMedsLogged ? "bg-success/5 border-success/30" : "bg-warning/5 border-warning/30"}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-mid">Mum's medication</div>
                <div className="font-medium text-text-dark">
                  {morningMedsLogged ? "Logged today ✓" : "Not logged yet today"}
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ---------- Unclaimed tasks ---------- */}
        {(unclaimed?.length ?? 0) > 0 && (
          <Section title="Up for grabs" link={{ href: "/family/tasks?filter=unclaimed", label: "All" }}>
            <div className="space-y-2">
              {unclaimed!.slice(0, 3).map((t) => (
                <Card key={t.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>{TYPE_LABEL[t.task_type]}</Badge>
                    </div>
                    <div className="font-medium text-text-dark">{t.title}</div>
                    {t.due_date && (
                      <div className="text-sm text-text-mid">
                        {formatShortDate(t.due_date)}
                        {t.due_time ? ` · ${formatTime(t.due_time)}` : ""}
                      </div>
                    )}
                  </div>
                  <ClaimButton taskId={t.id} />
                </Card>
              ))}
            </div>
          </Section>
        )}

        {/* ---------- Week at a glance ---------- */}
        <Section title="This week" link={{ href: "/family/tasks", label: "All tasks" }}>
          {((weekTasks?.length ?? 0) + (weekAppts?.length ?? 0)) === 0 ? (
            <p className="text-sm text-text-mid">Nothing scheduled this week.</p>
          ) : (
            <div className="space-y-2">
              {(weekTasks ?? []).slice(0, 5).map((t) => (
                <Card key={t.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="font-medium text-text-dark">{t.title}</div>
                      <div className="text-sm text-text-mid">
                        {t.assignee?.preferred_name ?? "Unclaimed"}
                      </div>
                    </div>
                    <div className="text-sm text-text-mid">
                      {t.due_date ? formatShortDate(t.due_date) : ""}
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

        {/* ---------- Recent updates ---------- */}
        <Section title="Recent updates" link={{ href: "/family/updates", label: "All" }}>
          {(updates?.length ?? 0) === 0 ? (
            <p className="text-sm text-text-mid">No updates yet.</p>
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

function Section({ title, link, children }: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium text-text-dark">{title}</h2>
        {link && (
          <Link href={link.href} className="text-sm text-primary underline-offset-4 hover:underline">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
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
