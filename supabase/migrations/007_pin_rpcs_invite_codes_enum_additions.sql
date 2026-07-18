-- =================================================================
-- 007 — PIN RPCs, invite-code auth hook, appointment/medication additions
--
-- Same status as 006: these already exist live, reconstructed here for
-- repo parity via schema introspection (pg_proc, information_schema).
-- =================================================================

-- -----------------------------------------------------------------
-- PIN handling via Postgres RPCs using pgcrypto's bcrypt (crypt/gen_salt),
-- rather than hashing/comparing in the Next.js server layer. Cleaner than
-- our original lib/pin.ts approach: the PIN never needs a service-role
-- read of pin_hash — verify_my_pin runs as the calling user via
-- SECURITY DEFINER bound to auth.uid(), returns only a boolean.
-- Requires the pgcrypto extension.
-- -----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_my_pin(new_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if new_pin !~ '^\d{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;
  update public.profiles
     set pin_hash = crypt(new_pin, gen_salt('bf')),
         pin_enabled = true
   where id = auth.uid();
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_my_pin(candidate text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
declare
  stored text;
begin
  if auth.uid() is null then
    return false;
  end if;
  select pin_hash into stored from public.profiles where id = auth.uid();
  if stored is null then
    return false;
  end if;
  return stored = crypt(candidate, stored);
end;
$function$;

CREATE OR REPLACE FUNCTION public.disable_my_pin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles
     set pin_enabled = false,
         pin_hash = null
   where id = auth.uid();
end;
$function$;

-- Only the calling user's own row is ever touched (auth.uid()-bound), so
-- these are safe to expose to authenticated directly — no admin bypass.
GRANT EXECUTE ON FUNCTION public.set_my_pin(text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_my_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_my_pin()    TO authenticated;


-- -----------------------------------------------------------------
-- Auth Hook: rejects signup unless a valid, active invite_codes.code
-- was passed in the new user's metadata as `invite_code`. This must
-- additionally be wired up in Supabase Dashboard → Authentication →
-- Hooks → "Before User Created" (a migration alone does not attach it
-- — the hook has to be selected in the dashboard/config.toml).
-- Replaces the app-layer FAMILY_INVITE_CODE env var check in
-- app/signup/actions.ts with a database-enforced one that can't be
-- bypassed by calling the Supabase Auth API directly.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hook_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_code text;
  v_ok   int;
begin
  v_code := nullif(trim(event->'user'->'user_metadata'->>'invite_code'), '');

  select count(*) into v_ok
  from public.invite_codes
  where code = v_code and active = true;

  if v_ok = 0 then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 400,
        'message', 'A valid family invite code is required to create an account.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$function$;


-- -----------------------------------------------------------------
-- appointments: categorise by type (was free-text `specialist` only).
-- -----------------------------------------------------------------
CREATE TYPE appt_type AS ENUM ('gp', 'specialist', 'scan_test', 'dental', 'allied_health', 'other');

ALTER TABLE public.appointments
  ADD COLUMN appt_type appt_type NOT NULL DEFAULT 'other';


-- -----------------------------------------------------------------
-- medications: configurable reminder times (e.g. '{08:00,20:00}').
-- Phase 4+ item — schema-only until notifications are built.
-- -----------------------------------------------------------------
ALTER TABLE public.medications
  ADD COLUMN reminder_times text[] NOT NULL DEFAULT '{}';
