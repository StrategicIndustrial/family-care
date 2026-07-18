import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { UpdatePost } from "@/components/shared/UpdatePost";
import { AppointmentRow } from "@/components/shared/AppointmentRow";
import { ClaimButton } from "@/components/family/ClaimButton";
import { formatShortDate, formatTime } from "@/lib/format";
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
    { data: openTasksAll },
    { count: memberCount },
  ] = await Promise.all([
    admin.from("profiles").select("preferred_name, is_admin").eq("id", user.id).single(),
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
    admin.from("tasks").select("id").neq("status", "done"),
    admin.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  const morningMedsLogged = (morningLog?.length ?? 0) > 0;
  const preferredName = profile?.preferred_name ?? "family";
  const isAdmin = profile?.is_admin === true;
  const openTaskCount = openTasksAll?.length ?? 0;
  const apptCount = weekAppts?.length ?? 0;

  const headerClass = isAdmin ? "hdr-lavender-strong" : "hdr-sage";

  return (
    <main className="flex-1 pb-24 anim-fade-in">
      {/* -------------------- Header -------------------- */}
      <header className={`${headerClass} px-6 pt-12 pb-8 rounded-b-3xl`}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="h-15 w-15 rounded-full bg-white/25 flex items-center justify-center text-2xl shrink-0" style={{ width: 60, height: 60 }} aria-hidden="true">
            🧑
          </div>
          <div className="flex-1 min-w-0">
            {isAdmin ? (
              <span className="inline-block bg-white/25 text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full mb-1 tracking-wide">
                ⚙️ Admin
              </span>
            ) : (
              <div className="text-[11px] font-extrabold text-white/80 uppercase tracking-wide">Family Member</div>
            )}
            <h1 className="text-2xl font-extrabold text-white">Hi, {preferredName} 👋</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        {/* -------------------- Mum's status card -------------------- */}
        <div className="rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] hdr-peach-soft">
          <div className="text-[11px] font-extrabold text-white/85 uppercase tracking-wide mb-1">
            Leanne's status
          </div>
          <div className="flex items-center gap-3 text-white">
            <div className="text-2xl" aria-hidden="true">😊</div>
            <div>
              <div className="text-base font-extrabold">
                {morningMedsLogged ? "Doing well today" : "Meds not logged yet"}
              </div>
              <div className="text-xs text-white/85">
                {morningMedsLogged ? "Morning meds logged ✓" : "Waiting on morning meds"}
              </div>
            </div>
          </div>
        </div>

        {/* -------------------- Admin stats -------------------- */}
        {isAdmin && (
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Members" value={memberCount ?? 0} colour="#7b5ea7" />
            <StatTile label="Tasks"   value={openTaskCount}    colour="#e07070" />
            <StatTile label="Appts"   value={apptCount}         colour="#5da882" />
          </div>
        )}

        {/* -------------------- Unclaimed -------------------- */}
        {(unclaimed?.length ?? 0) > 0 && (
          <Section title="Up for grabs" link={{ href: "/family/tasks?filter=unclaimed", label: "All ›" }}>
            <div className="space-y-2">
              {unclaimed!.slice(0, 3).map((t) => (
                <div key={t.id} className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1"><Badge tone="sage">{TYPE_LABEL[t.task_type]}</Badge></div>
                    <div className="font-extrabold text-text-dark">{t.title}</div>
                    {t.due_date && (
                      <div className="text-xs text-text-mid">
                        {formatShortDate(t.due_date)}
                        {t.due_time ? ` · ${formatTime(t.due_time)}` : ""}
                      </div>
                    )}
                  </div>
                  <ClaimButton taskId={t.id} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* -------------------- This week -------------------- */}
        <Section title="This week" link={{ href: "/family/tasks", label: "All ›" }}>
          {((weekTasks?.length ?? 0) + (weekAppts?.length ?? 0)) === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-text-mid">Nothing scheduled this week.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(weekTasks ?? []).slice(0, 5).map((t) => (
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
                        {t.due_date ? formatShortDate(t.due_date) : ""}
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

        {/* -------------------- Recent updates -------------------- */}
        <Section title="Recent updates" link={{ href: "/family/updates", label: "All ›" }}>
          {(updates?.length ?? 0) === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-text-mid">No updates yet.</p>
            </div>
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

function StatTile({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className="rounded-2xl bg-white py-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
      <div className="text-2xl font-extrabold" style={{ color: colour }}>{value}</div>
      <div className="text-[10px] font-extrabold text-text-mid uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function Section({ title, link, children }: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between px-2">
        <h2 className="text-sm font-extrabold text-text-dark">{title}</h2>
        {link && (
          <Link href={link.href} className="text-xs text-sage-600 font-bold hover:underline">
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
