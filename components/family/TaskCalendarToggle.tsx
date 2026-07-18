"use client";

import { useState, useTransition } from "react";
import { setTaskPushToCalendar } from "@/app/actions/tasks";

export function TaskCalendarToggle({ taskId, initial }: { taskId: string; initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    const fd = new FormData();
    fd.set("task_id", taskId);
    fd.set("enabled", String(next));
    startTransition(() => setTaskPushToCalendar(fd));
  }

  return (
    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-text-dark cursor-pointer">
      <span>Send to assignee&apos;s calendar</span>
      <input type="checkbox" checked={enabled} disabled={pending} onChange={toggle} className="accent-sage-500" />
    </label>
  );
}
