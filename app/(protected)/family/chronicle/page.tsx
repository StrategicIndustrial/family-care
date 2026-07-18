import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import { ChronicleComposer } from "@/components/family/ChronicleComposer";
import { ChronicleInsights } from "@/components/family/ChronicleInsights";
import { AttachmentButton } from "@/components/family/AttachmentButton";
import { clsx } from "@/lib/cx";
import { formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type EntryType = "note" | "observation" | "appointment";
type TimeRange = "30d" | "90d" | "all";
type TypeFilter = "all" | EntryType;

const NOTE_CATEGORY_LABELS: Record<string, string> = {
  gp_note: "GP Note",
  specialist: "Specialist",
  hospital: "Hospital",
  test_result: "Test Result",
  observation: "Observation",
  other: "Other",
};

const ENTRY_META: Record<EntryType, { icon: string; label: string; badgeClass: string }> = {
  note:        { icon: "📄", label: "Note",        badgeClass: "bg-lavender-100 text-lavender-600" },
  observation: { icon: "🔎", label: "Observation",  badgeClass: "bg-sage-50 text-sage-text" },
  appointment: { icon: "📅", label: "Appointment",  badgeClass: "bg-peach-100 text-peach-600" },
};

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "note",        label: "Notes" },
  { key: "observation", label: "Observations" },
  { key: "appointment", label: "Appointments" },
];

const TIME_LABELS: { key: TimeRange; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

function cutoffDate(range: TimeRange): string | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - (range === "30d" ? 30 : 90));
  return d.toISOString().slice(0, 10);
}

type ChronicleEntry = {
  id: string;
  type: EntryType;
  sortDate: string;
  title: string;
  subtitle?: string;
  body?: string;
  authorName?: string;
  category?: string;
  documentId?: string;
  documentName?: string;
};

export default async function ChroniclePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: TypeFilter; range?: TimeRange }>;
}) {
  await requireRole("primary_carer", "family");
  const { type: typeFilter = "all", range = "30d" } = await searchParams;

  const admin = getSupabaseServiceClient();
  const [notesR, obsR, apptR] = await Promise.all([
    admin
      .from("medical_notes")
      .select("id, category, date, body, document_id, created_at, author:profiles!medical_notes_author_id_fkey(preferred_name), document:documents(filename)")
      .order("date", { ascending: false }),
    admin
      .from("observations")
      .select("id, type, body, created_at, author:profiles!observations_author_id_fkey(preferred_name)")
      .order("created_at", { ascending: false }),
    admin
      .from("appointments")
      .select("id, title, appointment_date, specialist, location")
      .order("appointment_date", { ascending: false }),
  ]);

  const noteEntries: ChronicleEntry[] = (notesR.data ?? []).map((n) => ({
    id: n.id,
    type: "note",
    sortDate: n.date,
    title: NOTE_CATEGORY_LABELS[n.category] ?? n.category,
    body: n.body,
    authorName: n.author?.preferred_name,
    category: n.category,
    documentId: n.document_id ?? undefined,
    documentName: n.document?.filename ?? undefined,
  }));

  const obsEntries: ChronicleEntry[] = (obsR.data ?? []).map((o) => ({
    id: o.id,
    type: "observation",
    sortDate: o.created_at.slice(0, 10),
    title: o.type.charAt(0).toUpperCase() + o.type.slice(1),
    body: o.body,
    authorName: o.author?.preferred_name,
  }));

  const apptEntries: ChronicleEntry[] = (apptR.data ?? []).map((a) => ({
    id: a.id,
    type: "appointment",
    sortDate: a.appointment_date,
    title: a.title,
    subtitle: [a.specialist, a.location].filter(Boolean).join(" · ") || undefined,
  }));

  const merged = [...noteEntries, ...obsEntries, ...apptEntries].sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  const cutoff = cutoffDate(range);
  const filtered = merged.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (cutoff && e.sortDate < cutoff) return false;
    return true;
  });

  return (
    <main className="flex-1 pb-28 anim-fade-in">
      <header className="px-6 pt-12 pb-8 rounded-b-3xl" style={{ background: "linear-gradient(135deg, #5da882 0%, #7b5ea7 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-extrabold text-white">Chronicle</h1>
          <p className="text-sm text-white/85 mt-1">Clinical timeline</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        <ChronicleComposer />

        <div className="flex flex-col gap-3">
          <nav className="flex gap-2 flex-wrap" aria-label="Entry type filter">
            {TYPE_FILTERS.map(({ key, label }) => (
              <a
                key={key}
                href={`/family/chronicle?type=${key}&range=${range}`}
                className={clsx(
                  "rounded-full px-4 py-1.5 text-xs font-extrabold transition-all",
                  typeFilter === key ? "bg-text-dark text-white" : "bg-white text-text-mid shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
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
                href={`/family/chronicle?type=${typeFilter}&range=${key}`}
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

        <ChronicleInsights />

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <p className="text-2xl mb-2">📄</p>
            <p className="text-sm font-bold text-text-dark">No entries</p>
            <p className="text-xs text-text-mid mt-1">
              {typeFilter !== "all" ? `No ${typeFilter}s in this time period.` : "Nothing in the Chronicle for this period."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => {
              const meta = ENTRY_META[entry.type];
              return (
                <div key={`${entry.type}-${entry.id}`} className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", meta.badgeClass)}>
                      {meta.icon} {meta.label}
                      {entry.category ? ` · ${NOTE_CATEGORY_LABELS[entry.category] ?? entry.category}` : ""}
                    </span>
                    <span className="text-xs text-text-mid font-semibold shrink-0">{formatShortDate(entry.sortDate)}</span>
                  </div>
                  <p className="text-sm font-extrabold text-text-dark leading-snug">{entry.title}</p>
                  {entry.subtitle && <p className="text-xs text-text-mid">{entry.subtitle}</p>}
                  {entry.body && <p className="text-sm text-text-dark leading-relaxed">{entry.body}</p>}
                  {entry.authorName && <p className="text-xs text-text-mid">{entry.authorName}</p>}
                  {entry.documentId && (
                    <AttachmentButton documentId={entry.documentId} documentName={entry.documentName} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
