"use client";

import { useTransition } from "react";
import { markTaskDoneAction, reassignTask } from "@/app/actions/tasks";
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

export function ReassignSelect({ taskId, members, currentId }: {
  taskId: string;
  members: Member[];
  currentId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => startTransition(() => reassignTask(fd))}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="task_id" value={taskId} />
      <select
        name="assigned_to"
        defaultValue={currentId ?? ""}
        disabled={pending}
        className="flex-1 rounded-xl border-2 border-line bg-white px-3 py-2 text-sm font-semibold"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.preferred_name}</option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
    </form>
  );
}
