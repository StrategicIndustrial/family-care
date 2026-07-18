-- =================================================================
-- 009 — keep tasks.attending_user_id in sync with assigned_to
--
-- attending_user_id (added in 006) tracks who is actually handling a
-- task right now, distinct from assigned_to (the "owner of record" set
-- by claim/reassign). Without this trigger every write path
-- (createTask, claimTask, reassignTask) would need to remember to set
-- attending_user_id too — instead it defaults from assigned_to
-- automatically, and only the takeover action ever sets it to a
-- different person.
-- =================================================================

CREATE OR REPLACE FUNCTION public.sync_attending_user_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  -- Auto-populate attending_user_id when it's not explicitly provided.
  if new.assigned_to is not null and new.attending_user_id is null then
    new.attending_user_id := new.assigned_to;
  end if;
  -- Clear attending_user_id when a task is unassigned, unless the
  -- statement explicitly set it to something other than the old value
  -- (i.e. a takeover happening in the same write as an unassign).
  -- OLD only exists on UPDATE — guard with TG_OP so INSERT doesn't error.
  if TG_OP = 'UPDATE' and new.assigned_to is null and old.assigned_to is not null and new.attending_user_id = old.attending_user_id then
    new.attending_user_id := null;
  end if;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS trg_sync_attending_user_id ON public.tasks;
CREATE TRIGGER trg_sync_attending_user_id
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.sync_attending_user_id();

-- Backfill existing rows so already-claimed tasks have an attending user.
UPDATE public.tasks SET attending_user_id = assigned_to
WHERE assigned_to IS NOT NULL AND attending_user_id IS NULL;
