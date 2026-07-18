-- =================================================================
-- 022 — restore EXECUTE on is_task_assignee()
--
-- Same mistake as migration 002/003: revoking EXECUTE from
-- `authenticated` also blocks the function from being invoked during
-- RLS policy evaluation for that role (confirmed live — querying
-- tasks as the patient role failed with "permission denied for
-- function is_task_assignee" right after 021 revoked it). Restore it,
-- matching get_my_role()'s final grant state.
-- =================================================================

GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid) TO authenticated, anon;
