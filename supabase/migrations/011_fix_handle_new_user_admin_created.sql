-- =================================================================
-- 011 — fix handle_new_user() blocking admin-created accounts
--
-- handle_new_user() (an AFTER INSERT trigger on auth.users) predates
-- this repo's migrations — it's leftover from the earlier out-of-band
-- Replit-era session, never previously captured here. It unconditionally
-- required a valid invite_codes.code in the new user's metadata, raising
-- an exception otherwise. Raising inside an AFTER INSERT trigger rolls
-- back the whole auth.users insert, so GoTrue reports a generic
-- "Database error creating new user" (500) — exactly what broke
-- /admin/setup's "add a new user", since createProfile() creates users
-- directly with an admin-chosen role and never sets invite_code.
--
-- Fix: only require the invite code when the metadata doesn't already
-- carry a role (i.e. the public self-signup path via app/signup/actions.ts
-- + hook_before_user_created). Admin-created accounts already send
-- `role` directly in user_metadata (see createProfile in
-- app/admin/setup/actions.ts) — skip the invite-code gate for those.
-- =================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_code text;
  v_role public.user_role;
  v_role_meta text;
begin
  v_role_meta := nullif(trim(NEW.raw_user_meta_data->>'role'), '');

  if v_role_meta is not null then
    v_role := v_role_meta::public.user_role;
  else
    v_code := nullif(trim(NEW.raw_user_meta_data->>'invite_code'), '');

    select role into v_role
    from public.invite_codes
    where code = v_code and active = true;

    if v_role is null then
      raise exception 'A valid invite code is required to sign up';
    end if;
  end if;

  insert into public.profiles (id, full_name, preferred_name, role)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name',      split_part(NEW.email, '@', 1)),
    coalesce(NEW.raw_user_meta_data->>'preferred_name', split_part(NEW.email, '@', 1)),
    v_role
  )
  on conflict (id) do nothing;

  return NEW;
end;
$function$;

-- Captured here for repo parity — the trigger itself already exists
-- live, this just documents/reproduces it for a fresh bootstrap.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
