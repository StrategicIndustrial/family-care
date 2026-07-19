-- =================================================================
-- 023 — family chat: one shared group thread
--
-- A single conversation every profile (patient/primary_carer/family/
-- extended) is a member of — no DMs, no per-role visibility split, so
-- RLS is the simplest in the app: any authenticated user with a
-- profile row can read everything and insert their own messages.
-- =================================================================

CREATE TABLE public.messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_created_at_idx ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_any_profile"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Cheap unread-badge mechanism — coarse "last seen" timestamp per
-- profile rather than full per-message read receipts.
ALTER TABLE public.profiles ADD COLUMN chat_last_read_at timestamptz;
