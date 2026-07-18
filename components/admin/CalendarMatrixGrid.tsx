"use client";

import { useState, useTransition } from "react";
import { updateRoleDefault } from "@/app/actions/calendar-prefs";
import type { ApptType, UserRole } from "@/lib/supabase/types";

const ROLES: UserRole[] = ["primary_carer", "family", "extended", "patient"];
const APPT_TYPES: ApptType[] = ["gp", "specialist", "scan_test", "other"];

const ROLE_LABELS: Record<UserRole, string> = {
  primary_carer: "Significant Other",
  family: "Family",
  extended: "Extended Family",
  patient: "Person in Care",
};
const APPT_TYPE_LABELS: Record<ApptType, string> = {
  gp: "GP",
  specialist: "Specialist",
  scan_test: "Scan/Test",
  other: "Other",
};

export function CalendarMatrixGrid({ initial }: { initial: Record<string, boolean> }) {
  const [state, setState] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle(role: UserRole, apptType: ApptType) {
    const key = `${role}:${apptType}`;
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next }));
    startTransition(() => updateRoleDefault(role, apptType, next));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className="text-left p-3 font-medium text-text-mid">Role</th>
            {APPT_TYPES.map((t) => (
              <th key={t} className="p-3 font-medium text-text-mid text-center">{APPT_TYPE_LABELS[t]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLES.map((role) => (
            <tr key={role} className="border-b border-line last:border-0">
              <td className="p-3 font-medium">{ROLE_LABELS[role]}</td>
              {APPT_TYPES.map((t) => {
                const key = `${role}:${t}`;
                return (
                  <td key={t} className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={state[key] ?? false}
                      onChange={() => toggle(role, t)}
                      className="accent-lavender-500"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
