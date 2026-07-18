-- =================================================================
-- 020 — multiple assignees per task
--
-- A task can now be assigned to more than one person, and self-assigning
-- ("I'll help too") adds a row rather than replacing the existing
-- assignee(s). tasks.assigned_to is left in place (nullable, no longer
-- written to going forward) rather than dropped, to avoid a disruptive
-- column removal — task_assignees is the source of truth from here on.
-- =================================================================

CREATE TABLE public.task_assignees (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX task_assignees_user_id_idx ON public.task_assignees(user_id);

-- Backfill from the existing single-assignee column.
INSERT INTO public.task_assignees (task_id, user_id)
SELECT id, assigned_to FROM public.tasks WHERE assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Visible to anyone who can already see the parent task — this EXISTS
-- runs under the caller's own session, so it inherits whatever the
-- tasks_select_* policies already decided (same pattern verified
-- working for task_hidden_from in migration 018).
CREATE POLICY "task_assignees_select"
  ON public.task_assignees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_assignees.task_id));

-- primary_carer/family manage the full assignee list (multi-select, replace-all).
CREATE POLICY "task_assignees_insert_privileged"
  ON public.task_assignees FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('primary_carer', 'family'));

CREATE POLICY "task_assignees_delete_privileged"
  ON public.task_assignees FOR DELETE TO authenticated
  USING (get_my_role() IN ('primary_carer', 'family'));

-- family/extended can additively claim/join a task — insert their own
-- row without touching anyone else's. This is the "adding self doesn't
-- remove the original assignment" requirement.
CREATE POLICY "task_assignees_insert_self"
  ON public.task_assignees FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND get_my_role() IN ('family', 'extended'));

-- -----------------------------------------------------------------
-- tasks_select_patient: was scoped to assigned_to = auth.uid(); now
-- checks task_assignees membership since assigned_to is no longer
-- kept in sync.
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select_patient" ON public.tasks;
CREATE POLICY "tasks_select_patient"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    get_my_role() = 'patient'
    AND visibility = 'everyone'
    AND EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.task_hidden_from WHERE task_id = tasks.id AND user_id = auth.uid())
  );

-- -----------------------------------------------------------------
-- extended: replace the old "claim only when unassigned" update policy
-- (assigned_to IS NULL) with "can update a task they're an assignee
-- of" — claiming now goes through task_assignees rather than
-- assigned_to, and this also lets an extended user mark their own
-- claimed task done (previously impossible once assigned_to was set —
-- a pre-existing gap this closes as a side effect).
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_claim_extended" ON public.tasks;
CREATE POLICY "tasks_update_extended"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'extended'
    AND EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
  )
  WITH CHECK (
    get_my_role() = 'extended'
    AND EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid())
  );
