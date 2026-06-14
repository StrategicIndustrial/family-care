"use client";

import { useTransition } from "react";
import { markTaskDone } from "@/app/actions/dad";
import { Button } from "@/components/ui/Button";

export function TaskDoneButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="success"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try { await markTaskDone(taskId); } catch { /* keep state */ }
        })
      }
    >
      Done ✓
    </Button>
  );
}
