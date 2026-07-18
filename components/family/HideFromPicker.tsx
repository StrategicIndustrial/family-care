"use client";

import { useState, useTransition } from "react";
import { setTaskHiddenFrom } from "@/app/actions/tasks";

type Member = { id: string; preferred_name: string };

export function HideFromPicker({ taskId, members, initialHidden }: { taskId: string; members: Member[]; initialHidden: string[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [pending, startTransition] = useTransition();

  function toggle(userId: string) {
    const next = new Set(hidden);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setHidden(next);

    const fd = new FormData();
    fd.set("task_id", taskId);
    for (const id of next) fd.append("hidden_from", id);
    startTransition(() => setTaskHiddenFrom(fd));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const isHidden = hidden.has(m.id);
        return (
          <button
            key={m.id}
            type="button"
            disabled={pending}
            onClick={() => toggle(m.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold border-2 transition-all disabled:opacity-50 ${
              isHidden ? "border-red-300 bg-red-50 text-red-600" : "border-line bg-white text-text-mid"
            }`}
          >
            {isHidden ? "🚫 " : ""}{m.preferred_name}
          </button>
        );
      })}
    </div>
  );
}
