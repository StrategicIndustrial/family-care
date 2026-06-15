"use client";

import { useState } from "react";
import { clsx } from "@/lib/cx";

// Native <input type="time"> + a row of common quick-pick chips so people
// don't have to fight the platform picker for typical times of day.

type Props = {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
};

const PRESETS: { label: string; value: string }[] = [
  { label: "9:00",  value: "09:00" },
  { label: "12:00", value: "12:00" },
  { label: "15:00", value: "15:00" },
  { label: "18:00", value: "18:00" },
];

export function TimeField({ name, label, required, defaultValue = "" }: Props) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-warning"> *</span>}
        {!required && <span className="text-text-mid font-normal"> (optional)</span>}
      </label>

      <div className="flex flex-wrap gap-2 mb-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setValue(p.value)}
            className={clsx(
              "rounded-full px-3 py-1 text-sm border",
              value === p.value
                ? "bg-primary text-white border-primary"
                : "bg-white text-text-mid border-line hover:text-text-dark",
            )}
          >
            {p.label}
          </button>
        ))}
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="rounded-full px-3 py-1 text-sm text-text-mid border border-line"
          >
            Clear
          </button>
        )}
      </div>

      <input
        id={name}
        name={name}
        type="time"
        step="900"
        required={required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
      />
    </div>
  );
}
