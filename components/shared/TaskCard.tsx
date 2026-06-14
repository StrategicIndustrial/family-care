import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRelativeDate, formatTime } from "@/lib/format";
import type { TaskKind, TaskStatus } from "@/lib/supabase/types";

type Props = {
  title: string;
  taskType: TaskKind;
  dueDate?: string | null;
  dueTime?: string | null;
  status: TaskStatus;
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
  action?: ReactNode; // primary action button, e.g. "Done ✓" or "Claim it"
  onClick?: () => void;
};

const TYPE_LABEL: Record<TaskKind, string> = {
  visit:       "🚶 Visit",
  shopping:    "🛒 Shopping",
  transport:   "🚗 Transport",
  appointment: "📅 Appointment",
  other:       "✦ Task",
};

const STATUS_TONE = {
  open:    "neutral",
  claimed: "primary",
  done:    "success",
} as const;

export function TaskCard({
  title, taskType, dueDate, dueTime, status,
  assigneeName, assigneeAvatarUrl, action, onClick,
}: Props) {
  const due = dueDate
    ? `${formatRelativeDate(dueDate)}${dueTime ? ` · ${formatTime(dueTime)}` : ""}`
    : null;

  return (
    <Card
      className={onClick ? "cursor-pointer hover:border-primary/40" : undefined}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge tone="neutral">{TYPE_LABEL[taskType]}</Badge>
            <Badge tone={STATUS_TONE[status]}>{status}</Badge>
          </div>
          <div className="font-medium text-text-dark">{title}</div>
          {due && <div className="text-sm text-text-mid mt-1">{due}</div>}
        </div>
        {assigneeName && (
          <Avatar
            name={assigneeName}
            url={assigneeAvatarUrl}
            size="sm"
            className="shrink-0"
          />
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}
