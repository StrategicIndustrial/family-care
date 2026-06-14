-- =================================================================
-- 003 — restore EXECUTE on get_my_role()
--
-- Migration 002 was too aggressive: get_my_role() is called by nearly
-- every RLS policy, and the policies run as the `authenticated` role,
-- so revoking EXECUTE broke INSERT/UPDATE/DELETE across the board.
--
-- The advisor warning about /rpc/get_my_role exposure is acceptable
-- here — calling it via RPC just returns the caller's own role, which
-- they already know. handle_new_user() stays locked down because it's
-- trigger-only and should never be RPC-callable.
-- =================================================================

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon;
