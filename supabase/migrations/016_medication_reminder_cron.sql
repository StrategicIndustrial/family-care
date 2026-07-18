-- =================================================================
-- 016 — Supabase-native cron for medication reminders
--
-- Rather than a Vercel Cron (vercel.json), the reminder check is
-- scheduled from inside Supabase itself: pg_cron fires every 15
-- minutes, pg_net makes the outbound HTTP call to our existing
-- /api/cron/medication-reminders Route Handler, and the shared secret
-- lives in Supabase Vault rather than a plaintext SQL literal.
--
-- IMPORTANT: this file intentionally does NOT contain the real secret
-- values — those were created directly against the live project via
-- the Supabase MCP (vault.create_secret), never committed to git. If
-- rebuilding this from scratch, replace the placeholders below with
-- your own values before running.
-- =================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Run once, replacing the placeholders — do not commit real values here:
-- select vault.create_secret('https://<your-deployment>/api/cron/medication-reminders', 'medication_reminder_url');
-- select vault.create_secret('<same value as the CRON_SECRET env var>', 'medication_reminder_cron_secret');

select cron.schedule(
  'medication-reminders-every-15-min',
  '*/15 * * * *',
  $$
  select
    net.http_post(
        url:= (select decrypted_secret from vault.decrypted_secrets where name = 'medication_reminder_url'),
        headers:=jsonb_build_object(
          'Content-type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'medication_reminder_cron_secret')
        ),
        body:='{}'::jsonb
    ) as request_id;
  $$
);
