-- =================================================================
-- 005 — task visibility/priority + appointment note split
--
-- From Family Care design context:
--   - Tasks gain a visibility tier: everyone / family_only (default) / private
--     - everyone: all roles including patient
--     - family_only: all except patient
--     - private: creator only
--   - Tasks gain a priority: low / medium / high
--   - Appointments split notes into:
--     - notes_before / notes_after   -> "open" notes, visible to patient too
--     - family_notes_before / family_notes_after -> hidden from patient
-- =================================================================

CREATE TYPE task_visibility AS ENUM ('everyone', 'family_only', 'private');
CREATE TYPE task_priority   AS ENUM ('low', 'medium', 'high');

ALTER TABLE public.tasks
  ADD COLUMN visibility task_visibility NOT NULL DEFAULT 'family_only',
  ADD COLUMN priority   task_priority   NOT NULL DEFAULT 'medium';

ALTER TABLE public.appointments
  ADD COLUMN family_notes_before text,
  ADD COLUMN family_notes_after  text;

-- -----------------------------------------------------------------
-- Replace tasks_select_patient to respect visibility.
-- Patient sees a task if: visibility = 'everyone' AND assigned_to = self.
-- (Unchanged from before other than the visibility check — patient still
-- only sees tasks assigned to her, per the original design.)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select_patient" ON public.tasks;
CREATE POLICY "tasks_select_patient"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    get_my_role() = 'patient'
    AND assigned_to = auth.uid()
    AND visibility = 'everyone'
  );

-- -----------------------------------------------------------------
-- Private tasks: only visible to their creator, regardless of role.
-- primary_carer/family already have "ALL" policies scoped to their own
-- role — we need to further restrict when visibility = 'private' so
-- only the creator sees those specific rows. Postgres RLS OR's policies
-- together per command, so we replace the blanket SELECT-via-ALL
-- policies with role + visibility-aware SELECT policies, and keep
-- separate INSERT/UPDATE/DELETE policies for full CRUD.
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_all_primary_carer" ON public.tasks;
DROP POLICY IF EXISTS "tasks_all_family" ON public.tasks;

CREATE POLICY "tasks_select_primary_carer"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    get_my_role() = 'primary_carer'
    AND (visibility <> 'private' OR created_by = auth.uid())
  );

CREATE POLICY "tasks_select_family"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    get_my_role() = 'family'
    AND (visibility <> 'private' OR created_by = auth.uid())
  );

CREATE POLICY "tasks_insert_primary_carer"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'primary_carer');

CREATE POLICY "tasks_insert_family"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'family');

CREATE POLICY "tasks_update_primary_carer"
  ON public.tasks FOR UPDATE TO authenticated
  USING    (get_my_role() = 'primary_carer')
  WITH CHECK (get_my_role() = 'primary_carer');

CREATE POLICY "tasks_update_family"
  ON public.tasks FOR UPDATE TO authenticated
  USING    (get_my_role() = 'family')
  WITH CHECK (get_my_role() = 'family');

CREATE POLICY "tasks_delete_primary_carer"
  ON public.tasks FOR DELETE TO authenticated
  USING (get_my_role() = 'primary_carer');

CREATE POLICY "tasks_delete_family"
  ON public.tasks FOR DELETE TO authenticated
  USING (get_my_role() = 'family');

-- extended: read all EXCEPT private tasks not their own
DROP POLICY IF EXISTS "tasks_select_extended" ON public.tasks;
CREATE POLICY "tasks_select_extended"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    get_my_role() = 'extended'
    AND (visibility <> 'private' OR created_by = auth.uid())
  );

-- extended claim policy unchanged (tasks_claim_extended from 001 still applies)
