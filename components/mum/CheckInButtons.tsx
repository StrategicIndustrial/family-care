"use client";

import { useState, useTransition } from "react";
import { submitMumCheckin } from "@/app/actions/mum";
import type { Mood } from "@/lib/supabase/types";

type Props = {
  preferredName: string;
};

const OPTIONS: { mood: Mood; emoji: string; label: string; bg: string }[] = [
  { mood: "great",     emoji: "😊", label: "Great",     bg: "#e8f5e9" },
  { mood: "okay",      emoji: "🙂", label: "Okay",      bg: "#fdf6f0" },
  { mood: "not_great", emoji: "😔", label: "Not great", bg: "#fde8e0" },
];

export function CheckInButtons({ preferredName }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleTap(mood: Mood) {
    startTransition(async () => {
      try {
        await submitMumCheckin(mood);
        setSubmitted(true);
      } catch {
        /* stay on the buttons */
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        <p className="text-lg text-text-dark font-extrabold">Thank you, {preferredName} 💙</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {OPTIONS.map(({ mood, emoji, label, bg }) => (
        <button
          key={mood}
          type="button"
          disabled={pending}
          onClick={() => handleTap(mood)}
          className="rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] min-h-24
                     flex flex-col items-center justify-center gap-1
                     text-sm font-extrabold text-text-dark
                     hover:brightness-95 disabled:opacity-60 transition-all"
          style={{ background: bg }}
        >
          <span aria-hidden="true" className="text-3xl">{emoji}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
