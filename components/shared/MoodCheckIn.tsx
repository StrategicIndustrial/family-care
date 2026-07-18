"use client";

import { useState, useTransition } from "react";
import { submitCheckin } from "@/app/actions/checkins";
import type { Mood } from "@/lib/supabase/types";
import type { CheckinPeriod } from "@/lib/checkin-window";

type Props = { preferredName: string; period: CheckinPeriod };

const OPTIONS: { mood: Mood; emoji: string; label: string; bg: string }[] = [
  { mood: "great",     emoji: "😊", label: "Great",     bg: "#e8f5e9" },
  { mood: "okay",      emoji: "🙂", label: "Okay",      bg: "#fdf6f0" },
  { mood: "not_great", emoji: "😔", label: "Not great", bg: "#fde8e0" },
];

// Shown on the home feed only during its window and only until filled
// out — the parent Server Component decides whether to render this at
// all; once submitted it just disappears until the next window.
export function MoodCheckIn({ preferredName, period }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleTap(mood: Mood) {
    startTransition(async () => {
      try {
        await submitCheckin(mood, period);
        setSubmitted(true);
      } catch {
        /* stay on the buttons */
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        <p className="text-base text-text-dark font-extrabold">Thanks, {preferredName} 💙</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-extrabold text-text-dark px-1">
        {period === "morning" ? "How are you feeling this morning?" : "How are you feeling this evening?"}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ mood, emoji, label, bg }) => (
          <button
            key={mood}
            type="button"
            disabled={pending}
            onClick={() => handleTap(mood)}
            className="rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] min-h-20
                       flex flex-col items-center justify-center gap-1
                       text-xs font-extrabold text-text-dark
                       hover:brightness-95 disabled:opacity-60 transition-all"
            style={{ background: bg }}
          >
            <span aria-hidden="true" className="text-2xl">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
