import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import { formatShortDate, formatTime } from "@/lib/format";
import { clsx } from "@/lib/cx";

export const dynamic = "force-dynamic";

type TimeRange = "30d" | "90d" | "all";

const TIME_LABELS: { key: TimeRange; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

function cutoffDate(range: TimeRange): string | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - (range === "30d" ? 30 : 90));
  return d.toISOString();
}

export default async function MedicationHistory({
  searchParams,
}: {
  searchParams: Promise<{ range?: TimeRange }>;
}) {
  // Adherence history is for secondary users checking on the patient's
  // behalf, not the patient herself (per the original request wording) —
  // primary_carer/family only, matching what allowedRolesForPath grants.
  await requireRole("primary_carer", "family");
  const { range = "30d" } = await searchParams;

  const admin = getSupabaseServiceClient();
  const cutoff = cutoffDate(range);

  let query = admin
    .from("medication_logs")
    .select("id, taken_at, notes, medication:medications(name, dosage), logger:profiles!medication_logs_logged_by_fkey(preferred_name)")
    .order("taken_at", { ascending: false });
  if (cutoff) query = query.gte("taken_at", cutoff);

  const { data: logs } = await query;

  return (
    <main className="flex-1 pb-28 anim-fade-in">
      <header className="px-6 pt-12 pb-8 rounded-b-3xl" style={{ background: "linear-gradient(135deg, #5da882 0%, #7b5ea7 100%)" }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/family/medical/medications" className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center shrink-0" aria-label="Back">
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M8 2L2 8l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold text-white">Medication History</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        <nav className="flex gap-2 flex-wrap" aria-label="Time filter">
          {TIME_LABELS.map(({ key, label }) => (
            <a
              key={key}
              href={`/family/medical/medications/history?range=${key}`}
              className={clsx(
                "rounded-full px-4 py-1.5 text-xs font-extrabold transition-all",
                range === key ? "bg-text-dark text-white" : "bg-white text-text-mid shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
              )}
            >
              {label}
            </a>
          ))}
        </nav>

        {(logs?.length ?? 0) === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <p className="text-2xl mb-2">💊</p>
            <p className="text-sm font-bold text-text-dark">No doses logged</p>
            <p className="text-xs text-text-mid mt-1">Nothing recorded in this time period.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs!.map((log) => (
              <div key={log.id} className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3">
                <div>
                  <div className="font-extrabold text-text-dark">
                    {log.medication?.name} <span className="text-sm font-semibold text-text-mid">{log.medication?.dosage}</span>
                  </div>
                  <div className="text-xs text-text-mid mt-0.5">
                    Logged by {log.logger?.preferred_name ?? "Someone"}
                  </div>
                  {log.notes && <div className="text-xs text-text-mid mt-0.5">{log.notes}</div>}
                </div>
                <div className="text-xs text-text-mid font-semibold text-right shrink-0">
                  {formatShortDate(log.taken_at.slice(0, 10))}
                  <br />
                  {formatTime(log.taken_at.slice(11, 19))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
