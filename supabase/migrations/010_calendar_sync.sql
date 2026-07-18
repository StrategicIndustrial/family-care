-- =================================================================
-- 010 — External calendar push sync (Google OAuth + Apple CalDAV)
--
-- One-way push only (app -> each person's own calendar), never reads
-- back. Filtered by a role x appt_type matrix (calendar_role_defaults)
-- with per-user overrides (calendar_sync_prefs). All four tables are
-- service-role only — nothing here is queried from the browser client,
-- same pattern as ai_insights/documents.
-- =================================================================

CREATE TYPE calendar_provider AS ENUM ('google', 'apple');
CREATE TYPE calendar_connection_status AS ENUM ('active', 'error', 'revoked');

-- -----------------------------------------------------------------
-- calendar_connections: one row per user per provider they've linked.
-- Google fields (access/refresh token, expiry, calendar id) and Apple
-- fields (CalDAV username/app-specific password/calendar URL) are both
-- nullable since only one set applies per row depending on `provider`.
-- Tokens/passwords are stored encrypted (lib/calendar/crypto.ts,
-- AES-256-GCM) — never in plaintext.
-- -----------------------------------------------------------------
CREATE TABLE public.calendar_connections (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider                  calendar_provider NOT NULL,
  status                    calendar_connection_status NOT NULL DEFAULT 'active',

  -- Google OAuth
  access_token_encrypted    text,
  refresh_token_encrypted   text,
  token_expires_at          timestamptz,
  external_calendar_id      text        DEFAULT 'primary',

  -- Apple CalDAV
  apple_username            text,
  apple_app_password_encrypted text,
  caldav_calendar_url       text,

  last_error                text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, provider)
);

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
-- No policies granting authenticated/anon — service-role only, same
-- pattern as invite_codes.

-- -----------------------------------------------------------------
-- calendar_role_defaults: admin-configurable matrix — which appt_type
-- categories push to which roles' calendars by default.
-- -----------------------------------------------------------------
CREATE TABLE public.calendar_role_defaults (
  role        user_role   NOT NULL,
  appt_type   appt_type   NOT NULL,
  enabled     boolean     NOT NULL DEFAULT true,
  PRIMARY KEY (role, appt_type)
);

ALTER TABLE public.calendar_role_defaults ENABLE ROW LEVEL SECURITY;

INSERT INTO public.calendar_role_defaults (role, appt_type, enabled)
SELECT r.role, t.appt_type,
  CASE
    WHEN r.role IN ('primary_carer', 'family') THEN true
    WHEN r.role = 'patient' THEN false
    WHEN r.role = 'extended' THEN t.appt_type IN ('gp', 'specialist')
    ELSE false
  END
FROM (SELECT unnest(enum_range(NULL::user_role)) AS role) r
CROSS JOIN (SELECT unnest(enum_range(NULL::appt_type)) AS appt_type) t;

-- -----------------------------------------------------------------
-- calendar_sync_prefs: per-user override of the role default above.
-- Presence of a row wins over calendar_role_defaults; absence falls
-- back to the role default.
-- -----------------------------------------------------------------
CREATE TABLE public.calendar_sync_prefs (
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appt_type   appt_type   NOT NULL,
  enabled     boolean     NOT NULL,
  PRIMARY KEY (user_id, appt_type)
);

ALTER TABLE public.calendar_sync_prefs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- appointment_calendar_events: maps a pushed appointment to the exact
-- external event/resource created in each user's calendar, so a later
-- edit/delete can target (and remove) the right one instead of
-- creating duplicates. external_etag is Apple/CalDAV-only (needed for
-- conditional update/delete); external_event_id is the Google eventId
-- or the CalDAV resource URL.
-- -----------------------------------------------------------------
CREATE TABLE public.appointment_calendar_events (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     uuid        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id            uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider           calendar_provider NOT NULL,
  external_event_id  text        NOT NULL,
  external_etag      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (appointment_id, user_id, provider)
);

ALTER TABLE public.appointment_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX appointment_calendar_events_appointment_idx ON public.appointment_calendar_events(appointment_id);
