"use client";

import { useTransition } from "react";
import { logMedicationByMum } from "@/app/actions/mum";
import { MedicationCard } from "@/components/shared/MedicationCard";

type Props = {
  id: string;
  name: string;
  dosage: string;
  frequency?: string;
  loggedAt?: string | null;
};

export function MumMedicationCard({ id, name, dosage, frequency, loggedAt }: Props) {
  const [pending, startTransition] = useTransition();

  function handleLog() {
    startTransition(async () => {
      try {
        await logMedicationByMum(id);
      } catch {
        // No-op: the card stays in pending state, Mum can tap again.
      }
    });
  }

  return (
    <div className={pending ? "opacity-60" : undefined}>
      <MedicationCard
        name={name}
        dosage={dosage}
        frequency={frequency}
        loggedAt={loggedAt}
        onLog={handleLog}
        large
      />
    </div>
  );
}
