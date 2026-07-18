-- =================================================================
-- 014 — generalize appointment_calendar_events -> calendar_pushed_events
--
-- Tasks (Stage H) and medications (Stage D) now also push to synced
-- calendars, not just appointments — rather than three near-identical
-- mapping tables, this one table tracks the external event/resource for
-- any source_type. source_id is text (not uuid) so a medication with
-- multiple reminder_times can push one recurring event per time slot,
-- keyed as "<medication_id>::<HH:MM>" rather than needing a second
-- mapping table just for that.
-- =================================================================

ALTER TABLE public.appointment_calendar_events RENAME TO calendar_pushed_events;

ALTER TABLE public.calendar_pushed_events RENAME COLUMN appointment_id TO source_id_uuid;
ALTER TABLE public.calendar_pushed_events ALTER COLUMN source_id_uuid DROP NOT NULL;
ALTER TABLE public.calendar_pushed_events ADD COLUMN source_id text;
UPDATE public.calendar_pushed_events SET source_id = source_id_uuid::text WHERE source_id IS NULL;
ALTER TABLE public.calendar_pushed_events ALTER COLUMN source_id SET NOT NULL;

ALTER TABLE public.calendar_pushed_events
  ADD COLUMN source_type text NOT NULL DEFAULT 'appointment' CHECK (source_type IN ('appointment', 'task', 'medication'));
ALTER TABLE public.calendar_pushed_events ALTER COLUMN source_type DROP DEFAULT;

ALTER TABLE public.calendar_pushed_events DROP CONSTRAINT IF EXISTS appointment_calendar_events_appointment_id_fkey;
ALTER TABLE public.calendar_pushed_events DROP COLUMN source_id_uuid;

DROP INDEX IF EXISTS appointment_calendar_events_appointment_idx;
CREATE INDEX calendar_pushed_events_source_idx ON public.calendar_pushed_events(source_type, source_id);

ALTER TABLE public.calendar_pushed_events DROP CONSTRAINT IF EXISTS appointment_calendar_events_appointment_id_user_id_provide_key;
ALTER TABLE public.calendar_pushed_events ADD CONSTRAINT calendar_pushed_events_unique UNIQUE (source_type, source_id, user_id, provider);
