-- =================================================================
-- 013 — patient (Leanne) gets Chronicle access
--
-- Chronicle becomes her compiled "what's going on" medical view — she
-- can both read and add medical notes/results herself, not just view
-- them. Observations stays untouched (never admits patient) and
-- Export/AI Insights remain gated in the app layer, not RLS, since
-- they're carer/family tools layered on top of the same read access
-- rather than separate tables.
-- =================================================================

DROP POLICY IF EXISTS "medical_notes_read" ON public.medical_notes;
CREATE POLICY "medical_notes_read"
  ON public.medical_notes FOR SELECT TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family', 'patient'));

DROP POLICY IF EXISTS "medical_notes_insert" ON public.medical_notes;
CREATE POLICY "medical_notes_insert"
  ON public.medical_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('primary_carer', 'family', 'patient')
  );
