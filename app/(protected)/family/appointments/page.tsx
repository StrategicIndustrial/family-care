import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { AppointmentRow } from "@/components/shared/AppointmentRow";
import { Button } from "@/components/ui/Button";

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
    <main className="flex-1 px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold text-text-dark">Appointments</h1>
          <Link href="/family/appointments/new">
            <Button variant="primary">+ New</Button>
          </Link>
        </header>

        <div className="flex gap-3 text-sm">
          <Link
            href="/family/appointments"
            className={showHistory ? "text-text-mid underline" : "text-primary font-medium"}
          >
            Upcoming
          </Link>
          <Link
            href="/family/appointments?history=1"
            className={showHistory ? "text-primary font-medium" : "text-text-mid underline"}
          >
            History
          </Link>
        </div>

        <div className="space-y-2">
          {(appts?.length ?? 0) === 0 ? (
            <p className="text-sm text-text-mid">
              {showHistory ? "No past appointments." : "No appointments scheduled."}
            </p>
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
