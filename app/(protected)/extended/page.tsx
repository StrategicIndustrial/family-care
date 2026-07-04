import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { UpdatePost } from "@/components/shared/UpdatePost";
import { ClaimButton } from "@/components/family/ClaimButton";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { formatRelativeDate, formatTime } from "@/lib/format";
import type { TaskKind } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<TaskKind, string> = {
  visit:       "🚶 Visit",
  shopping:    "🛒 Shopping",
  transport:   "🚗 Transport",
  appointment: "📅 Appointment",
  other:       "✦ Task",
};

export default async function ExtendedHome() {
  const admin = getSupabaseServiceClient();

  const [{ data: updates }, { data: openVisits }, { data: myClaimed }] = await Promise.all([
    admin.from("updates").select(`
        id, body, is_flagged, created_at,
        author:profiles!updates_author_id_fkey ( preferred_name, avatar_url )
      `)
      .order("is_flagged", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    admin.from("tasks").select("id, title, task_type, due_date, due_time")
      .in("task_type", ["visit", "transport"])
      .eq("status", "open")
      .is("assigned_to", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
    admin.from("tasks").select("id, title, task_type, due_date, due_time")
      .in("task_type", ["visit", "transport"])
      .eq("status", "claimed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
  ]);

  return (
    <main className="flex-1 pb-16 anim-fade-in">
      {/* -------------------- Sky header -------------------- */}
      <header className="hdr-sky px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold text-white/80 uppercase tracking-wide">Extended Family</div>
            <h1 className="text-2xl font-extrabold text-white mt-0.5">Family Care</h1>
          </div>
          <SignOutButton />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-6">
        <section className="space-y-2">
          <h2 className="text-sm font-extrabold text-text-dark px-2">Updates</h2>
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
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-extrabold text-text-dark px-2">Where you can help</h2>
          {(openVisits?.length ?? 0) === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-text-mid">
                No visits or transport needed right now — thanks for checking in.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {openVisits!.map((t) => (
                <div key={t.id} className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1"><Badge tone="peach">{TYPE_LABEL[t.task_type]}</Badge></div>
                    <div className="font-extrabold text-text-dark">{t.title}</div>
                    {t.due_date && (
                      <div className="text-xs text-text-mid">
                        {formatRelativeDate(t.due_date)}
                        {t.due_time ? ` · ${formatTime(t.due_time)}` : ""}
                      </div>
                    )}
                  </div>
                  <ClaimButton taskId={t.id} label="I can help" />
                </div>
              ))}
            </div>
          )}
        </section>

        {(myClaimed?.length ?? 0) > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-extrabold text-text-dark px-2">Claimed visits</h2>
            <div className="space-y-2">
              {myClaimed!.map((t) => (
                <div key={t.id} className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                  <div className="mb-1"><Badge tone="sage">{TYPE_LABEL[t.task_type]}</Badge></div>
                  <div className="font-extrabold text-text-dark">{t.title}</div>
                  {t.due_date && (
                    <div className="text-xs text-text-mid">
                      {formatRelativeDate(t.due_date)}
                      {t.due_time ? ` · ${formatTime(t.due_time)}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
