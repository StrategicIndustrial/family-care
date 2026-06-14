-- =================================================================
-- OpenClaw Family Care App — Initial Schema
-- =================================================================


-- =================================================================
-- 1. Enum Types
-- =================================================================

CREATE TYPE user_role   AS ENUM ('patient', 'primary_carer', 'family', 'extended');
CREATE TYPE task_type   AS ENUM ('visit', 'shopping', 'transport', 'appointment', 'other');
CREATE TYPE task_status AS ENUM ('open', 'claimed', 'done');
CREATE TYPE mood_type   AS ENUM ('great', 'okay', 'not_great');


-- =================================================================
-- 2. Tables
-- =================================================================

-- profiles: extends auth.users, one row per user
CREATE TABLE public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text        NOT NULL,
  preferred_name  text        NOT NULL,
  role            user_role   NOT NULL,
  avatar_url      text,
  phone           text,
  pin_hash        text,                          -- bcrypt hash, patient/primary_carer only
  pin_enabled     boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- updates: family noticeboard entries
CREATE TABLE public.updates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        text        NOT NULL,
  is_flagged  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- tasks: visits, shopping, transport, errands, respite
CREATE TABLE public.tasks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  description   text,
  task_type     task_type   NOT NULL,
  due_date      date,
  due_time      time,
  assigned_to   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        task_status NOT NULL DEFAULT 'open',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- appointments: medical and specialist appointments
CREATE TABLE public.appointments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  location          text,
  appointment_date  date        NOT NULL,
  appointment_time  time,
  specialist        text,
  notes_before      text,
  notes_after       text,
  created_by        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- medications: static reference list of Mum's medications
CREATE TABLE public.medications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  dosage      text        NOT NULL,
  frequency   text        NOT NULL,
  prescriber  text,
  notes       text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- medication_logs: daily confirmation that medications were taken
CREATE TABLE public.medication_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id   uuid        NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  logged_by       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  taken_at        timestamptz NOT NULL DEFAULT now(),
  notes           text
);

-- checkins: Mum's daily wellbeing check-in — private, not visible to others
-- No user_id FK by design: there is exactly one patient, access is gated by role.
CREATE TABLE public.checkins (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mood        mood_type   NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- =================================================================
-- 3. Enable Row Level Security on all tables
-- =================================================================

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins        ENABLE ROW LEVEL SECURITY;


-- =================================================================
-- 4. Helper: current user's role
-- Reads from profiles table so role can never be spoofed via JWT.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- =================================================================
-- 5. Trigger: create profile row on auth.users insert
-- Admin setup passes metadata so the trigger can populate all fields.
-- The admin route then UPDATEs to set pin_hash if required.
-- =================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, preferred_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',      split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'preferred_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'extended')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =================================================================
-- 6. RLS Policies — profiles
-- =================================================================

-- Every authenticated user can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Every authenticated user can update their own profile
-- (which fields are allowed is enforced at the app layer)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());


-- =================================================================
-- 7. RLS Policies — updates
-- =================================================================

-- patient: unflagged updates only
CREATE POLICY "updates_select_patient"
  ON public.updates FOR SELECT TO authenticated
  USING (get_my_role() = 'patient' AND is_flagged = false);

-- primary_carer, family, extended: all updates
CREATE POLICY "updates_select_others"
  ON public.updates FOR SELECT TO authenticated
  USING (get_my_role() IN ('primary_carer', 'family', 'extended'));

-- primary_carer and family: can post updates
CREATE POLICY "updates_insert"
  ON public.updates FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('primary_carer', 'family')
    AND author_id = auth.uid()
  );

-- primary_carer: can update any update (e.g. to flag as urgent)
CREATE POLICY "updates_update_primary_carer"
  ON public.updates FOR UPDATE TO authenticated
  USING (get_my_role() = 'primary_carer');

-- family: can only update their own updates
CREATE POLICY "updates_update_family_own"
  ON public.updates FOR UPDATE TO authenticated
  USING (get_my_role() = 'family' AND author_id = auth.uid());

-- primary_carer: can delete any update
CREATE POLICY "updates_delete_primary_carer"
  ON public.updates FOR DELETE TO authenticated
  USING (get_my_role() = 'primary_carer');

-- family: can delete their own updates
CREATE POLICY "updates_delete_family_own"
  ON public.updates FOR DELETE TO authenticated
  USING (get_my_role() = 'family' AND author_id = auth.uid());


-- =================================================================
-- 8. RLS Policies — tasks
-- =================================================================

-- patient: read only tasks assigned to them
CREATE POLICY "tasks_select_patient"
  ON public.tasks FOR SELECT TO authenticated
  USING (get_my_role() = 'patient' AND assigned_to = auth.uid());

-- primary_carer: full CRUD
CREATE POLICY "tasks_all_primary_carer"
  ON public.tasks FOR ALL TO authenticated
  USING    (get_my_role() = 'primary_carer')
  WITH CHECK (get_my_role() = 'primary_carer');

-- family: full CRUD
CREATE POLICY "tasks_all_family"
  ON public.tasks FOR ALL TO authenticated
  USING    (get_my_role() = 'family')
  WITH CHECK (get_my_role() = 'family');

-- extended: read all tasks
CREATE POLICY "tasks_select_extended"
  ON public.tasks FOR SELECT TO authenticated
  USING (get_my_role() = 'extended');

-- extended: can claim an unclaimed task (set assigned_to = self, status = 'claimed')
CREATE POLICY "tasks_claim_extended"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'extended'
    AND assigned_to IS NULL
    AND status = 'open'
  )
  WITH CHECK (
    assigned_to = auth.uid()
    AND status = 'claimed'
  );


-- =================================================================
-- 9. RLS Policies — appointments
-- =================================================================

-- primary_carer: full CRUD
CREATE POLICY "appointments_all_primary_carer"
  ON public.appointments FOR ALL TO authenticated
  USING    (get_my_role() = 'primary_carer')
  WITH CHECK (get_my_role() = 'primary_carer');

-- family: full CRUD
CREATE POLICY "appointments_all_family"
  ON public.appointments FOR ALL TO authenticated
  USING    (get_my_role() = 'family')
  WITH CHECK (get_my_role() = 'family');

-- patient and extended: no access (no policy = denied)


-- =================================================================
-- 10. RLS Policies — medications
-- =================================================================

-- patient: read active medications only
CREATE POLICY "medications_select_patient"
  ON public.medications FOR SELECT TO authenticated
  USING (get_my_role() = 'patient' AND is_active = true);

-- primary_carer: full CRUD
CREATE POLICY "medications_all_primary_carer"
  ON public.medications FOR ALL TO authenticated
  USING    (get_my_role() = 'primary_carer')
  WITH CHECK (get_my_role() = 'primary_carer');

-- family: read only
CREATE POLICY "medications_select_family"
  ON public.medications FOR SELECT TO authenticated
  USING (get_my_role() = 'family');


-- =================================================================
-- 11. RLS Policies — medication_logs
-- =================================================================

-- patient: read and insert their own logs
CREATE POLICY "medication_logs_select_patient"
  ON public.medication_logs FOR SELECT TO authenticated
  USING (get_my_role() = 'patient' AND logged_by = auth.uid());

CREATE POLICY "medication_logs_insert_patient"
  ON public.medication_logs FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'patient' AND logged_by = auth.uid());

-- primary_carer: full CRUD
CREATE POLICY "medication_logs_all_primary_carer"
  ON public.medication_logs FOR ALL TO authenticated
  USING    (get_my_role() = 'primary_carer')
  WITH CHECK (get_my_role() = 'primary_carer');

-- family: read only
CREATE POLICY "medication_logs_select_family"
  ON public.medication_logs FOR SELECT TO authenticated
  USING (get_my_role() = 'family');


-- =================================================================
-- 12. RLS Policies — checkins
-- =================================================================

-- patient only: read and write their own check-ins
-- Role check is the sole guard since checkins has no user FK.
CREATE POLICY "checkins_select_patient"
  ON public.checkins FOR SELECT TO authenticated
  USING (get_my_role() = 'patient');

CREATE POLICY "checkins_insert_patient"
  ON public.checkins FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'patient');

-- All other roles: no access


-- =================================================================
-- 13. Indexes
-- =================================================================

CREATE INDEX updates_created_at_idx           ON public.updates(created_at DESC);
CREATE INDEX tasks_status_idx                 ON public.tasks(status);
CREATE INDEX tasks_due_date_idx               ON public.tasks(due_date);
CREATE INDEX tasks_assigned_to_idx            ON public.tasks(assigned_to);
CREATE INDEX appointments_date_idx            ON public.appointments(appointment_date);
CREATE INDEX medication_logs_medication_idx   ON public.medication_logs(medication_id);
CREATE INDEX medication_logs_taken_at_idx     ON public.medication_logs(taken_at DESC);
CREATE INDEX medication_logs_logged_by_idx    ON public.medication_logs(logged_by);
