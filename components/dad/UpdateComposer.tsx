"use client";

import { useState, useTransition } from "react";
import { postFamilyUpdate } from "@/app/actions/dad";
import { polishUpdate } from "@/app/actions/ai";
import { Button } from "@/components/ui/Button";

export function UpdateComposer() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [posting, startPosting] = useTransition();

  if (!open) {
    return (
      <Button variant="primary" fullWidth onClick={() => setOpen(true)}>
        📢 Let the family know something
      </Button>
    );
  }

  async function handlePolish() {
    if (!body.trim()) return;
    setPolishError(null);
    setPolishing(true);
    try {
      const result = await polishUpdate(body);
      setBody(result);
    } catch (err) {
      setPolishError(
        err instanceof Error ? err.message : "Couldn't polish — try again.",
      );
    } finally {
      setPolishing(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startPosting(async () => {
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

  const busy = polishing || posting;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-line bg-white p-4">
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={busy}
        placeholder="What's happening?"
        rows={4}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base
                   focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                   disabled:opacity-60"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-text-dark">
          <input
            type="checkbox"
            checked={flagged}
            disabled={busy}
            onChange={(e) => setFlagged(e.target.checked)}
          />
          This is urgent
        </label>

        <button
          type="button"
          onClick={handlePolish}
          disabled={busy || !body.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40
                     bg-primary-light text-primary px-3 py-1.5 text-sm font-medium
                     hover:bg-primary/10 disabled:opacity-60"
        >
          {polishing ? "Polishing…" : "Polish this ✨"}
        </button>
      </div>

      {polishError && (
        <p className="text-sm text-warning">{polishError}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={busy || !body.trim()}>
          {posting ? "Posting…" : "Post update"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setBody("");
            setFlagged(false);
            setPolishError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
