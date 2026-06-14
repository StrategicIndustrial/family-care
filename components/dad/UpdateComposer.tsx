"use client";

import { useState, useTransition } from "react";
import { postFamilyUpdate } from "@/app/actions/dad";
import { Button } from "@/components/ui/Button";

// Phase 1 composer. The AI "Polish this ✨" button lands in Step 13 — we'll
// add a new client component then that wraps this one's textarea.
export function UpdateComposer() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="primary" fullWidth onClick={() => setOpen(true)}>
        📢 Let the family know something
      </Button>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        await postFamilyUpdate(body, flagged);
        setBody("");
        setFlagged(false);
        setOpen(false);
      } catch {
        // Stay open so Dad can retry.
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-line bg-white p-4">
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={pending}
        placeholder="What's happening?"
        rows={4}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base
                   focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                   disabled:opacity-60"
      />
      <label className="flex items-center gap-2 text-sm text-text-dark">
        <input
          type="checkbox"
          checked={flagged}
          disabled={pending}
          onChange={(e) => setFlagged(e.target.checked)}
        />
        This is urgent
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={pending || !body.trim()}>
          {pending ? "Posting…" : "Post update"}
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => { setOpen(false); setBody(""); setFlagged(false); }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
