-- =================================================================
-- 012 — remove 'dental' and 'allied_health' from appt_type
--
-- No live appointments used either value. calendar_role_defaults and
-- calendar_sync_prefs had rows for them (part of the seeded matrix /
-- a user's own override) — cleared before rebuilding the enum, since
-- Postgres has no ALTER TYPE ... DROP VALUE.
-- =================================================================

DELETE FROM public.calendar_sync_prefs WHERE appt_type IN ('dental', 'allied_health');
DELETE FROM public.calendar_role_defaults WHERE appt_type IN ('dental', 'allied_health');
UPDATE public.appointments SET appt_type = 'other' WHERE appt_type IN ('dental', 'allied_health');

ALTER TABLE public.appointments ALTER COLUMN appt_type DROP DEFAULT;

CREATE TYPE appt_type_new AS ENUM ('gp', 'specialist', 'scan_test', 'other');

ALTER TABLE public.appointments
  ALTER COLUMN appt_type TYPE appt_type_new USING appt_type::text::appt_type_new;
ALTER TABLE public.calendar_role_defaults
  ALTER COLUMN appt_type TYPE appt_type_new USING appt_type::text::appt_type_new;
ALTER TABLE public.calendar_sync_prefs
  ALTER COLUMN appt_type TYPE appt_type_new USING appt_type::text::appt_type_new;

DROP TYPE appt_type;
ALTER TYPE appt_type_new RENAME TO appt_type;

ALTER TABLE public.appointments ALTER COLUMN appt_type SET DEFAULT 'other'::appt_type;
