import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatTime } from "@/lib/format";

type Props = {
  name: string;
  dosage: string;
  frequency?: string;
  loggedAt?: string | null;
  onLog?: () => void;
  large?: boolean;
};

export function MedicationCard({
  name, dosage, frequency, loggedAt, onLog, large = false,
}: Props) {
  const confirmed = !!loggedAt;

  return (
    <Card
      accent={confirmed ? "sage" : undefined}
      className={large ? "space-y-3" : "space-y-2"}
    >
      <div className="flex items-start gap-3">
        <div className={[
          "shrink-0 rounded-2xl bg-peach-100 flex items-center justify-center",
          large ? "h-14 w-14 text-3xl" : "h-11 w-11 text-xl",
        ].join(" ")}
          aria-hidden="true"
        >
          💊
        </div>
        <div className="flex-1 min-w-0">
          <div className={large ? "text-xl font-bold text-text-dark" : "text-base font-bold text-text-dark"}>
            {name}
          </div>
          <div className={large ? "text-base text-text-mid" : "text-sm text-text-mid"}>
            {dosage}{frequency ? ` · ${frequency}` : ""}
          </div>
        </div>
      </div>
      {confirmed ? (
        <div className="flex items-center gap-2 text-sage-600 font-bold text-sm pl-14">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7.5" stroke="#5da882" />
            <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#5da882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Taken at {formatTime(toTimeString(loggedAt!))}
        </div>
      ) : onLog ? (
        large ? (
          <Button variant="sage" size="lg" fullWidth onClick={onLog}>
            ✓ I've taken this
          </Button>
        ) : (
          <Button variant="sage" size="sm" onClick={onLog}>Taken ✓</Button>
        )
      ) : null}
    </Card>
  );
}

function toTimeString(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}
