"use client";

import { useState, useTransition } from "react";
import { deactivateMedication } from "@/app/actions/medications";
import { MedicationForm } from "@/components/family/MedicationForm";
import type { Medication } from "@/lib/supabase/types";

export function MedicationList({ medications, canEdit = true }: { medications: Medication[]; canEdit?: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string, isActive: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("next", String(!isActive));
    startTransition(() => deactivateMedication(fd));
  }

  return (
    <div className="space-y-2">
      {medications.map((m) => {
        if (editingId === m.id) {
          return <MedicationForm key={m.id} existing={m} onDone={() => setEditingId(null)} />;
        }
        return (
          <div key={m.id} className={`rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${m.is_active ? "" : "opacity-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-extrabold text-text-dark">{m.name} <span className="text-sm font-semibold text-text-mid">{m.dosage}</span></div>
                <div className="text-xs text-text-mid mt-0.5">{m.frequency}</div>
                {m.prescriber && <div className="text-xs text-text-mid">{m.prescriber}</div>}
                {(m.reminder_times?.length ?? 0) > 0 && (
                  <div className="text-xs text-sage-600 font-semibold mt-1">Reminders: {m.reminder_times!.join(", ")}</div>
                )}
              </div>
              {canEdit && (
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button type="button" onClick={() => setEditingId(m.id)} className="text-xs font-bold text-sage-600">
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggle(m.id, m.is_active)}
                    className="text-xs font-bold text-text-mid disabled:opacity-50"
                  >
                    {m.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {medications.length === 0 && (
        <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-text-mid">No medications added yet.</p>
        </div>
      )}
    </div>
  );
}
