import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import {
  updateAppointmentNotes,
  updateAppointmentFamilyNotes,
  updateAppointmentDetails,
} from "@/app/actions/appointments";
import { DeleteAppointmentButton } from "@/components/family/DeleteAppointmentButton";
import { requireSession } from "@/lib/auth-helpers";
import { formatRelativeDate, formatTime } from "@/lib/format";
import type { ApptType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const APPT_TYPE_OPTIONS: { value: ApptType; label: string }[] = [
  { value: "gp", label: "GP" },
  { value: "specialist", label: "Specialist" },
  { value: "scan_test", label: "Scan/Test" },
  { value: "other", label: "Other" },
];

export default async function AppointmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireSession();
  const isPatient = ctx.role === "patient";
  const admin = getSupabaseServiceClient();

  const { data: appt } = await admin
    .from("appointments")
    .select(`
      id, title, appointment_date, appointment_time, location, specialist, appt_type,
      notes_before, notes_after, family_notes_before, family_notes_after
    `)
    .eq("id", id)
    .single();

  if (!appt) notFound();

  const backHref = isPatient ? "/mum/tasks" : "/family/appointments";

  return (
    <main className="flex-1 pb-16 anim-fade-in">
      <header className="hdr-peach px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <Link href={backHref} className="inline-block text-xs font-bold text-white/85 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full mb-3">
            ← Back
          </Link>
          <h1 className="text-2xl font-extrabold text-white">{appt.title}</h1>
          <p className="text-sm text-white/85 mt-1">
            {formatRelativeDate(appt.appointment_date)}
            {appt.appointment_time ? ` · ${formatTime(appt.appointment_time)}` : ""}
          </p>
          {appt.specialist && <p className="text-sm text-white/85">{appt.specialist}</p>}
          {appt.location && <p className="text-sm text-white/85">{appt.location}</p>}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-5 space-y-4">
        {/* -------------------- Edit details -------------------- */}
        <details className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          <summary className="cursor-pointer px-4 py-3 select-none">
            <span className="text-sm font-extrabold text-text-dark">✏️ Edit details</span>
          </summary>
          <form action={updateAppointmentDetails} className="space-y-3 px-4 pb-4">
            <input type="hidden" name="id" value={appt.id} />
            <DetailField name="title" label="Title" defaultValue={appt.title} required />
            <div className="grid grid-cols-2 gap-2">
              <DetailField name="appointment_date" label="Date" type="date" defaultValue={appt.appointment_date} required />
              <DetailField name="appointment_time" label="Time" type="time" defaultValue={appt.appointment_time ?? ""} />
            </div>
            <DetailField name="specialist" label="Specialist" defaultValue={appt.specialist ?? ""} />
            <DetailField name="location" label="Location" defaultValue={appt.location ?? ""} />
            <div>
              <label htmlFor="appt_type" className="block text-xs font-bold text-text-mid mb-1">Type</label>
              <select
                id="appt_type"
                name="appt_type"
                defaultValue={appt.appt_type}
                className="w-full rounded-xl border-2 border-line bg-white px-3 py-2 text-sm font-semibold text-text-dark focus:outline-none focus:border-peach-500"
              >
                {APPT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Button type="submit" variant="peach" size="sm">Save changes</Button>
              <DeleteAppointmentButton appointmentId={appt.id} />
            </div>
          </form>
        </details>

        {/* -------------------- Open notes -------------------- */}
        <form action={updateAppointmentNotes} className="space-y-3 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          <input type="hidden" name="id" value={appt.id} />
          <div>
            <div className="text-sm font-extrabold text-text-dark">Notes</div>
            <div className="text-xs text-text-mid">Visible to everyone, including Leanne</div>
          </div>
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
          <Button type="submit" variant="peach" size="sm">Save notes</Button>
        </form>

        {/* -------------------- Family-only notes -------------------- */}
        {!isPatient && (
          <details className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]" open>
            <summary className="cursor-pointer px-4 py-3 select-none">
              <span className="text-sm font-extrabold text-text-dark">🔒 Family-only notes</span>
              <span className="block text-xs text-text-mid mt-0.5">Hidden from Leanne (Person in Care)</span>
            </summary>
            <form action={updateAppointmentFamilyNotes} className="space-y-3 px-4 pb-4">
              <input type="hidden" name="id" value={appt.id} />
              <NotesField
                name="family_notes_before"
                label="Before — private context"
                defaultValue={appt.family_notes_before ?? ""}
              />
              <NotesField
                name="family_notes_after"
                label="After — private context"
                defaultValue={appt.family_notes_after ?? ""}
              />
              <Button type="submit" variant="outline" size="sm">Save family notes</Button>
            </form>
          </details>
        )}
      </div>
    </main>
  );
}

function DetailField({
  name, label, type = "text", defaultValue, required,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-bold text-text-mid mb-1">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border-2 border-line bg-white px-3 py-2 text-sm font-semibold text-text-dark focus:outline-none focus:border-peach-500"
      />
    </div>
  );
}

function NotesField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-bold text-text-mid mb-1">{label}</label>
      <textarea
        id={name}
        name={name}
        rows={3}
        defaultValue={defaultValue}
        className="w-full rounded-xl border-2 border-line bg-white px-3 py-2 text-sm font-semibold text-text-dark focus:outline-none focus:border-peach-500"
      />
    </div>
  );
}
