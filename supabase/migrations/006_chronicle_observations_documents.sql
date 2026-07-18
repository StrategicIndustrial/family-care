-- =================================================================
-- 006 — Observations, Medical Chronicle, Documents, AI Insights
--
-- NOTE: these tables already exist on the live project (they were
-- applied directly, out-of-band, by a separate Replit-based session —
-- see ARCHITECTURE-DECISION.md and the git history around 2026-07-17).
-- This file is a faithful reconstruction from live schema introspection
-- (information_schema.columns, pg_policies, pg_constraint, pg_indexes)
-- so this repo's migration history matches reality. Do NOT re-run this
-- against the existing project — it will fail on already-exists errors.
-- It exists so a FRESH Supabase project created from this repo ends up
-- with the same schema the live one already has.
--
-- Phase 4 scope — Chronicle / Observations / GP Export / Documents.
-- Explicitly out of the original Phase 1 brief; approved as new scope
-- 2026-07-18.
-- =================================================================

CREATE TYPE observation_type AS ENUM ('behaviour', 'symptom', 'mood');

-- -----------------------------------------------------------------
-- observations: carer's day-to-day log. Never visible to patient role
-- at all (unlike tasks/appointments, which have a visibility tier the
-- patient CAN see under 'everyone') — read policy only admits
-- primary_carer/family, matching the brief's "never visible to
-- Leanne" mandate for clinical/observational data.
-- -----------------------------------------------------------------
CREATE TABLE public.observations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        observation_type NOT NULL,
  body        text        NOT NULL,
  author_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility  text        NOT NULL DEFAULT 'everyone'
                CHECK (visibility IN ('everyone', 'family_only', 'private')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX observations_created_at_idx ON public.observations(created_at DESC);
CREATE INDEX observations_author_id_idx  ON public.observations(author_id);

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "observations_read"
  ON public.observations FOR SELECT TO authenticated
  USING (
    (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family')
      AND visibility IN ('everyone', 'family_only')
    )
    OR (visibility = 'private' AND author_id = auth.uid())
  );

CREATE POLICY "observations_insert"
  ON public.observations FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family')
  );

CREATE POLICY "observations_update"
  ON public.observations FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "observations_delete"
  ON public.observations FOR DELETE TO authenticated
  USING (author_id = auth.uid());


-- -----------------------------------------------------------------
-- documents: uploaded scans/PDFs (GP letters, results). The row here
-- is metadata only — actual bytes live in Supabase Storage at
-- storage_path. RLS on this table gates who can see/manage the
-- metadata; a signed URL for the object itself is issued server-side
-- (Server Action / Route Handler), never via a public bucket.
-- -----------------------------------------------------------------
CREATE TABLE public.documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path  text        NOT NULL,
  filename      text        NOT NULL,
  mime_type     text        NOT NULL,
  size_bytes    bigint      NOT NULL,
  author        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  linked_at     timestamptz  -- set once attached to a medical_notes row; null = orphaned/pending cleanup
);

CREATE INDEX documents_author_idx     ON public.documents(author);
CREATE INDEX documents_linked_at_idx  ON public.documents(linked_at);
CREATE INDEX documents_created_at_idx ON public.documents(created_at DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_read"
  ON public.documents FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family'));

CREATE POLICY "documents_insert"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    author = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family')
  );

CREATE POLICY "documents_update"
  ON public.documents FOR UPDATE TO authenticated
  USING (author = auth.uid())
  WITH CHECK (author = auth.uid());

CREATE POLICY "documents_delete"
  ON public.documents FOR DELETE TO authenticated
  USING (author = auth.uid());


-- -----------------------------------------------------------------
-- medical_notes: the Chronicle's clinical entries (GP notes,
-- specialist letters, hospital summaries, test results), optionally
-- attached to an uploaded document.
-- -----------------------------------------------------------------
CREATE TABLE public.medical_notes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text        NOT NULL
                 CHECK (category IN ('gp_note', 'specialist', 'hospital', 'test_result', 'observation', 'other')),
  date         date        NOT NULL DEFAULT CURRENT_DATE,
  body         text        NOT NULL,
  author_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id  uuid        REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX medical_notes_date_idx      ON public.medical_notes(date DESC);
CREATE INDEX medical_notes_author_id_idx ON public.medical_notes(author_id);

ALTER TABLE public.medical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medical_notes_read"
  ON public.medical_notes FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family'));

CREATE POLICY "medical_notes_insert"
  ON public.medical_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family')
  );

CREATE POLICY "medical_notes_update"
  ON public.medical_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "medical_notes_delete"
  ON public.medical_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid());


-- -----------------------------------------------------------------
-- ai_insights: cache for the Chronicle's AI-summary feature, keyed so
-- identical requests (same range + filters + underlying data) don't
-- re-charge Anthropic credits. Written/read only via a server-side
-- Route Handler holding ANTHROPIC_API_KEY — never touched directly by
-- the browser client, so no RLS policy grants direct table access to
-- `authenticated`; the one read policy below matches what's live, kept
-- for parity, but production reads should go through server code that
-- re-checks role itself.
-- -----------------------------------------------------------------
CREATE TABLE public.ai_insights (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  range         text        NOT NULL,
  filters_hash  text        NOT NULL,
  data_hash     text        NOT NULL,
  summary       text        NOT NULL,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (range, filters_hash, data_hash)
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_insights_read"
  ON public.ai_insights FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family'));


-- -----------------------------------------------------------------
-- appointment_questions: per-appointment Q&A, separate from the
-- appointments.notes_before/after free text — structured question +
-- answer pairs, each with its own visibility tier.
-- -----------------------------------------------------------------
CREATE TABLE public.appointment_questions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  question_text   text        NOT NULL CHECK (length(trim(question_text)) > 0),
  answer_text     text,
  visibility      text        NOT NULL DEFAULT 'everyone'
                    CHECK (visibility IN ('everyone', 'family_only')),
  created_by      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointment_questions_appointment_idx ON public.appointment_questions(appointment_id);

ALTER TABLE public.appointment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_questions_select_patient"
  ON public.appointment_questions FOR SELECT TO authenticated
  USING (get_my_role() = 'patient' AND visibility = 'everyone');

CREATE POLICY "appt_questions_select_primary_carer"
  ON public.appointment_questions FOR SELECT TO authenticated
  USING (get_my_role() = 'primary_carer');

CREATE POLICY "appt_questions_select_family"
  ON public.appointment_questions FOR SELECT TO authenticated
  USING (get_my_role() = 'family');

CREATE POLICY "appt_questions_select_extended"
  ON public.appointment_questions FOR SELECT TO authenticated
  USING (get_my_role() = 'extended' AND visibility = 'everyone');

CREATE POLICY "appt_questions_insert_patient"
  ON public.appointment_questions FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'patient' AND created_by = auth.uid() AND visibility = 'everyone');

CREATE POLICY "appt_questions_insert_primary_carer"
  ON public.appointment_questions FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'primary_carer' AND created_by = auth.uid());

CREATE POLICY "appt_questions_insert_family"
  ON public.appointment_questions FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'family' AND created_by = auth.uid());

CREATE POLICY "appt_questions_insert_extended"
  ON public.appointment_questions FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'extended' AND created_by = auth.uid() AND visibility = 'everyone');

CREATE POLICY "appt_questions_update_patient"
  ON public.appointment_questions FOR UPDATE TO authenticated
  USING (get_my_role() = 'patient' AND visibility = 'everyone')
  WITH CHECK (visibility = 'everyone');

CREATE POLICY "appt_questions_update_primary_carer"
  ON public.appointment_questions FOR UPDATE TO authenticated
  USING (get_my_role() = 'primary_carer');

CREATE POLICY "appt_questions_update_family"
  ON public.appointment_questions FOR UPDATE TO authenticated
  USING (get_my_role() = 'family');

CREATE POLICY "appt_questions_update_extended"
  ON public.appointment_questions FOR UPDATE TO authenticated
  USING (get_my_role() = 'extended' AND visibility = 'everyone')
  WITH CHECK (visibility = 'everyone');

CREATE POLICY "appt_questions_delete_patient"
  ON public.appointment_questions FOR DELETE TO authenticated
  USING (get_my_role() = 'patient' AND created_by = auth.uid());

CREATE POLICY "appt_questions_delete_primary_carer"
  ON public.appointment_questions FOR DELETE TO authenticated
  USING (get_my_role() = 'primary_carer');

CREATE POLICY "appt_questions_delete_family"
  ON public.appointment_questions FOR DELETE TO authenticated
  USING (get_my_role() = 'family');

CREATE POLICY "appt_questions_delete_extended"
  ON public.appointment_questions FOR DELETE TO authenticated
  USING (get_my_role() = 'extended' AND created_by = auth.uid());


-- -----------------------------------------------------------------
-- push_subscriptions: Web Push subscription rows, one per device.
-- Phase 4+ item (push notifications), schema-only for now.
-- -----------------------------------------------------------------
CREATE TABLE public.push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_own"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- -----------------------------------------------------------------
-- invite_codes: admin-issued codes gating /signup, replacing the
-- single shared FAMILY_INVITE_CODE env var with real per-invite codes.
-- -----------------------------------------------------------------
CREATE TABLE public.invite_codes (
  code        text        PRIMARY KEY,
  role        user_role   NOT NULL DEFAULT 'extended',
  label       text,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
-- No policies granting `authenticated`/`anon` direct access — validated
-- server-side only (service role), same pattern as admin actions elsewhere.


-- -----------------------------------------------------------------
-- tasks.attending_user_id — "who's actually handling this right now"
-- distinct from assigned_to, supporting a takeover/hand-off flow.
-- -----------------------------------------------------------------
ALTER TABLE public.tasks ADD COLUMN attending_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
