"use client";

import { useState, useTransition } from "react";
import { createObservation } from "@/app/actions/observations";
import { Button } from "@/components/ui/Button";
import type { ObservationType } from "@/lib/supabase/types";

const TYPES: { value: ObservationType; label: string; icon: string }[] = [
  { value: "behaviour", label: "Behaviour", icon: "🧠" },
  { value: "symptom",   label: "Symptom",   icon: "🌡️" },
  { value: "mood",      label: "Mood",      icon: "😊" },
];

const VISIBILITY_OPTIONS: { value: "everyone" | "family_only" | "private"; label: string }[] = [
  { value: "everyone",    label: "Everyone" },
  { value: "family_only", label: "Family only" },
  { value: "private",     label: "Just me" },
];

export function ObservationComposer() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ObservationType>("behaviour");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"everyone" | "family_only" | "private">("everyone");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setType("behaviour");
    setBody("");
    setVisibility("everyone");
    setError(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="primary" fullWidth onClick={() => setOpen(true)}>
        + Log an observation
      </Button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createObservation(type, body, visibility);
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-white p-4 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
    >
      <h3 className="font-extrabold text-text-dark text-sm">Log an observation</h3>

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-2">Type</label>
        <div className="flex gap-2">
          {TYPES.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              onClick={() => setType(value)}
              className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-bold border-2 transition-all ${
                type === value ? "border-sage-500 bg-sage-50 text-sage-700" : "border-line bg-white text-text-mid"
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-2">Notes</label>
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={pending}
          placeholder="Describe what you observed…"
          rows={4}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base
                     focus:border-sage-500 focus:outline-none
                     disabled:opacity-60 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-2">Visible to</label>
        <div className="flex gap-2">
          {VISIBILITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              onClick={() => setVisibility(value)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold border-2 transition-all ${
                visibility === value ? "border-sage-500 bg-sage-50 text-sage-700" : "border-line bg-white text-text-mid"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending || !body.trim()} className="flex-1">
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={reset}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
