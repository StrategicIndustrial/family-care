import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { updateAppointmentNotes } from "@/app/actions/appointments";
import { formatRelativeDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AppointmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = getSupabaseServiceClient();

  const { data: appt } = await admin
    .from("appointments")
    .select("id, title, appointment_date, appointment_time, location, specialist, notes_before, notes_after")
    .eq("id", id)
    .single();

  if (!appt) notFound();

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/family/appointments" className="text-sm text-primary">← Back</Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-text-dark">{appt.title}</h1>
          <p className="text-text-mid">
            {formatRelativeDate(appt.appointment_date)}
            {appt.appointment_time ? ` · ${formatTime(appt.appointment_time)}` : ""}
          </p>
          {appt.specialist && <p className="text-text-mid">{appt.specialist}</p>}
          {appt.location && <p className="text-text-mid">{appt.location}</p>}
        </header>

        <form action={updateAppointmentNotes} className="space-y-4">
          <input type="hidden" name="id" value={appt.id} />

          <NotesField
            name="notes_before"
            label="Before — questions to raise"
            defaultValue={appt.notes_before ?? ""}
          />
          <NotesField
            name="notes_after"
            label="After — what was decided"
            defaultValue={appt.notes_after ?? ""}
          />

          <button type="submit" className="rounded-lg bg-primary text-white px-4 py-3 font-medium">
            Save notes
          </button>
        </form>
      </div>
    </main>
  );
}

function NotesField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">{label}</label>
      <textarea
        id={name}
        name={name}
        rows={4}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
      />
    </div>
  );
}
