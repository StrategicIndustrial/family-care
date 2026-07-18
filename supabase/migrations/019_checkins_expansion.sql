-- =================================================================
-- 019 — mood check-in expansion
--
-- Was patient-only, fully private, no time gating (always showed, just
-- became a client-side "Thank you" state that reset on reload). Now:
-- primary_carer gets the same check-in, both feed a shared view (family/
-- extended can see both), and `period` distinguishes morning vs evening
-- so "already filled out this window" is a simple equality check
-- instead of deriving it from created_at.
--
-- Existing row (1 live) backfilled to the one known patient, period
-- guessed from created_at's Perth-local hour.
-- =================================================================

ALTER TABLE public.checkins ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.checkins ADD COLUMN period text CHECK (period IN ('morning', 'evening'));

UPDATE public.checkins
SET user_id = (SELECT id FROM public.profiles WHERE role = 'patient' LIMIT 1),
    period = CASE WHEN EXTRACT(HOUR FROM created_at AT TIME ZONE 'Australia/Perth') < 12 THEN 'morning' ELSE 'evening' END
WHERE user_id IS NULL;

ALTER TABLE public.checkins ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.checkins ALTER COLUMN period SET NOT NULL;

CREATE INDEX checkins_user_id_idx ON public.checkins(user_id);

DROP POLICY IF EXISTS "checkins_select_patient" ON public.checkins;
DROP POLICY IF EXISTS "checkins_insert_patient" ON public.checkins;

CREATE POLICY "checkins_insert_own"
  ON public.checkins FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('patient', 'primary_carer')
  );

CREATE POLICY "checkins_select_shared"
  ON public.checkins FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('patient', 'primary_carer', 'family', 'extended')
  );
