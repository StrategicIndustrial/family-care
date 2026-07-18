"use client";

import { useState, useTransition } from "react";
import { updateMyCalendarPref } from "@/app/actions/calendar-prefs";
import type { ApptType } from "@/lib/supabase/types";

const APPT_TYPE_LABELS: Record<ApptType, string> = {
  gp: "GP",
  specialist: "Specialist",
  scan_test: "Scan/Test",
  other: "Other",
};

export function CalendarTypeToggles({ initial }: { initial: Record<ApptType, boolean> }) {
  const [state, setState] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle(apptType: ApptType) {
    const next = !state[apptType];
    setState((s) => ({ ...s, [apptType]: next }));
    startTransition(() => updateMyCalendarPref(apptType, next));
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(APPT_TYPE_LABELS) as ApptType[]).map((type) => (
        <label
          key={type}
          className="flex items-center gap-2 rounded-xl border-2 border-line px-3 py-2 text-sm font-semibold text-text-dark cursor-pointer"
        >
          <input
            type="checkbox"
            checked={state[type]}
            onChange={() => toggle(type)}
            className="accent-lavender-500"
          />
          {APPT_TYPE_LABELS[type]}
        </label>
      ))}
    </div>
  );
}
