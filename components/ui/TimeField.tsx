"use client";

import { useState } from "react";

// Half-hour scrolling picker with manual override.
//
// - <select> populated with 00:00 → 23:30 in 30-min increments. On iOS this
//   renders as the native wheel picker; on Android as a tall dropdown; on
//   desktop as a scrollable list. All of those are "scrolling pickers"
//   in the platform-native sense.
// - <input type="time"> below for arbitrary times — picks any value, syncs
//   with the dropdown when it lands on a half-hour.

type Props = {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
};

const HALF_HOUR_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const value = `${pad(h)}:${pad(m)}`;
      opts.push({ value, label: prettyTime(h, m) });
    }
  }
  return opts;
})();

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function prettyTime(h: number, m: number): string {
  const period = h < 12 ? "am" : "pm";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${pad(m)} ${period}`;
}

export function TimeField({ name, label, required, defaultValue = "" }: Props) {
  const [value, setValue] = useState(defaultValue);

  // For the <select>: collapse to "HH:MM" stripped to 5 chars so e.g. "09:30:00" matches.
  const selectValue = value.slice(0, 5);

  return (
    <div>
      <label htmlFor={`${name}-select`} className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-warning"> *</span>}
        {!required && <span className="text-text-mid font-normal"> (optional)</span>}
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-stretch">
        {/* Half-hour scrolling picker */}
        <select
          id={`${name}-select`}
          value={selectValue}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-base"
        >
          <option value="">— pick a time —</option>
          {HALF_HOUR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Manual override */}
        <input
          aria-label={`${label} (manual entry)`}
          type="time"
          value={selectValue}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-base w-32"
        />
      </div>

      <p className="text-xs text-text-mid mt-1">
        Pick a half-hour from the list, or type any time on the right.
      </p>

      {/* The actual form value the server action receives. */}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
