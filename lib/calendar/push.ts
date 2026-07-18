import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { CalendarConnection } from "@/lib/supabase/types";
import type { CalendarEvent } from "@/lib/calendar/google";
import * as google from "@/lib/calendar/google";
import * as apple from "@/lib/calendar/apple";

type SyncChange = "create" | "update" | "delete";
export type SourceType = "appointment" | "task" | "medication";

// One "unit of push" — a source_id (row id, or "<row id>::<slot>" for
// medications with multiple reminder_times) plus the CalendarEvent to
// push and which users should get it, with their effective enabled state
// already resolved by the caller.
type PushUnit = {
  sourceId: string;
  event: CalendarEvent | null; // null means "remove any existing push for this unit"
  recipients: { userId: string; enabled: boolean }[];
};

// Central orchestrator: for a given source (appointment/task/medication),
// works out who should get it pushed to their calendar and dispatches to
// the right provider module. A failure on one person's connection never
// blocks the save or anyone else's sync — each connection's error is
// caught and recorded on that connection row.
export async function syncSourceToCalendars(
  sourceType: SourceType,
  sourceId: string,
  change: SyncChange,
): Promise<void> {
  const admin = getSupabaseServiceClient();
  const units = await buildPushUnits(sourceType, sourceId, change);
  if (units.length === 0) return;

  const allUserIds = [...new Set(units.flatMap((u) => u.recipients.map((r) => r.userId)))];
  const { data: connections } = await admin
    .from("calendar_connections")
    .select("*")
    .eq("status", "active")
    .in("user_id", allUserIds.length > 0 ? allUserIds : ["00000000-0000-0000-0000-000000000000"]);
  if (!connections || connections.length === 0) return;

  const connectionsByUser = new Map<string, CalendarConnection[]>();
  for (const c of connections) {
    const arr = connectionsByUser.get(c.user_id) ?? [];
    arr.push(c);
    connectionsByUser.set(c.user_id, arr);
  }

  for (const unit of units) {
    const { data: mappings } = await admin
      .from("calendar_pushed_events")
      .select("id, user_id, provider, external_event_id, external_etag")
      .eq("source_type", sourceType)
      .eq("source_id", unit.sourceId);
    const mappingByUserProvider = new Map((mappings ?? []).map((m) => [`${m.user_id}:${m.provider}`, m]));
    const enabledByUser = new Map(unit.recipients.map((r) => [r.userId, r.enabled]));

    for (const [userId, userConnections] of connectionsByUser) {
      if (!enabledByUser.has(userId)) continue;
      const effectiveEnabled = change === "delete" ? false : enabledByUser.get(userId)!;

      for (const connection of userConnections) {
        const mapping = mappingByUserProvider.get(`${userId}:${connection.provider}`);

        try {
          if (change === "delete" || !effectiveEnabled || !unit.event) {
            if (mapping) {
              await deleteRemote(connection, mapping.provider, mapping.external_event_id, mapping.external_etag);
              await admin.from("calendar_pushed_events").delete().eq("id", mapping.id);
            }
            continue;
          }

          const deepLink = deepLinkFor(sourceType, sourceId);

          if (mapping) {
            const newEtag = await updateRemote(connection, unit.sourceId, mapping.provider, mapping.external_event_id, mapping.external_etag, unit.event, deepLink);
            await admin
              .from("calendar_pushed_events")
              .update({ external_etag: newEtag, updated_at: new Date().toISOString() })
              .eq("id", mapping.id);
          } else {
            const created = await createRemote(connection, unit.sourceId, unit.event, deepLink);
            await admin.from("calendar_pushed_events").insert({
              source_type: sourceType,
              source_id: unit.sourceId,
              user_id: userId,
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
  }
}

function deepLinkFor(sourceType: SourceType, sourceId: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (sourceType === "appointment") return `${siteUrl}/family/appointments/${sourceId}`;
  if (sourceType === "task") return `${siteUrl}/family/tasks/${sourceId}`;
  return `${siteUrl}/family/medical/medications`;
}

async function buildPushUnits(sourceType: SourceType, sourceId: string, change: SyncChange): Promise<PushUnit[]> {
  const admin = getSupabaseServiceClient();

  if (sourceType === "appointment") {
    const { data: appointment } = await admin
      .from("appointments")
      .select("title, appointment_date, appointment_time, location, specialist, appt_type, notes_before")
      .eq("id", sourceId)
      .maybeSingle();
    if (!appointment && change !== "delete") return [];

    const { data: connections } = await admin.from("calendar_connections").select("user_id").eq("status", "active");
    const userIds = [...new Set((connections ?? []).map((c) => c.user_id))];
    if (userIds.length === 0) return [{ sourceId, event: null, recipients: [] }];

    const [{ data: profiles }, { data: roleDefaults }, { data: prefs }] = await Promise.all([
      admin.from("profiles").select("id, role").in("id", userIds),
      appointment
        ? admin.from("calendar_role_defaults").select("role, enabled").eq("appt_type", appointment.appt_type)
        : Promise.resolve({ data: [] as { role: string; enabled: boolean }[] }),
      appointment
        ? admin.from("calendar_sync_prefs").select("user_id, enabled").eq("appt_type", appointment.appt_type).in("user_id", userIds)
        : Promise.resolve({ data: [] as { user_id: string; enabled: boolean }[] }),
    ]);

    const roleByUser = new Map((profiles ?? []).map((p) => [p.id, p.role]));
    const roleDefaultMap = new Map((roleDefaults ?? []).map((r) => [r.role, r.enabled]));
    const overrideMap = new Map((prefs ?? []).map((p) => [p.user_id, p.enabled]));

    const recipients = userIds.map((userId) => {
      const role = roleByUser.get(userId);
      const enabled = overrideMap.has(userId) ? overrideMap.get(userId)! : (role ? roleDefaultMap.get(role) ?? false : false);
      return { userId, enabled };
    });

    const event: CalendarEvent | null = appointment
      ? { title: appointment.title, description: appointment.notes_before ?? "", location: appointment.location, date: appointment.appointment_date, time: appointment.appointment_time }
      : null;

    return [{ sourceId, event, recipients }];
  }

  if (sourceType === "task") {
    const { data: task } = await admin
      .from("tasks")
      .select("title, description, due_date, due_time, assigned_to, push_to_calendar")
      .eq("id", sourceId)
      .maybeSingle();
    if (!task && change !== "delete") return [];
    if (!task?.assigned_to) return [{ sourceId, event: null, recipients: [] }];

    const enabled = change !== "delete" && !!task?.push_to_calendar && !!task?.due_date;
    const event: CalendarEvent | null = task?.due_date
      ? { title: task.title, description: task.description ?? "", location: null, date: task.due_date, time: task.due_time }
      : null;

    return [{ sourceId, event, recipients: [{ userId: task.assigned_to, enabled }] }];
  }

  // medication — one push unit per reminder_times slot, each its own
  // recurring (daily) event, keyed "<medication_id>::<HH:MM>".
  const { data: medication } = await admin
    .from("medications")
    .select("name, dosage, reminder_times, is_active")
    .eq("id", sourceId)
    .maybeSingle();

  const { data: patientCarerProfiles } = await admin
    .from("profiles")
    .select("id, role")
    .in("role", ["patient", "primary_carer"]);
  const recipients = (patientCarerProfiles ?? []).map((p) => ({
    userId: p.id,
    enabled: change !== "delete" && !!medication?.is_active,
  }));

  if (!medication || change === "delete" || !medication.is_active || (medication.reminder_times ?? []).length === 0) {
    // Need to know every previously-pushed slot to remove them all.
    const { data: existing } = await admin
      .from("calendar_pushed_events")
      .select("source_id")
      .eq("source_type", "medication")
      .like("source_id", `${sourceId}::%`);
    const slots = [...new Set((existing ?? []).map((e) => e.source_id))];
    return slots.map((slotSourceId) => ({ sourceId: slotSourceId, event: null, recipients }));
  }

  return medication.reminder_times.map((time) => ({
    sourceId: `${sourceId}::${time}`,
    event: { title: `${medication.name} (${medication.dosage})`, description: "Take your medication and check it off in Family Care.", location: null, date: new Date().toISOString().slice(0, 10), time, recurring: true },
    recipients,
  }));
}

async function createRemote(
  connection: CalendarConnection,
  sourceId: string,
  event: CalendarEvent,
  deepLink: string,
): Promise<{ externalEventId: string; externalEtag: string | null }> {
  if (connection.provider === "google") {
    const id = await google.pushCreate(connection, event, deepLink);
    return { externalEventId: id, externalEtag: null };
  }
  const result = await apple.pushCreate(connection, sourceId, event, deepLink);
  return { externalEventId: result.url, externalEtag: result.etag };
}

async function updateRemote(
  connection: CalendarConnection,
  sourceId: string,
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
  return apple.pushUpdate(connection, sourceId, externalEventId, externalEtag, event, deepLink);
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
