-- =================================================================
-- 004 — per-user admin flag
--
-- Adds profiles.is_admin so admin status is identifiable per-user
-- rather than only by knowing the shared ADMIN_PASSWORD. The password
-- gate stays as a second factor; this column controls who is allowed
-- to clear it.
--
-- Seeds the original admin (Shawn) by email. Subsequent admins are
-- granted via /admin/setup by an existing admin.
-- =================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
SET is_admin = TRUE
WHERE id = (
  SELECT id FROM auth.users WHERE lower(email) = 'shawnleecole@gmail.com'
);
