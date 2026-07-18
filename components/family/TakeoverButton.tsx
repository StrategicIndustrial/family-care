"use client";

import { useState, useTransition } from "react";
import { takeOverTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/Button";

export function TakeoverButton({
  taskId,
  attendingUserId,
  attendingName,
  currentUserId,
}: {
  taskId: string;
  attendingUserId: string | null;
  attendingName: string;
  currentUserId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!attendingUserId || attendingUserId === currentUserId) return null;

  function handleTakeover() {
    setError(null);
    startTransition(async () => {
      try {
        await takeOverTask(taskId);
        setConfirming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't complete the takeover — try again.");
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-mid flex-1">Take over from {attendingName}?</span>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => { setConfirming(false); setError(null); }}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={pending} onClick={handleTakeover}>
            {pending ? "…" : "Confirm"}
          </Button>
        </div>
        {error && <p className="text-xs text-peach-600 font-bold">{error}</p>}
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
      Take over from {attendingName}
    </Button>
  );
}
