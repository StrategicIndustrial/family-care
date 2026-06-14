"use client";

import { useState, useTransition } from "react";
import { submitMumCheckin } from "@/app/actions/mum";
import type { Mood } from "@/lib/supabase/types";

type Props = {
  preferredName: string;
};

const OPTIONS: { mood: Mood; emoji: string; label: string }[] = [
  { mood: "great",     emoji: "😊", label: "Great" },
  { mood: "okay",      emoji: "🙂", label: "Okay" },
  { mood: "not_great", emoji: "😔", label: "Not great" },
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
        // Stay on the buttons — user can tap again.
      }
    });
  }

  if (submitted) {
    return (
      <p className="text-center text-2xl text-text-dark">
        Thank you, {preferredName} 💙
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {OPTIONS.map(({ mood, emoji, label }) => (
        <button
          key={mood}
          type="button"
          disabled={pending}
          onClick={() => handleTap(mood)}
          className="rounded-2xl bg-white border-2 border-line min-h-20
                     text-xl font-medium text-text-dark
                     hover:border-primary disabled:opacity-60
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                     flex items-center justify-center gap-3"
        >
          <span aria-hidden="true" className="text-3xl">{emoji}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
