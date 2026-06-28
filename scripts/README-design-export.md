# Design export

Static HTML snapshots of every view in the app for upload to Claude Design
(or any prototyping tool that imports HTML).

## Regenerate

```bash
node scripts/generate-design-export.mjs
```

Writes 14 files to `design-export/`:

| File                       | View                                       |
|----------------------------|--------------------------------------------|
| `index.html`               | Index linking to every other page          |
| `landing.html`             | Sign-in / magic-link form                  |
| `pin.html`                 | 4-digit PIN entry (Mum/Dad)                |
| `mum.html`                 | Mum's home (greeting, visits, meds, check-in) |
| `dad.html`                 | Dad's dashboard                            |
| `family-home.html`         | Family Home tab                            |
| `family-tasks.html`        | Tasks list with filter chips               |
| `family-tasks-new.html`    | New task form                              |
| `family-tasks-detail.html` | Task detail (assign + complete)            |
| `family-appointments.html` | Appointments list                          |
| `family-updates.html`      | Updates feed                               |
| `family-profile.html`      | Profile + admin link (when admin)          |
| `extended.html`            | Extended family read-only view             |
| `admin-setup.html`         | Admin user list + medications              |

## Bundle

```bash
tar -czf design-export.tar.gz design-export
```

Produces `design-export.tar.gz` (~9 KB) — small enough to attach anywhere.

## Implementation notes

- Each file is fully self-contained: Tailwind via CDN, Inter via Google Fonts,
  brief §9 colour tokens injected through `tailwind.config` at runtime.
- Seed data is hardcoded (Mum, Dad, Shawn, Teneale, James, sample meds, a
  Memory Clinic appointment, etc.) so views look populated.
- Avatars use inline `style="background:..."` with role-coded colours so no
  image dependencies are needed.
- Files are gitignored — they're build artefacts, not source.
