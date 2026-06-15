"use client";

import { useTransition } from "react";
import { markTaskDoneAction, reassignTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/Button";

export function MarkDoneButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form action={(fd) => startTransition(() => markTaskDoneAction(fd))}>
      <input type="hidden" name="task_id" value={taskId} />
      <Button type="submit" variant="success" disabled={pending}>
        {pending ? "…" : "Mark task complete"}
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
        className="rounded border border-line bg-white px-2 py-1.5 text-sm"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.preferred_name}</option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "…" : "Save & back"}
      </Button>
    </form>
  );
}
