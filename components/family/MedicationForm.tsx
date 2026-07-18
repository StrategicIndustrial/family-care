"use client";

import { useState, useTransition } from "react";
import { createMedication, updateMedication } from "@/app/actions/medications";
import { Button } from "@/components/ui/Button";
import type { Medication } from "@/lib/supabase/types";

type Props = { existing?: Medication; onDone?: () => void };

export function MedicationForm({ existing, onDone }: Props) {
  const [open, setOpen] = useState(!!existing);
  const [name, setName] = useState(existing?.name ?? "");
  const [dosage, setDosage] = useState(existing?.dosage ?? "");
  const [frequency, setFrequency] = useState(existing?.frequency ?? "");
  const [prescriber, setPrescriber] = useState(existing?.prescriber ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [times, setTimes] = useState<string[]>(existing?.reminder_times?.length ? existing.reminder_times : [""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName(""); setDosage(""); setFrequency(""); setPrescriber(""); setNotes(""); setTimes([""]);
    setError(null); setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="sage" fullWidth onClick={() => setOpen(true)}>
        + Add a medication
      </Button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || !frequency.trim()) return;
    setError(null);

    const fd = new FormData();
    if (existing) fd.set("id", existing.id);
    fd.set("name", name.trim());
    fd.set("dosage", dosage.trim());
    fd.set("frequency", frequency.trim());
    fd.set("prescriber", prescriber.trim());
    fd.set("notes", notes.trim());
    fd.set("reminder_times", times.filter(Boolean).join(","));

    startTransition(async () => {
      try {
        if (existing) {
          await updateMedication(fd);
        } else {
          await createMedication(fd);
        }
        if (existing) {
          onDone?.();
        } else {
          reset();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
      <h3 className="font-extrabold text-text-dark text-sm">{existing ? "Edit medication" : "Add a medication"}</h3>

      <Field label="Name" value={name} onChange={setName} disabled={pending} required placeholder="Donepezil" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Dosage" value={dosage} onChange={setDosage} disabled={pending} required placeholder="10mg" />
        <Field label="Frequency" value={frequency} onChange={setFrequency} disabled={pending} required placeholder="Once daily" />
      </div>
      <Field label="Prescriber" value={prescriber} onChange={setPrescriber} disabled={pending} placeholder="Dr Nguyen" />

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={pending}
          rows={2}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-sage-500 focus:outline-none disabled:opacity-60 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-1">
          Reminder times <span className="font-normal normal-case">(pushes to your calendar if connected)</span>
        </label>
        {times.map((t, i) => (
          <div key={i} className="flex items-center gap-2 mt-1">
            <input
              type="time"
              value={t}
              disabled={pending}
              onChange={(e) => setTimes((arr) => arr.map((v, idx) => (idx === i ? e.target.value : v)))}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-sage-500 focus:outline-none disabled:opacity-60"
            />
            {times.length > 1 && (
              <button type="button" disabled={pending} onClick={() => setTimes((arr) => arr.filter((_, idx) => idx !== i))} className="text-text-mid hover:text-red-500">
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() => setTimes((arr) => [...arr, ""])}
          className="text-xs font-bold text-sage-600 mt-1.5"
        >
          + Add another time
        </button>
      </div>

      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="sage" disabled={pending} className="flex-1">
          {pending ? "Saving…" : existing ? "Save changes" : "Add medication"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => (existing ? onDone?.() : reset())}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, disabled, required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-sage-500 focus:outline-none disabled:opacity-60"
      />
    </div>
  );
}
