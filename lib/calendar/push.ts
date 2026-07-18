import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { CalendarConnection } from "@/lib/supabase/types";
import type { CalendarEvent } from "@/lib/calendar/google";
import * as google from "@/lib/calendar/google";
import * as apple from "@/lib/calendar/apple";

type SyncChange = "create" | "update" | "delete";

// Central orchestrator: figures out who should get this appointment
// pushed to their calendar (role default, overridden per-user), and
// dispatches to the right provider module. A failure on one person's
// connection never blocks the appointment save or anyone else's sync —
// each connection's error is caught and recorded on that connection row.
export async function syncAppointmentToCalendars(appointmentId: string, change: SyncChange): Promise<void> {
  const admin = getSupabaseServiceClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const deepLink = `${siteUrl}/family/appointments/${appointmentId}`;

  const { data: appointment } = await admin
    .from("appointments")
    .select("title, appointment_date, appointment_time, location, specialist, appt_type, notes_before")
    .eq("id", appointmentId)
    .maybeSingle();

  // For a delete, the row may already be gone by the time this runs (or
  // still present, per the "sync before removing" convention in
  // deleteAppointment) — either way we only need the existing mappings.
  if (!appointment && change !== "delete") return;

  const [{ data: mappings }, { data: connections }, { data: roleDefaults }] = await Promise.all([
    admin
      .from("appointment_calendar_events")
      .select("id, user_id, provider, external_event_id, external_etag")
      .eq("appointment_id", appointmentId),
    admin.from("calendar_connections").select("*").eq("status", "active"),
    appointment
      ? admin.from("calendar_role_defaults").select("role, enabled").eq("appt_type", appointment.appt_type)
      : Promise.resolve({ data: [] as { role: string; enabled: boolean }[] }),
  ]);

  if (!connections || connections.length === 0) return;

  const userIds = connections.map((c) => c.user_id);
  const [{ data: profiles }, { data: prefs }] = await Promise.all([
    admin.from("profiles").select("id, role").in("id", userIds),
    appointment
      ? admin.from("calendar_sync_prefs").select("user_id, enabled").eq("appt_type", appointment.appt_type).in("user_id", userIds)
      : Promise.resolve({ data: [] as { user_id: string; enabled: boolean }[] }),
  ]);

  const roleByUser = new Map((profiles ?? []).map((p) => [p.id, p.role]));
  const roleDefaultMap = new Map((roleDefaults ?? []).map((r) => [r.role, r.enabled]));
  const overrideMap = new Map((prefs ?? []).map((p) => [p.user_id, p.enabled]));
  const mappingByUserProvider = new Map((mappings ?? []).map((m) => [`${m.user_id}:${m.provider}`, m]));

  const event: CalendarEvent | null = appointment
    ? {
        title: appointment.title,
        description: appointment.notes_before ?? "",
        location: appointment.location,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
      }
    : null;

  for (const connection of connections) {
    const key = `${connection.user_id}:${connection.provider}`;
    const mapping = mappingByUserProvider.get(key);
    const role = roleByUser.get(connection.user_id);
    const effectiveEnabled = change === "delete"
      ? false
      : overrideMap.has(connection.user_id)
        ? overrideMap.get(connection.user_id)!
        : (role ? roleDefaultMap.get(role) ?? false : false);

    try {
      if (change === "delete" || !effectiveEnabled) {
        if (mapping) {
          await deleteRemote(connection, mapping.provider, mapping.external_event_id, mapping.external_etag);
          await admin.from("appointment_calendar_events").delete().eq("id", mapping.id);
        }
        continue;
      }

      if (!event) continue;

      if (mapping) {
        const newEtag = await updateRemote(connection, appointmentId, mapping.provider, mapping.external_event_id, mapping.external_etag, event, deepLink);
        await admin
          .from("appointment_calendar_events")
          .update({ external_etag: newEtag, updated_at: new Date().toISOString() })
          .eq("id", mapping.id);
      } else {
        const created = await createRemote(connection, appointmentId, event, deepLink);
        await admin.from("appointment_calendar_events").insert({
          appointment_id: appointmentId,
          user_id: connection.user_id,
          provider: connection.provider,
          external_event_id: created.externalEventId,
          external_etag: created.externalEtag,
        });
      }

      if (connection.last_error) {
        await admin.from("calendar_connections").update({ last_error: null }).eq("id", connection.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await admin.from("calendar_connections").update({ last_error: message }).eq("id", connection.id);
    }
  }
}

async function createRemote(
  connection: CalendarConnection,
  appointmentId: string,
  event: CalendarEvent,
  deepLink: string,
): Promise<{ externalEventId: string; externalEtag: string | null }> {
  if (connection.provider === "google") {
    const id = await google.pushCreate(connection, event, deepLink);
    return { externalEventId: id, externalEtag: null };
  }
  const result = await apple.pushCreate(connection, appointmentId, event, deepLink);
  return { externalEventId: result.url, externalEtag: result.etag };
}

async function updateRemote(
  connection: CalendarConnection,
  appointmentId: string,
  provider: CalendarConnection["provider"],
  externalEventId: string,
  externalEtag: string | null,
  event: CalendarEvent,
  deepLink: string,
): Promise<string | null> {
  if (provider === "google") {
    await google.pushUpdate(connection, externalEventId, event, deepLink);
    return null;
  }
  return apple.pushUpdate(connection, appointmentId, externalEventId, externalEtag, event, deepLink);
}

async function deleteRemote(
  connection: CalendarConnection,
  provider: CalendarConnection["provider"],
  externalEventId: string,
  externalEtag: string | null,
): Promise<void> {
  if (provider === "google") {
    await google.pushDelete(connection, externalEventId);
    return;
  }
  await apple.pushDelete(connection, externalEventId, externalEtag);
}
