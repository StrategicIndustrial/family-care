-- =================================================================
-- 015 — tasks.push_to_calendar (Stage H: per-task "send to my calendar")
-- =================================================================

ALTER TABLE public.tasks ADD COLUMN push_to_calendar boolean NOT NULL DEFAULT false;
