import { Card } from "@/components/ui/Card";
import { formatTime } from "@/lib/format";

type Props = {
  title: string;
  date: string;                             // ISO YYYY-MM-DD
  time?: string | null;
  specialist?: string | null;
  location?: string | null;
  onClick?: () => void;
};

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export function AppointmentRow({ title, date, time, specialist, location, onClick }: Props) {
  const d = new Date(date);
  const day = String(d.getDate());
  const month = MONTHS[d.getMonth()];

  return (
    <Card
      className={onClick ? "cursor-pointer hover:border-peach-200/60" : undefined}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div
          className="shrink-0 h-14 w-14 rounded-2xl bg-peach-100 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <div className="text-lg font-extrabold text-peach-600 leading-none">{day}</div>
          <div className="text-[10px] font-bold text-peach-600 mt-0.5">{month}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] text-text-dark truncate">{title}</div>
          <div className="text-xs text-text-mid mt-0.5">
            {[time && formatTime(time), specialist].filter(Boolean).join(" · ")}
          </div>
          {location && (
            <div className="text-xs text-text-mid mt-0.5 truncate">{location}</div>
          )}
        </div>
      </div>
    </Card>
  );
}
