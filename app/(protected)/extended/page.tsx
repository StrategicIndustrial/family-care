import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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

// Extended family view. Brief §6.4 — two sections, read-focused, minimal.
//
// Visible:
//   1. Updates feed (read-only)
//   2. Visit + transport tasks (can claim if unclaimed)
//
// Not visible: medications, appointments, anything clinical.
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
    // Tasks this extended user has already claimed, for "thanks for helping" context.
    // RLS on tasks for extended only allows the role to read by service-role-equivalent
    // policy when assigned_to=auth.uid(); we already use service role server-side.
    admin.from("tasks").select("id, title, task_type, due_date, due_time")
      .in("task_type", ["visit", "transport"])
      .eq("status", "claimed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
  ]);

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-10">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold text-text-dark">Family Care</h1>
          <SignOutButton />
        </header>

        {/* ---------- Updates feed ---------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-text-dark">Updates</h2>
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
        </section>

        {/* ---------- Visits up for grabs ---------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-text-dark">Where you can help</h2>
          {(openVisits?.length ?? 0) === 0 ? (
            <p className="text-sm text-text-mid">
              No visits or transport needed right now — thanks for checking in.
            </p>
          ) : (
            <div className="space-y-2">
              {openVisits!.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge>{TYPE_LABEL[t.task_type]}</Badge>
                      <div className="font-medium text-text-dark mt-1.5">{t.title}</div>
                      {t.due_date && (
                        <div className="text-sm text-text-mid">
                          {formatRelativeDate(t.due_date)}
                          {t.due_time ? ` · ${formatTime(t.due_time)}` : ""}
                        </div>
                      )}
                    </div>
                    <ClaimButton taskId={t.id} label="I can help" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ---------- Already claimed ---------- */}
        {(myClaimed?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-text-dark">Claimed visits</h2>
            <div className="space-y-2">
              {myClaimed!.map((t) => (
                <Card key={t.id}>
                  <Badge tone="primary">{TYPE_LABEL[t.task_type]}</Badge>
                  <div className="font-medium text-text-dark mt-1.5">{t.title}</div>
                  {t.due_date && (
                    <div className="text-sm text-text-mid">
                      {formatRelativeDate(t.due_date)}
                      {t.due_time ? ` · ${formatTime(t.due_time)}` : ""}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
