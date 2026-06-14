import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRelativeTime } from "@/lib/format";

type Props = {
  body: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  createdAt: string;
  flagged?: boolean;
};

export function UpdatePost({
  body, authorName, authorAvatarUrl, createdAt, flagged,
}: Props) {
  return (
    <Card className={flagged ? "border-warning/40 bg-warning/5" : undefined}>
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <Avatar name={authorName} url={authorAvatarUrl} size="sm" />
          <div>
            <div className="font-medium text-text-dark text-sm">{authorName}</div>
            <div className="text-xs text-text-mid">{formatRelativeTime(createdAt)}</div>
          </div>
        </div>
        {flagged && <Badge tone="warning">📢 Urgent</Badge>}
      </header>
      <p className="text-text-dark whitespace-pre-wrap">{body}</p>
    </Card>
  );
}
