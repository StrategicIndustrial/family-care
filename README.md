# Family Care

A private PWA for a family in Western Australia coordinating care for Mum, who has early-stage
dementia. Built with Next.js (App Router), Supabase (Postgres + Auth + RLS), and the Anthropic API.

Four roles, four views:

| Role | Route | Who |
|---|---|---|
| `patient` | `/mum` | Mum — large-text, warm, single-scroll, no navigation |
| `primary_carer` | `/dad` | Dad — daily dashboard, meds, tasks, quick-post updates |
| `family` | `/family` | Sons — full coordination, bottom tab nav |
| `extended` | `/extended` | Siblings — read-only feed + claimable visit/transport tasks |

---

## Stack

- **Next.js 16** (App Router, Server Actions)
- **Tailwind CSS v4** (`@theme` tokens in `app/globals.css` — sage/peach/lavender/sky palette, Nunito font)
- **Supabase** — Postgres, Auth (magic link), Row Level Security on every table
- **Anthropic API** (`claude-sonnet-4-6`) — Dad's "Polish this ✨" update composer
- **bcryptjs** — PIN hashing for Mum/Dad's optional device PIN

---

## Running it locally (or after a fresh import)

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

The dev server is pinned to **port 3001** (`next dev -p 3001` in `package.json`'s `dev` script) —
open http://localhost:3001.

### Environment variables

All required vars are listed in [`.env.example`](.env.example). None of them are optional for the
app to function:

```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase Dashboard → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # same page → anon public key
SUPABASE_SERVICE_ROLE_KEY=         # same page → service_role key (Reveal). Server-only, never exposed to the browser.
ANTHROPIC_API_KEY=                 # console.anthropic.com — powers Dad's "Polish this" button
ADMIN_PASSWORD=                    # second factor for /admin/setup, on top of the per-user is_admin flag
FAMILY_INVITE_CODE=                # shared code /signup checks before sending a magic link
```

`.env.local` is gitignored — it will **not** come across on a GitHub import. Whoever runs this
next needs to create it fresh with real Supabase project credentials (see below).

---

## Supabase setup

The schema lives in `supabase/migrations/`, applied in order (001 → 005 currently). If you're
standing up a **new** Supabase project rather than reusing the existing one:

1. Create a project at supabase.com — region `ap-southeast-2` (Sydney) is what the brief specifies
   for a Western Australia family, but any region works functionally.
2. Run every file in `supabase/migrations/` against it, in numeric order, via the SQL Editor or
   `supabase db push`.
3. Authentication → Providers → Email: enable, turn **off** "Confirm email" (magic link only, no
   password signup flow for family/extended roles).
4. Authentication → Sessions: enable refresh token rotation, JWT expiry `604800` (7 days).
5. Authentication → URL Configuration: add your dev/prod URLs to Site URL and Redirect URLs
   (`<url>/auth/callback`).
6. Grab the Project URL, anon key, and service_role key into `.env.local`.
7. Use `/admin/setup` (password-gated by `ADMIN_PASSWORD`) to create the first few users. The
   very first admin needs `profiles.is_admin = true` set directly in the database — see migration
   004 for how the bootstrap admin was seeded, or run:
   ```sql
   UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
   ```

**If reusing the existing Supabase project** (recommended for Replit/staging copies that should
share real family data), just copy the same three Supabase env vars — no migrations to run.

---

## Project structure

```
/app
  /page.tsx                  Landing (redirects signed-in users to their role home)
  /signin, /signup           Magic-link auth + invite-code gated signup
  /auth/callback              Route handler — exchanges the magic-link code for a session
  /(protected)
    /layout.tsx               Auth + role guard + PIN gate for every route below
    /mum, /dad, /family, /extended   Role-specific views
  /admin/setup                Password + is_admin gated user/medication management
/components
  /ui                        Card, Button, Badge, Avatar, TimeField — shared primitives
  /auth, /mum, /dad, /family, /shared
/lib
  /supabase/{client,server,session,types}.ts
  /anthropic.ts               Claude API wrapper (server-only)
  /pin.ts, /pin-session.ts    bcrypt hash + HMAC-signed unlock cookies
  /admin-session.ts           Per-user is_admin check + password cookie
/supabase/migrations           Numbered SQL migrations, apply in order
/scripts
  generate-design-export.mjs  Regenerates static HTML snapshots in /design-export
```

---

## Design reference

`/design-export/*.html` are self-contained static snapshots of every screen (seed data, no
backend) — useful for pasting into a design tool or sharing a look-and-feel reference without
running the app. Regenerate with:

```bash
node scripts/generate-design-export.mjs
```

Served live via GitHub Pages at `https://strategicindustrial.github.io/family-care/design-export/`.

---

## A note on parallel prototypes

If you're looking at this repo alongside a Replit (or other) copy of "Family Care" built from a
Claude Design export: that copy is a **from-scratch rebuild** by an AI agent working only from
static HTML mockups, not an import of this codebase. It may use a different stack entirely (Vite
instead of Next.js, its own auth implementation, etc.) and can diverge in behaviour — route
mix-ups between Mum's and Dad's views have been observed in at least one such rebuild. This
repository is the source of truth; treat design-export snapshots as visual reference only.
