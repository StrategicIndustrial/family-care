"use client";

import { useTransition } from "react";
import { claimTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/Button";

export function ClaimButton({ taskId, label = "Claim it" }: { taskId: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => startTransition(() => claimTask(fd))}
    >
      <input type="hidden" name="task_id" value={taskId} />
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "…" : label}
      </Button>
    </form>
  );
}
