// Mood check-in windows, Australia/Perth local time — morning 06:00–12:00,
// evening 17:00–22:00. Outside both, there's nothing to show.
export type CheckinPeriod = "morning" | "evening";

export function getCurrentPeriod(): CheckinPeriod | null {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Perth", hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 17 && hour < 22) return "evening";
  return null;
}

export function perthTodayDateStr(): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
