import Link from "next/link";
import { createAppointment } from "@/app/actions/appointments";
import { TimeField } from "@/components/ui/TimeField";
import type { ApptType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const APPT_TYPE_OPTIONS: { value: ApptType; label: string }[] = [
  { value: "gp", label: "GP" },
  { value: "specialist", label: "Specialist" },
  { value: "scan_test", label: "Scan/Test" },
  { value: "dental", label: "Dental" },
  { value: "allied_health", label: "Allied Health" },
  { value: "other", label: "Other" },
];

export default async function NewAppointment({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const defaultDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  return (
    <main className="flex-1 pb-16 anim-fade-in">
      <header className="hdr-peach px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-white">New Appointment</h1>
          <Link href="/family/appointments" className="text-xs font-bold text-white/85 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full">
            Cancel
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-5">
        <form action={createAppointment} className="space-y-5">
          <Field name="title" label="Appointment Title" required placeholder="e.g. GP Check-up" />
          <Field name="appointment_date" label="Date" type="date" required defaultValue={defaultDate} />
          <TimeField name="appointment_time" label="Time" />
          <Field name="specialist" label="Specialist" placeholder="Dr Nguyen" />
          <Field name="location" label="Location" placeholder="Hollywood Private Hospital" />
          <div>
            <label htmlFor="appt_type" className="block text-sm font-bold text-peach-text mb-2">Type</label>
            <select
              id="appt_type"
              name="appt_type"
              defaultValue="other"
              className="w-full rounded-2xl border-2 border-peach-200 bg-white px-4 py-3 text-base font-semibold text-text-dark focus:outline-none focus:border-peach-500"
            >
              {APPT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-peach-text mb-2">
              Questions to raise <span className="text-text-mid font-normal">(visible to everyone)</span>
            </label>
            <textarea
              name="notes_before"
              rows={4}
              className="w-full rounded-2xl border-2 border-peach-200 bg-white px-4 py-3 text-base font-semibold text-text-dark focus:outline-none focus:border-peach-500 resize-none"
            />
          </div>
          <button type="submit" className="w-full rounded-2xl cta-peach text-white font-extrabold py-4">
            Save
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  name, label, type = "text", required, placeholder, defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-peach-text mb-2">
        {label}{required && <span className="text-peach-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border-2 border-peach-200 bg-white px-4 py-3 text-base font-semibold text-text-dark focus:outline-none focus:border-peach-500"
      />
    </div>
  );
}
