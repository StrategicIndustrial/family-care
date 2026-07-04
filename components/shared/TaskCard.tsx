import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { formatRelativeDate, formatTime } from "@/lib/format";
import type { TaskKind, TaskStatus } from "@/lib/supabase/types";

type Props = {
  title: string;
  taskType: TaskKind;
  dueDate?: string | null;
  dueTime?: string | null;
  status: TaskStatus;
  assignedFor?: string | null;
  assignedFrom?: string | null;
  action?: ReactNode;
  onClick?: () => void;
  priorityColour?: string;                 // hex — right-side dot
};

const TYPE_LABEL: Record<TaskKind, string> = {
  visit:       "🚶 Visit",
  shopping:    "🛒 Shopping",
  transport:   "🚗 Transport",
  appointment: "📅 Appointment",
  other:       "✦ Task",
};

export function TaskCard({
  title, taskType, dueDate, dueTime, status,
  assignedFor, assignedFrom, action, onClick, priorityColour,
}: Props) {
  const due = dueDate
    ? `${formatRelativeDate(dueDate)}${dueTime ? ` · ${formatTime(dueTime)}` : ""}`
    : "No due date";
  const done = status === "done";

  return (
    <Card
      className={onClick ? "cursor-pointer hover:border-sage-100/60" : undefined}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Left check chip (visual only) */}
        <div
          className={[
            "shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center",
            done ? "bg-sage-500 border-sage-500" : "bg-transparent border-sage-100",
          ].join(" ")}
          aria-hidden="true"
        >
          {done && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-mid font-semibold mb-0.5">
            {TYPE_LABEL[taskType]}
          </div>
          <div
            className={[
              "font-bold text-[15px] text-text-dark",
              done ? "line-through text-text-mid" : "",
            ].join(" ")}
          >
            {title}
          </div>
          <div className="text-xs text-text-mid mt-0.5">
            {[
              assignedFor && `For: ${assignedFor}`,
              assignedFrom && `From: ${assignedFrom}`,
              due,
            ].filter(Boolean).join(" · ")}
          </div>
        </div>

        {priorityColour && (
          <div
            className="shrink-0 mt-2 h-2.5 w-2.5 rounded-full"
            style={{ background: priorityColour }}
            aria-hidden="true"
          />
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}
