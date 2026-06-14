import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatTime } from "@/lib/format";

type Props = {
  name: string;
  dosage: string;
  frequency?: string;
  loggedAt?: string | null;     // ISO if logged today; null if pending
  onLog?: () => void;
  // Mum's view uses oversized type — pass true for her dashboard.
  large?: boolean;
};

export function MedicationCard({
  name, dosage, frequency, loggedAt, onLog, large = false,
}: Props) {
  const confirmed = !!loggedAt;
  const headingClass = large
    ? "text-2xl font-semibold text-text-dark"
    : "text-lg font-medium text-text-dark";

  return (
    <Card
      className={
        confirmed
          ? "border-success/30 bg-success/5"
          : large ? "bg-white shadow-sm" : undefined
      }
    >
      <div className="space-y-1">
        <div className={headingClass}>{name}</div>
        <div className={large ? "text-lg text-text-mid" : "text-sm text-text-mid"}>
          {dosage}
          {frequency ? ` · ${frequency}` : ""}
        </div>
      </div>
      <div className="mt-4">
        {confirmed ? (
          <div className="flex items-center gap-2 text-success font-medium">
            <span aria-hidden="true">✓</span>
            <span>{large ? "Taken" : "Logged"} at {formatTime(toTimeString(loggedAt!))}</span>
          </div>
        ) : onLog ? (
          large ? (
            <Button variant="large" fullWidth onClick={onLog}>✓ I've taken this</Button>
          ) : (
            <Button variant="success" onClick={onLog}>Taken ✓</Button>
          )
        ) : null}
      </div>
    </Card>
  );
}

function toTimeString(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
}
