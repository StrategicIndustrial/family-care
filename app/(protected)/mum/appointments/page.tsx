import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { formatRelativeDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MumAppointments() {
  const admin = getSupabaseServiceClient();
  const today = isoLocalDate(new Date());

  const { data: appointments } = await admin
    .from("appointments")
    .select("id, title, appointment_date, appointment_time, location, specialist")
    .gte("appointment_date", today)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true, nullsFirst: false });

  return (
    <main className="flex-1 bg-warm-bg pb-16 anim-fade-in">
      <header className="hdr-peach-soft px-6 pt-12 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Link
            href="/mum"
            className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center shrink-0"
            aria-label="Back"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M8 2L2 8l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold text-white">Appointments</h1>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-2.5">
        {(appointments?.length ?? 0) === 0 ? (
          <div className="rounded-2xl bg-white p-5 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <p className="text-base text-text-mid">No upcoming appointments.</p>
          </div>
        ) : (
          appointments!.map((a) => {
            const relDate = formatRelativeDate(a.appointment_date);
            const time = a.appointment_time ? formatTime(a.appointment_time) : null;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              >
                <div className="w-[38px] h-[38px] rounded-[11px] bg-peach-100 flex items-center justify-center text-base shrink-0" aria-hidden="true">
                  📅
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-extrabold text-text-dark">{a.title}</div>
                  <div className="text-xs text-text-mid">
                    {relDate}{time ? ` · ${time}` : ""}
                    {a.location ? ` · ${a.location}` : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

function isoLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
