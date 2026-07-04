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
  animate?: boolean;
};

export function UpdatePost({
  body, authorName, authorAvatarUrl, createdAt, flagged, animate,
}: Props) {
  return (
    <Card
      className={[
        "flex gap-3",
        animate ? "anim-slide-up" : "",
        flagged ? "border-2 border-peach-200" : "",
      ].join(" ")}
    >
      <Avatar name={authorName} url={authorAvatarUrl} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <div className="font-bold text-text-dark text-sm">{authorName}</div>
          <div className="text-xs text-text-mid">{formatRelativeTime(createdAt)}</div>
        </div>
        {flagged && (
          <div className="mb-2">
            <Badge tone="peach">📢 Urgent</Badge>
          </div>
        )}
        <p className="text-sm text-sky-text leading-relaxed whitespace-pre-wrap">{body}</p>
      </div>
    </Card>
  );
}
