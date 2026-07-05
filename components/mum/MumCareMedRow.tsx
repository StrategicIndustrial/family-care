"use client";

import { useTransition } from "react";
import { logMedicationByMum } from "@/app/actions/mum";
import { formatTime } from "@/lib/format";

type Props = {
  id: string;
  name: string;
  frequency?: string;
  loggedAt: string | null;
};

export function MumCareMedRow({ id, name, frequency, loggedAt }: Props) {
  const [pending, startTransition] = useTransition();
  const confirmed = !!loggedAt;

  function handleLog() {
    if (confirmed) return;
    startTransition(async () => {
      try { await logMedicationByMum(id); } catch { /* no-op */ }
    });
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 ${confirmed ? "bg-sage-50" : "bg-peach-100"} ${pending ? "opacity-60" : ""}`}>
      <div className="text-xl" aria-hidden="true">💊</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-extrabold text-text-dark">{name}</div>
        {confirmed ? (
          <div className="text-xs text-sage-600">Taken at {formatTime(toTimeString(loggedAt!))}</div>
        ) : (
          <div className="text-xs text-peach-600">{frequency ?? ""}</div>
        )}
      </div>
      <button
        type="button"
        disabled={confirmed || pending}
        onClick={handleLog}
        aria-label={confirmed ? "Taken" : "Mark as taken"}
        className={`w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
          ${confirmed ? "bg-sage-50 border-sage-500" : "bg-white border-sage-100"}`}
      >
        {confirmed && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#5da882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </div>
  );
}

function toTimeString(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}
