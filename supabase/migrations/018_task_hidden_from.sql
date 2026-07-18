-- =================================================================
-- 018 — per-task privacy blocklist
--
-- A task keeps its normal visibility tier (everyone/family_only/private)
-- plus an optional list of specific people to additionally hide it
-- from — e.g. visible to family, except one person.
--
-- task_hidden_from needs a SELECT policy for `authenticated` scoped to
-- auth.uid() — not just service-role access — because the four
-- tasks_select_* policies below reference it in an EXISTS() subquery.
-- RLS is evaluated per-table even inside another table's policy, so
-- without this, the EXISTS() would always see zero rows (confirmed live:
-- omitting it silently made the blocklist a no-op — every hidden user
-- could still see the task — caught only by testing with a real
-- simulated session, not by reading the SQL).
-- =================================================================

CREATE TABLE public.task_hidden_from (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

ALTER TABLE public.task_hidden_from ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_hidden_from_select_own"
  ON public.task_hidden_from FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tasks_select_patient" ON public.tasks;
CREATE POLICY "tasks_select_patient"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'patient'::user_role) AND (assigned_to = auth.uid()) AND (visibility = 'everyone'::task_visibility)
    AND NOT EXISTS (SELECT 1 FROM public.task_hidden_from WHERE task_id = tasks.id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_select_primary_carer" ON public.tasks;
CREATE POLICY "tasks_select_primary_carer"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'primary_carer'::user_role) AND ((visibility <> 'private'::task_visibility) OR (created_by = auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.task_hidden_from WHERE task_id = tasks.id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_select_family" ON public.tasks;
CREATE POLICY "tasks_select_family"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'family'::user_role) AND ((visibility <> 'private'::task_visibility) OR (created_by = auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.task_hidden_from WHERE task_id = tasks.id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_select_extended" ON public.tasks;
CREATE POLICY "tasks_select_extended"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    (get_my_role() = 'extended'::user_role) AND ((visibility <> 'private'::task_visibility) OR (created_by = auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.task_hidden_from WHERE task_id = tasks.id AND user_id = auth.uid())
  );
