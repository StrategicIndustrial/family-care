-- =================================================================
-- 002 — lock down SECURITY DEFINER functions
--
-- Migration 001 exposes get_my_role() and handle_new_user() via the
-- PostgREST RPC endpoint. They are only meant to be called internally
-- (RLS policies / triggers), so revoke EXECUTE from anon and
-- authenticated. They keep working inside the database because the
-- table_owner role still has EXECUTE.
-- =================================================================

REVOKE EXECUTE ON FUNCTION public.get_my_role()    FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
