import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret } from "@/lib/calendar/crypto";
import type { CalendarConnection } from "@/lib/supabase/types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

export type CalendarEvent = {
  title: string;
  description: string;
  location: string | null;
  date: string; // YYYY-MM-DD — first occurrence's date when recurring
  time: string | null; // HH:MM or HH:MM:SS, null = all-day
  recurring?: boolean; // daily recurrence (medication reminders)
};

function getClientCredentials() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET are not set.");
  }
  return { clientId, clientSecret };
}

// Returns a valid (non-expired) access token, refreshing via the stored
// refresh token first if needed. Google refresh tokens don't expire on
// their own (unless revoked), so there's nothing to renew on a schedule —
// this refresh happens inline, right before each push.
async function getValidAccessToken(connection: CalendarConnection): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000 && connection.access_token_encrypted) {
    return decryptSecret(connection.access_token_encrypted);
  }

  if (!connection.refresh_token_encrypted) {
    throw new Error("No refresh token stored — connection needs to be re-linked.");
  }
  const { clientId, clientSecret } = getClientCredentials();
  const refreshToken = decryptSecret(connection.refresh_token_encrypted);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google token refresh failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };

  const admin = getSupabaseServiceClient();
  const newExpiresAt = new Date(Date.now() + body.expires_in * 1000).toISOString();
  await admin
    .from("calendar_connections")
    .update({
      access_token_encrypted: encryptSecret(body.access_token),
      token_expires_at: newExpiresAt,
    })
    .eq("id", connection.id);

  return body.access_token;
}

// Appointments have no stored duration, so timed events default to 1 hour.
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function toGoogleEventBody(event: CalendarEvent, deepLink: string) {
  const description = `${event.description}\n\nOpen in Family Care: ${deepLink}`;
  const base = { summary: event.title, location: event.location ?? undefined, description };

  const recurrence = event.recurring ? { recurrence: ["RRULE:FREQ=DAILY"] } : {};

  if (event.time) {
    const start = new Date(`${event.date}T${event.time}`);
    const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
    return {
      ...base,
      ...recurrence,
      start: { dateTime: start.toISOString(), timeZone: "Australia/Perth" },
      end: { dateTime: end.toISOString(), timeZone: "Australia/Perth" },
    };
  }
  return { ...base, ...recurrence, start: { date: event.date }, end: { date: event.date } };
}

async function callEvents(
  connection: CalendarConnection,
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: object,
): Promise<{ id?: string }> {
  const accessToken = await getValidAccessToken(connection);
  const calendarId = connection.external_calendar_id ?? "primary";
  const res = await fetch(`${EVENTS_URL}/${encodeURIComponent(calendarId)}/events${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 410) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google Calendar API ${method} ${res.status}: ${detail.slice(0, 200)}`);
  }
  if (method === "DELETE") return {};
  return res.json() as Promise<{ id: string }>;
}

export async function pushCreate(connection: CalendarConnection, event: CalendarEvent, deepLink: string): Promise<string> {
  const result = await callEvents(connection, "POST", "", toGoogleEventBody(event, deepLink));
  if (!result.id) throw new Error("Google Calendar did not return an event id.");
  return result.id;
}

export async function pushUpdate(connection: CalendarConnection, externalEventId: string, event: CalendarEvent, deepLink: string): Promise<void> {
  await callEvents(connection, "PATCH", `/${encodeURIComponent(externalEventId)}`, toGoogleEventBody(event, deepLink));
}

export async function pushDelete(connection: CalendarConnection, externalEventId: string): Promise<void> {
  await callEvents(connection, "DELETE", `/${encodeURIComponent(externalEventId)}`);
}
