import Link from "next/link";
import { createAppointment } from "@/app/actions/appointments";

export const dynamic = "force-dynamic";

export default function NewAppointment() {
  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-dark">New appointment</h1>
          <Link href="/family/appointments" className="text-sm text-text-mid underline">Cancel</Link>
        </header>

        <form action={createAppointment} className="space-y-4">
          <Field name="title" label="Title" required placeholder="Memory Clinic — Dr Nguyen" />
          <div className="grid grid-cols-2 gap-3">
            <Field name="appointment_date" label="Date" type="date" required />
            <Field name="appointment_time" label="Time" type="time" />
          </div>
          <Field name="specialist" label="Specialist" />
          <Field name="location" label="Location" />
          <div>
            <label className="block text-sm font-medium mb-1">Questions to raise</label>
            <textarea
              name="notes_before"
              rows={4}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
            />
          </div>
          <button type="submit" className="rounded-lg bg-primary text-white px-4 py-3 font-medium w-full">
            Create appointment
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  name, label, type = "text", required, placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-warning"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
      />
    </div>
  );
}
