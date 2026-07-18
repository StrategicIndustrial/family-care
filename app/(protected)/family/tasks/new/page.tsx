import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth-helpers";
import { createTask } from "@/app/actions/tasks";
import { TimeField } from "@/components/ui/TimeField";

export const dynamic = "force-dynamic";

const VISIBILITY_OPTIONS = [
  { value: "everyone",     icon: "👨‍👩‍👧",     label: "Everyone",         desc: "Visible to all, including Leanne" },
  { value: "family_only",  icon: "👨‍👩‍👧‍👦", label: "Family only",       desc: "Hidden from Leanne (Person in Care)" },
  { value: "private",      icon: "🔒",         label: "Private",           desc: "Only visible to you" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low",    colour: "#5da882" },
  { value: "medium", label: "Medium", colour: "#e8956a" },
  { value: "high",   label: "High",   colour: "#e07070" },
] as const;

export default async function NewTaskPage() {
  await requireSession();
  const admin = getSupabaseServiceClient();
  const { data: members } = await admin
    .from("profiles")
    .select("id, preferred_name, role")
    .order("preferred_name", { ascending: true });

  return (
    <main className="flex-1 pb-16 anim-fade-in">
      <header className="hdr-sage px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-white">New Task</h1>
          <Link href="/family/tasks" className="text-xs font-bold text-white/85 hover:text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full">
            Cancel
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-5">
        <form action={createTask} className="space-y-5">
          <Field name="title" label="Task Title" required placeholder="e.g. Pick up prescription" />
          <TextArea name="description" label="Notes" placeholder="Any other info?" />

          <div>
            <label className="block text-sm font-bold text-sage-text mb-2">Type *</label>
            <select
              name="task_type"
              required
              defaultValue="visit"
              className="w-full rounded-2xl border-2 border-sage-100 bg-white px-4 py-3 text-base font-semibold text-text-dark focus:outline-none focus:border-sage-500"
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

          <label className="flex items-center gap-2 text-sm font-semibold text-text-dark">
            <input type="checkbox" name="push_to_calendar" className="accent-sage-500" />
            Send to the assignee's calendar (if they've connected Google or Apple)
          </label>

          <div>
            <label className="block text-sm font-bold text-sage-text mb-2">Assign To</label>
            <select
              name="assigned_to"
              defaultValue=""
              className="w-full rounded-2xl border-2 border-sage-100 bg-white px-4 py-3 text-base font-semibold text-text-dark focus:outline-none focus:border-sage-500"
            >
              <option value="">Leave unassigned</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.preferred_name} ({roleLabel(m.role)})
                </option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <fieldset>
            <legend className="block text-sm font-bold text-sage-text mb-2">Visibility</legend>
            <div className="flex flex-col gap-2">
              {VISIBILITY_OPTIONS.map((v, i) => (
                <label
                  key={v.value}
                  className="flex items-center gap-3 rounded-2xl border-2 border-line bg-white px-4 py-3 cursor-pointer has-[:checked]:border-sage-500 has-[:checked]:bg-sage-50"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={v.value}
                    defaultChecked={i === 1}
                    className="sr-only peer"
                  />
                  <span className="text-lg" aria-hidden="true">{v.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-text-dark">{v.label}</div>
                    <div className="text-xs text-text-mid">{v.desc}</div>
                  </div>
                  <span className="h-5 w-5 rounded-full border-2 border-line peer-checked:border-sage-500 peer-checked:bg-sage-500 shrink-0" />
                </label>
              ))}
            </div>
          </fieldset>

          {/* Priority */}
          <fieldset>
            <legend className="block text-sm font-bold text-sage-text mb-2">Priority</legend>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map((p, i) => (
                <label
                  key={p.value}
                  className="flex items-center justify-center rounded-2xl border-2 border-line bg-white py-3 text-sm font-extrabold cursor-pointer has-[:checked]:border-current"
                  style={{ color: p.colour }}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p.value}
                    defaultChecked={i === 1}
                    className="sr-only"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="rounded-2xl cta-sage text-white font-extrabold py-4 flex-1"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "patient": return "Person in Care";
    case "primary_carer": return "Significant Other";
    case "family": return "Family";
    case "extended": return "Extended";
    default: return role;
  }
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
      <label htmlFor={name} className="block text-sm font-bold text-sage-text mb-2">
        {label}{required && <span className="text-peach-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-sage-100 bg-white px-4 py-3 text-base font-semibold text-text-dark focus:outline-none focus:border-sage-500"
      />
    </div>
  );
}

function TextArea({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-sage-text mb-2">{label}</label>
      <textarea
        id={name}
        name={name}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-sage-100 bg-white px-4 py-3 text-base font-semibold text-text-dark focus:outline-none focus:border-sage-500 resize-none"
      />
    </div>
  );
}
