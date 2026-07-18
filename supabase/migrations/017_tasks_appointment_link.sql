-- =================================================================
-- 017 — link tasks to an appointment (Stage F)
--
-- Lets a task represent "help related to this appointment" (driving,
-- accompanying, follow-up) — shown on the patient's calendar as who's
-- attached to that appointment, and in the helper's own task list as
-- usual, just with a "Re: <appointment>" subtitle.
-- =================================================================

ALTER TABLE public.tasks ADD COLUMN appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;
CREATE INDEX tasks_appointment_id_idx ON public.tasks(appointment_id);
