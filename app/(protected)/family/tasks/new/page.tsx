import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { createTask } from "@/app/actions/tasks";
import { TimeField } from "@/components/ui/TimeField";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const admin = getSupabaseServiceClient();
  // Only family + primary_carer can be assignees in practice; show all so the
  // creator can also pick "extended" siblings as planned visitors.
  const { data: members } = await admin
    .from("profiles")
    .select("id, preferred_name, role")
    .order("preferred_name", { ascending: true });

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-dark">New task</h1>
          <Link href="/family/tasks" className="text-sm text-text-mid underline">Cancel</Link>
        </header>

        <form action={createTask} className="space-y-4">
          <Field name="title"      label="Title"       required placeholder="Visit Mum"  />
          <TextArea name="description" label="Notes (optional)" />

          <div>
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select
              name="task_type"
              required
              defaultValue="visit"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
            >
              <option value="visit">🚶 Visit</option>
              <option value="shopping">🛒 Shopping</option>
              <option value="transport">🚗 Transport</option>
              <option value="appointment">📅 Appointment</option>
              <option value="other">✦ Other</option>
            </select>
          </div>

          <Field name="due_date" label="Date" type="date" />
          <TimeField name="due_time" label="Time" />

          <div>
            <label className="block text-sm font-medium mb-1">Assign to</label>
            <select
              name="assigned_to"
              defaultValue=""
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
            >
              <option value="">Leave unassigned</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.preferred_name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-primary text-white px-4 py-3 font-medium flex-1"
            >
              Create task
            </button>
          </div>
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

function TextArea({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">{label}</label>
      <textarea
        id={name}
        name={name}
        rows={3}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
      />
    </div>
  );
}
