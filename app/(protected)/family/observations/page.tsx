import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import { ObservationComposer } from "@/components/family/ObservationComposer";
import { Badge } from "@/components/ui/Badge";
import { clsx } from "@/lib/cx";
import type { ObservationType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Scope = "all" | "mine";
type TimeRange = "30d" | "90d" | "all";

const TYPE_META: Record<ObservationType, { label: string; icon: string; tone: "sage" | "peach" | "lavender" }> = {
  behaviour: { label: "Behaviour", icon: "🧠", tone: "lavender" },
  symptom:   { label: "Symptom",   icon: "🌡️", tone: "peach" },
  mood:      { label: "Mood",      icon: "😊", tone: "sage" },
};

const SCOPE_LABELS: { key: Scope; label: string }[] = [
  { key: "all",  label: "Everyone" },
  { key: "mine", label: "My entries" },
];

const TIME_LABELS: { key: TimeRange; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

function timeRangeCutoff(range: TimeRange): string | null {
  if (range === "all") return null;
  const days = range === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default async function ObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: Scope; range?: TimeRange }>;
}) {
  const ctx = await requireRole("primary_carer", "family");
  const { scope = "all", range = "30d" } = await searchParams;

  const admin = getSupabaseServiceClient();
  let q = admin
    .from("observations")
    .select("id, type, body, author_id, visibility, created_at, author:profiles!observations_author_id_fkey(preferred_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (scope === "mine") q = q.eq("author_id", ctx.userId);
  const cutoff = timeRangeCutoff(range);
  if (cutoff) q = q.gte("created_at", cutoff);

  const { data: observations, error } = await q;

  const homeHref = ctx.role === "primary_carer" ? "/dad" : "/family";

  return (
    <main className="flex-1 pb-28 anim-fade-in">
      <header className="hdr-lavender-strong px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-extrabold text-white">Observations</h1>
          <p className="text-sm text-white/85 mt-1">Day-to-day carer log</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        <ObservationComposer />

        <div className="flex flex-col gap-3">
          <nav className="flex gap-2 flex-wrap" aria-label="Scope filter">
            {SCOPE_LABELS.map(({ key, label }) => (
              <a
                key={key}
                href={`/family/observations?scope=${key}&range=${range}`}
                className={clsx(
                  "rounded-full px-4 py-1.5 text-xs font-extrabold transition-all",
                  scope === key ? "cta-lavender text-white" : "bg-white text-text-mid shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
                )}
              >
                {label}
              </a>
            ))}
          </nav>

          <nav className="flex gap-2 flex-wrap" aria-label="Time filter">
            {TIME_LABELS.map(({ key, label }) => (
              <a
                key={key}
                href={`/family/observations?scope=${scope}&range=${key}`}
                className={clsx(
                  "rounded-full px-4 py-1.5 text-xs font-extrabold transition-all",
                  range === key ? "bg-text-dark text-white" : "bg-white text-text-mid shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
                )}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        {error ? (
          <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-red-500 font-semibold">Failed to load observations.</p>
            <p className="text-xs text-text-mid mt-1">{error.message}</p>
          </div>
        ) : (observations?.length ?? 0) === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm font-bold text-text-dark">No observations yet</p>
            <p className="text-xs text-text-mid mt-1">
              {scope === "mine" ? "You haven't logged anything in this period." : "Nothing logged in this time period."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {observations!.map((obs) => {
              const meta = TYPE_META[obs.type];
              const authorName = obs.author?.preferred_name ?? "Someone";
              return (
                <div key={obs.id} className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={meta.tone}>{meta.icon} {meta.label}</Badge>
                    <span className="text-xs text-text-mid font-semibold shrink-0">
                      {formatRelativeTime(obs.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-text-dark leading-relaxed">{obs.body}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-mid">{authorName}</span>
                    {obs.visibility !== "everyone" && (
                      <span className="text-[10px] text-text-mid/70 font-bold uppercase tracking-wide">
                        {obs.visibility === "family_only" ? "Family only" : "Private"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
