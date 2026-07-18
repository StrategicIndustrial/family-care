-- =================================================================
-- 008 — RLS policies for invite_codes and push_subscriptions
--
-- Both tables had RLS enabled with zero policies (flagged by Supabase's
-- advisor as rls_enabled_no_policy) — meaning every request through
-- PostgREST was silently denied, with no policy explaining why.
--
-- invite_codes: the app currently only touches this table via the
-- service-role client (admin panel, signup action, hook_before_user_created
-- as SECURITY DEFINER) — none of which go through RLS at all. This policy
-- exists so that if a client ever queries invite_codes with the user's own
-- session, only admins can, rather than silently getting nothing back.
--
-- push_subscriptions: schema-only today (Web Push not yet built), but when
-- it lands, the browser will insert/read/delete its own subscription using
-- the user's session — never the service role. Standard "own rows only".
-- =================================================================

CREATE POLICY invite_codes_admin_all ON public.invite_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY push_subscriptions_own_rows ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
