"use client";

import { useTransition } from "react";
import { markTaskDoneAction, setTaskAssignees } from "@/app/actions/tasks";
import { Button } from "@/components/ui/Button";

export function MarkDoneButton({ taskId, done }: { taskId: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <form action={(fd) => startTransition(() => markTaskDoneAction(fd))} className="w-full">
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="next" value={done ? "incomplete" : "done"} />
      <Button type="submit" variant={done ? "outline" : "sage"} fullWidth disabled={pending}>
        {pending ? "…" : done ? "Mark as Incomplete" : "Mark as Complete"}
      </Button>
    </form>
  );
}

type Member = { id: string; preferred_name: string };

// Multi-select: check as many people as needed, including yourself
// alongside anyone already checked — this form always submits the full
// set, so adding one more name never drops the others.
export function AssigneesEditor({ taskId, members, currentIds }: {
  taskId: string;
  members: Member[];
  currentIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => startTransition(() => setTaskAssignees(fd))}
      className="space-y-2"
    >
      <input type="hidden" name="task_id" value={taskId} />
      <div className="flex flex-col gap-1.5">
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm font-semibold text-text-dark">
            <input
              type="checkbox"
              name="assigned_to"
              value={m.id}
              defaultChecked={currentIds.includes(m.id)}
              disabled={pending}
              className="accent-sage-500"
            />
            {m.preferred_name}
          </label>
        ))}
        {members.length === 0 && (
          <p className="text-xs text-text-mid">No one to assign yet.</p>
        )}
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
    </form>
  );
}
