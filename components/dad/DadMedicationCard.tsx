"use client";

import { useTransition } from "react";
import { logMedicationByDad } from "@/app/actions/dad";
import { MedicationCard } from "@/components/shared/MedicationCard";

type Props = {
  id: string;
  name: string;
  dosage: string;
  frequency?: string;
  loggedAt?: string | null;
};

export function DadMedicationCard({ id, name, dosage, frequency, loggedAt }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={pending ? "opacity-60" : undefined}>
      <MedicationCard
        name={name}
        dosage={dosage}
        frequency={frequency}
        loggedAt={loggedAt}
        onLog={() =>
          startTransition(async () => {
            try { await logMedicationByDad(id); } catch { /* keep state */ }
          })
        }
      />
    </div>
  );
}
