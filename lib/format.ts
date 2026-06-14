// Australian English formatting helpers — used everywhere the UI shows dates,
// times, or relative time. Single source of truth so terminology stays
// consistent ("today", "tomorrow", "Sun 15 Jun") across views.

const LOCALE = "en-AU";
const TZ = "Australia/Perth"; // brief §1: family is in Western Australia

const longDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

const shortDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TZ,
});

const timeOfDay = new Intl.DateTimeFormat(LOCALE, {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TZ,
});

// "Sunday, 15 June" — used in Mum's greeting and Dad's today header.
export function formatLongDate(d: Date | string): string {
  return longDate.format(typeof d === "string" ? new Date(d) : d);
}

// "Sun 15 Jun" — used in week-at-a-glance lists.
export function formatShortDate(d: Date | string): string {
  return shortDate.format(typeof d === "string" ? new Date(d) : d);
}

// "9:30 am"
export function formatTime(t: string): string {
  // Database times come as "HH:MM:SS"; combine with today's date so Intl can format.
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return timeOfDay.format(d);
}

// "Today", "Tomorrow", "Sun 15 Jun" — relative when close, absolute when far.
export function formatRelativeDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const today = new Date();
  const diffDays = Math.round(
    (date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return formatShortDate(date);
}

// "2 mins ago", "1 hour ago", "Sun 15 Jun" — for update feeds.
export function formatRelativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatShortDate(date);
}

// Initials from a name — for Avatar fallback.
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
