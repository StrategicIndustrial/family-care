import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { AppointmentRow } from "@/components/shared/AppointmentRow";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/cx";

export const dynamic = "force-dynamic";

export default async function FamilyAppointments({
  searchParams,
}: {
  searchParams: Promise<{ history?: string }>;
}) {
  const { history } = await searchParams;
  const showHistory = history === "1";
  const today = isoLocalDate(new Date());

  const admin = getSupabaseServiceClient();
  const { data: appts } = await admin
    .from("appointments")
    .select("id, title, appointment_date, appointment_time, specialist, location")
    [showHistory ? "lt" : "gte"]("appointment_date", today)
    .order("appointment_date", { ascending: !showHistory });

  return (
    <main className="flex-1 pb-24 anim-fade-in">
      <header className="hdr-peach px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Appointments</h1>
            <p className="text-sm text-white/85 mt-1">Scheduled and past</p>
          </div>
          <Link href="/family/appointments/new">
            <Button variant="lavender" size="sm">+ New</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        <nav className="flex gap-2" aria-label="Filter">
          <Link
            href="/family/appointments"
            className={clsx(
              "rounded-full px-4 py-1.5 text-xs font-extrabold",
              !showHistory ? "cta-peach text-white" : "bg-white text-text-mid",
            )}
          >
            Upcoming
          </Link>
          <Link
            href="/family/appointments?history=1"
            className={clsx(
              "rounded-full px-4 py-1.5 text-xs font-extrabold",
              showHistory ? "cta-peach text-white" : "bg-white text-text-mid",
            )}
          >
            History
          </Link>
        </nav>

        <div className="space-y-2">
          {(appts?.length ?? 0) === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-text-mid">
                {showHistory ? "No past appointments." : "No appointments scheduled."}
              </p>
            </div>
          ) : (
            appts!.map((a) => (
              <Link key={a.id} href={`/family/appointments/${a.id}`} className="block">
                <AppointmentRow
                  title={a.title}
                  date={a.appointment_date}
                  time={a.appointment_time}
                  specialist={a.specialist}
                  location={a.location}
                />
              </Link>
            ))
          )}
        </div>
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
