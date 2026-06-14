import { Card } from "@/components/ui/Card";
import { formatRelativeDate, formatTime } from "@/lib/format";

type Props = {
  title: string;
  date: string;
  time?: string | null;
  specialist?: string | null;
  location?: string | null;
  onClick?: () => void;
};

export function AppointmentRow({ title, date, time, specialist, location, onClick }: Props) {
  return (
    <Card
      className={onClick ? "cursor-pointer hover:border-primary/40" : undefined}
      onClick={onClick}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-medium text-text-dark">{title}</div>
          {specialist && <div className="text-sm text-text-mid">{specialist}</div>}
          {location && <div className="text-sm text-text-mid">{location}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-text-dark">{formatRelativeDate(date)}</div>
          {time && <div className="text-xs text-text-mid">{formatTime(time)}</div>}
        </div>
      </div>
    </Card>
  );
}
