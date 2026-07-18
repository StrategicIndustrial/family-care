-- =================================================================
-- 021 — fix infinite recursion between tasks and task_assignees RLS
--
-- tasks_select_patient (020) checks task_assignees via a plain EXISTS,
-- and task_assignees_select (020) checks tasks via a plain EXISTS —
-- each subquery runs under RLS, so evaluating one re-triggers the
-- other, forever. Caught live: querying tasks as the patient errored
-- with "infinite recursion detected in policy for relation tasks."
--
-- Fix: break the cycle with a SECURITY DEFINER function that reads
-- task_assignees directly, bypassing its RLS (same technique as
-- get_my_role() bypassing profiles RLS) — so the tasks policy no
-- longer triggers task_assignees' own policy evaluation.
-- =================================================================

CREATE OR REPLACE FUNCTION public.is_task_assignee(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = p_task_id AND user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_task_assignee(uuid) FROM anon, authenticated, public;

DROP POLICY IF EXISTS "tasks_select_patient" ON public.tasks;
CREATE POLICY "tasks_select_patient"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    get_my_role() = 'patient'
    AND visibility = 'everyone'
    AND public.is_task_assignee(tasks.id)
    AND NOT EXISTS (SELECT 1 FROM public.task_hidden_from WHERE task_id = tasks.id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_update_extended" ON public.tasks;
CREATE POLICY "tasks_update_extended"
  ON public.tasks FOR UPDATE TO authenticated
  USING (get_my_role() = 'extended' AND public.is_task_assignee(tasks.id))
  WITH CHECK (get_my_role() = 'extended' AND public.is_task_assignee(tasks.id));
