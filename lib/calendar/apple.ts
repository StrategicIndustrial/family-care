import { createDAVClient } from "tsdav";
import { decryptSecret } from "@/lib/calendar/crypto";
import type { CalendarConnection } from "@/lib/supabase/types";
import type { CalendarEvent } from "@/lib/calendar/google";

const ICLOUD_SERVER_URL = "https://caldav.icloud.com";

async function getClient(connection: CalendarConnection) {
  if (!connection.apple_username || !connection.apple_app_password_encrypted) {
    throw new Error("Apple connection is missing credentials — needs to be re-linked.");
  }
  return createDAVClient({
    serverUrl: ICLOUD_SERVER_URL,
    credentials: {
      username: connection.apple_username,
      password: decryptSecret(connection.apple_app_password_encrypted),
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

// Validates the app-specific password immediately and returns the first
// writable calendar's collection URL, so connectAppleCalendar can fail
// fast with a clear error instead of silently storing a bad credential.
export async function discoverCalendar(username: string, appSpecificPassword: string): Promise<string> {
  const client = await createDAVClient({
    serverUrl: ICLOUD_SERVER_URL,
    credentials: { username, password: appSpecificPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  const calendars = await client.fetchCalendars();
  if (calendars.length === 0) throw new Error("No calendars found on this Apple ID.");
  return calendars[0].url;
}

function toICalDate(date: string, time: string | null): string {
  if (!time) return date.replace(/-/g, "");
  const [h, m] = time.split(":");
  return `${date.replace(/-/g, "")}T${h}${m}00`;
}

function addHour(date: string, time: string): { date: string; time: string } {
  const d = new Date(`${date}T${time}`);
  d.setHours(d.getHours() + 1);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${mo}-${da}`, time: `${h}:${mi}:00` };
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildVEvent(uid: string, event: CalendarEvent, deepLink: string): string {
  const description = escapeICalText(`${event.description}\n\nOpen in Family Care: ${deepLink}`);
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines = ["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${dtstamp}`];

  if (event.time) {
    const end = addHour(event.date, event.time);
    lines.push(`DTSTART;TZID=Australia/Perth:${toICalDate(event.date, event.time)}`);
    lines.push(`DTEND;TZID=Australia/Perth:${toICalDate(end.date, end.time)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${toICalDate(event.date, null)}`);
  }

  if (event.recurring) lines.push("RRULE:FREQ=DAILY");

  lines.push(`SUMMARY:${escapeICalText(event.title)}`);
  if (event.location) lines.push(`LOCATION:${escapeICalText(event.location)}`);
  lines.push(`DESCRIPTION:${description}`);
  lines.push(`URL:${deepLink}`);
  lines.push("END:VEVENT");

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Family Care//EN", ...lines, "END:VCALENDAR"].join("\r\n");
}

function filenameFor(appointmentId: string, userId: string): string {
  return `familycare-${appointmentId}-${userId}.ics`;
}

export async function pushCreate(connection: CalendarConnection, appointmentId: string, event: CalendarEvent, deepLink: string): Promise<{ url: string; etag: string | null }> {
  if (!connection.caldav_calendar_url) throw new Error("No calendar URL stored for this connection.");
  const client = await getClient(connection);
  const filename = filenameFor(appointmentId, connection.user_id);
  const uid = `${appointmentId}-${connection.user_id}@familycare`;
  const iCalString = buildVEvent(uid, event, deepLink);

  const res = await client.createCalendarObject({
    calendar: { url: connection.caldav_calendar_url },
    iCalString,
    filename,
  });
  if (!res.ok) throw new Error(`CalDAV create failed (${res.status}): ${await res.text().catch(() => "")}`);

  const url = new URL(filename, connection.caldav_calendar_url).href;
  return { url, etag: res.headers.get("etag") };
}

export async function pushUpdate(connection: CalendarConnection, appointmentId: string, externalEventUrl: string, externalEtag: string | null, event: CalendarEvent, deepLink: string): Promise<string | null> {
  const client = await getClient(connection);
  const uid = `${appointmentId}-${connection.user_id}@familycare`;
  const iCalString = buildVEvent(uid, event, deepLink);

  const res = await client.updateCalendarObject({
    calendarObject: { url: externalEventUrl, etag: externalEtag ?? undefined, data: iCalString },
  });
  if (!res.ok) throw new Error(`CalDAV update failed (${res.status}): ${await res.text().catch(() => "")}`);
  return res.headers.get("etag");
}

export async function pushDelete(connection: CalendarConnection, externalEventUrl: string, externalEtag: string | null): Promise<void> {
  const client = await getClient(connection);
  const res = await client.deleteCalendarObject({
    calendarObject: { url: externalEventUrl, etag: externalEtag ?? undefined },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`CalDAV delete failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
}
