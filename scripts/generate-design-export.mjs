#!/usr/bin/env node
// Generates standalone HTML snapshots of every view, with seed data + the
// brief §9 design tokens inlined, for upload to Claude Design or similar
// prototyping tools. Each file is fully self-contained — Tailwind via CDN,
// Inter via Google Fonts, no relative dependencies.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "design-export");
await mkdir(out, { recursive: true });

// -------------------- Shared layout --------------------

function shell({ title, body, viewName, warm = false, withTabs = null }) {
  const bg = warm ? "bg-warm-bg" : "bg-white";
  return `<!doctype html>
<html lang="en-AU" class="h-full">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Family Care — ${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '#2563EB',
          'primary-light': '#EFF6FF',
          'warm-bg': '#FFFBF5',
          success: '#16A34A',
          warning: '#D97706',
          'text-dark': '#1C1C1E',
          'text-mid': '#6B7280',
          line: '#E5E7EB',
        },
        fontFamily: { sans: ['Inter','ui-sans-serif','system-ui','sans-serif'] },
      },
    },
  };
</script>
<style>
  html, body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
  body { font-size: 16px; line-height: 1.6; color: #1C1C1E; }
</style>
</head>
<body class="min-h-full ${bg}" data-view="${viewName}">
${body}
${withTabs ? renderTabs(withTabs) : ""}
</body>
</html>`;
}

function renderTabs(activeHref) {
  const tabs = [
    { href: "/family",              label: "Home",         icon: "🏠" },
    { href: "/family/tasks",        label: "Tasks",        icon: "📋" },
    { href: "/family/appointments", label: "Appointments", icon: "📅" },
    { href: "/family/updates",      label: "Updates",      icon: "💬" },
    { href: "/family/profile",      label: "Profile",      icon: "👤" },
  ];
  const cells = tabs.map((t) => {
    const isHome = t.href === "/family" || t.href === "/dad";
    const active = isHome ? activeHref === t.href : activeHref.startsWith(t.href);
    const cls = active ? "text-primary font-medium" : "text-text-mid";
    return `<li><a href="#" class="flex flex-col items-center gap-0.5 py-2.5 text-xs ${cls}">
      <span aria-hidden="true" class="text-xl leading-none">${t.icon}</span>
      <span>${t.label}</span>
    </a></li>`;
  }).join("");
  return `<nav class="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-white">
    <ul class="grid grid-cols-5 max-w-2xl mx-auto">${cells}</ul>
  </nav>`;
}

// -------------------- Seed data --------------------

const today = new Date("2026-06-15T09:00:00+08:00");
const fmtLong = new Intl.DateTimeFormat("en-AU", {
  weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Perth"
});
const fmtShort = new Intl.DateTimeFormat("en-AU", {
  weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Perth"
});

const PEOPLE = {
  shawn:   { preferred_name: "Shawn",   initials: "S",  bg: "#FECACA", fg: "#9F1239" },
  teneale: { preferred_name: "Teneale", initials: "T",  bg: "#BFDBFE", fg: "#1E40AF" },
  james:   { preferred_name: "James",   initials: "J",  bg: "#FBCFE8", fg: "#9D174D" },
  mum:     { preferred_name: "Mum",     initials: "M",  bg: "#FEF3C7", fg: "#92400E" },
  dad:     { preferred_name: "Dad",     initials: "D",  bg: "#BBF7D0", fg: "#166534" },
};

function avatar(p, size = "md") {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };
  return `<span class="inline-flex items-center justify-center rounded-full font-medium ${sizes[size]}" style="background:${p.bg};color:${p.fg}">${p.initials}</span>`;
}

function badge(text, tone = "neutral") {
  const tones = {
    neutral: "bg-zinc-100 text-text-mid",
    primary: "bg-primary-light text-primary",
    success: "bg-green-100 text-success",
    warning: "bg-amber-100 text-warning",
  };
  return `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}">${text}</span>`;
}

function card(inner, extraClass = "") {
  return `<div class="rounded-xl border border-line bg-white p-4 ${extraClass}">${inner}</div>`;
}

// -------------------- Views --------------------

const VIEWS = {};

// 1. Landing / sign-in --------------------------------
VIEWS["landing"] = shell({
  title: "Sign in",
  viewName: "landing",
  body: `
<main class="min-h-screen flex items-center justify-center px-6 py-12">
  <div class="w-full max-w-sm space-y-8">
    <header class="text-center space-y-2">
      <h1 class="text-3xl font-semibold text-text-dark">Family Care</h1>
      <p class="text-text-mid">Sign in with your email — we'll send you a link.</p>
    </header>
    <form class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-dark mb-2">Email address</label>
        <input type="email" value="you@example.com" class="w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-text-dark" />
      </div>
      <button type="button" class="w-full rounded-lg bg-primary px-4 py-3 text-base font-medium text-white">Send me a sign-in link</button>
    </form>
  </div>
</main>`,
});

// 2. PIN screen --------------------------------
VIEWS["pin"] = shell({
  title: "PIN entry",
  viewName: "pin",
  warm: true,
  body: `
<main class="min-h-screen flex items-center justify-center px-6 py-10">
  <div class="w-full max-w-sm text-center space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold text-text-dark">Hi Mum</h1>
      <p class="text-text-mid">Enter your 4-digit PIN to continue.</p>
    </header>
    <div class="flex justify-center gap-3">
      ${[1,2,3,4].map((i, idx) => `<input type="text" maxlength="1" value="${idx < 2 ? "•" : ""}" class="w-14 h-16 rounded-xl border-2 border-line bg-white text-center text-2xl font-semibold text-text-dark" />`).join("")}
    </div>
  </div>
</main>`,
});

// 3. Mum's home --------------------------------
VIEWS["mum"] = shell({
  title: "Mum's home",
  viewName: "mum",
  warm: true,
  body: `
<main class="min-h-screen px-6 py-10">
  <div class="max-w-lg mx-auto space-y-10">
    <header class="space-y-1">
      <h1 class="text-3xl sm:text-4xl font-semibold text-text-dark">Good morning, Mum ☀️</h1>
      <p class="text-lg text-text-mid">${fmtLong.format(today)}</p>
    </header>

    <section class="space-y-3">
      <h2 class="text-xl font-medium text-text-dark">Today</h2>
      <ul class="space-y-2">
        <li class="flex items-center gap-4 rounded-2xl bg-white border border-line p-4">
          ${avatar(PEOPLE.shawn, "lg")}
          <div class="flex-1">
            <div class="text-xl font-medium text-text-dark">Shawn</div>
            <div class="text-base text-text-mid">around 10:30 am</div>
          </div>
        </li>
        <li class="flex items-center gap-4 rounded-2xl bg-white border border-line p-4">
          ${avatar(PEOPLE.teneale, "lg")}
          <div class="flex-1">
            <div class="text-xl font-medium text-text-dark">Teneale</div>
            <div class="text-base text-text-mid">around 2:00 pm</div>
          </div>
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-medium text-text-dark">Coming up</h2>
      <ul class="space-y-2">
        <li class="flex items-center gap-4 rounded-2xl bg-white border border-line p-4">
          ${avatar(PEOPLE.james, "lg")}
          <div class="flex-1">
            <div class="text-xl font-medium text-text-dark">James</div>
            <div class="text-base text-text-mid">Tomorrow · 11:00 am</div>
          </div>
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-medium text-text-dark">Medications</h2>
      <div class="space-y-3">
        <div class="rounded-xl border border-green-200 bg-green-50 p-4">
          <div class="text-2xl font-semibold text-text-dark">Donepezil</div>
          <div class="text-lg text-text-mid">10mg · Once daily with breakfast</div>
          <div class="mt-4 flex items-center gap-2 text-success font-medium">
            <span>✓</span><span>Taken at 8:14 am</span>
          </div>
        </div>
        <div class="rounded-xl border border-line bg-white shadow-sm p-4">
          <div class="text-2xl font-semibold text-text-dark">Memantine</div>
          <div class="text-lg text-text-mid">5mg · Twice daily</div>
          <div class="mt-4">
            <button type="button" class="w-full rounded-2xl bg-primary text-white px-6 min-h-16 text-xl font-medium">✓ I've taken this</button>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-xl font-medium text-text-dark text-center">How are you feeling today?</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        ${[
          ["😊","Great"], ["🙂","Okay"], ["😔","Not great"]
        ].map(([emoji,label]) => `<button type="button" class="rounded-2xl bg-white border-2 border-line min-h-20 text-xl font-medium text-text-dark flex items-center justify-center gap-3"><span aria-hidden="true" class="text-3xl">${emoji}</span>${label}</button>`).join("")}
      </div>
    </section>

    <footer class="text-center pt-6">
      <p class="text-lg text-text-mid">The family is thinking of you.</p>
    </footer>
  </div>
</main>`,
});

// 4. Dad's dashboard --------------------------------
VIEWS["dad"] = shell({
  title: "Dad's dashboard",
  viewName: "dad",
  withTabs: "/dad",
  body: `
<main class="min-h-screen px-6 py-8 pb-24">
  <div class="max-w-2xl mx-auto space-y-10">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-text-dark">Hi Dad</h1>
        <p class="text-text-mid">${fmtLong.format(today)}</p>
        <p class="text-sm text-text-mid mt-1">2 tasks today · 1 appointment this week · Mum's meds due</p>
      </div>
      <button class="text-sm text-text-mid underline">Sign out</button>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-medium text-text-dark">Medications</h2>
      <div class="space-y-3">
        ${card(`
          <div>
            <div class="text-lg font-medium text-text-dark">Donepezil</div>
            <div class="text-sm text-text-mid">10mg · Once daily with breakfast</div>
          </div>
          <div class="mt-4 flex items-center gap-2 text-success font-medium">
            <span>✓</span><span>Logged at 8:14 am</span>
          </div>
        `, "border-green-200 bg-green-50")}
        ${card(`
          <div>
            <div class="text-lg font-medium text-text-dark">Memantine</div>
            <div class="text-sm text-text-mid">5mg · Twice daily</div>
          </div>
          <div class="mt-4">
            <button class="rounded-lg bg-success text-white px-4 py-3 font-medium text-base">Taken ✓</button>
          </div>
        `)}
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-baseline justify-between">
        <h2 class="text-lg font-medium text-text-dark">Today's tasks</h2>
        <a class="text-sm text-primary">All tasks</a>
      </div>
      <div class="space-y-2">
        ${card(`
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1.5">
                ${badge("🛒 Shopping")} ${badge("claimed", "primary")}
              </div>
              <div class="font-medium text-text-dark">Pick up groceries for Mum</div>
              <div class="text-sm text-text-mid mt-1">Today · 11:00 am</div>
            </div>
          </div>
          <div class="mt-3">
            <button class="rounded-lg bg-success text-white px-4 py-3 font-medium text-base">Done ✓</button>
          </div>
        `)}
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-baseline justify-between">
        <h2 class="text-lg font-medium text-text-dark">This week</h2>
        <a class="text-sm text-primary">All</a>
      </div>
      <div class="space-y-2">
        ${card(`
          <div class="flex items-baseline justify-between gap-3">
            <div>
              <div class="font-medium text-text-dark">Badminton</div>
              <div class="text-sm text-text-mid">Teneale</div>
            </div>
            <div class="text-sm text-text-mid">${fmtShort.format(new Date("2026-06-17"))}</div>
          </div>
        `, "py-3")}
        ${card(`
          <div class="flex items-baseline justify-between gap-3">
            <div>
              <div class="font-medium text-text-dark">Memory Clinic — Dr Nguyen</div>
              <div class="text-sm text-text-mid">Dr Nguyen</div>
              <div class="text-sm text-text-mid">Hollywood Private Hospital</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm font-medium text-text-dark">${fmtShort.format(new Date("2026-06-19"))}</div>
              <div class="text-xs text-text-mid">10:30 am</div>
            </div>
          </div>
        `)}
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium text-text-dark">Let the family know</h2>
      <button class="w-full rounded-lg bg-primary px-4 py-3 text-white font-medium">📢 Let the family know something</button>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium text-text-dark">Family updates</h2>
      <div class="space-y-3">
        ${card(`
          <header class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-3">
              ${avatar(PEOPLE.shawn, "sm")}
              <div>
                <div class="font-medium text-text-dark text-sm">Shawn</div>
                <div class="text-xs text-text-mid">2 hours ago</div>
              </div>
            </div>
          </header>
          <p class="text-text-dark">Mum had a quiet morning. Coffee on the verandah and a chat about the garden. She's in good spirits today.</p>
        `)}
        ${card(`
          <header class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-3">
              ${avatar(PEOPLE.teneale, "sm")}
              <div>
                <div class="font-medium text-text-dark text-sm">Teneale</div>
                <div class="text-xs text-text-mid">yesterday</div>
              </div>
            </div>
            ${badge("📢 Urgent", "warning")}
          </header>
          <p class="text-text-dark">Mum couldn't find her glasses this morning — we eventually found them in the fridge. Just a heads-up to keep an eye out.</p>
        `, "border-amber-300 bg-amber-50")}
      </div>
    </section>
  </div>
</main>`,
});

// 5. Family Home --------------------------------
VIEWS["family-home"] = shell({
  title: "Family — Home",
  viewName: "family-home",
  withTabs: "/family",
  body: `
<main class="min-h-screen px-6 py-8 pb-24">
  <div class="max-w-2xl mx-auto space-y-10">
    <header>
      <h1 class="text-2xl font-semibold text-text-dark">Welcome, Shawn</h1>
      <p class="text-text-mid">${fmtLong.format(today)}</p>
    </header>

    <section>
      ${card(`
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-text-mid">Mum's medication</div>
            <div class="font-medium text-text-dark">Logged today ✓</div>
          </div>
        </div>
      `, "bg-green-50 border-green-200")}
    </section>

    <section class="space-y-3">
      <div class="flex items-baseline justify-between">
        <h2 class="text-lg font-medium text-text-dark">Up for grabs</h2>
        <a class="text-sm text-primary">All</a>
      </div>
      <div class="space-y-2">
        ${card(`
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-1">${badge("🚶 Visit")}</div>
              <div class="font-medium text-text-dark">Sunday morning visit to Mum</div>
              <div class="text-sm text-text-mid">Sun 21 Jun · 10:30 am</div>
            </div>
            <button class="rounded-lg bg-primary text-white px-4 py-3 font-medium">Claim it</button>
          </div>
        `)}
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-baseline justify-between">
        <h2 class="text-lg font-medium text-text-dark">This week</h2>
        <a class="text-sm text-primary">All tasks</a>
      </div>
      <div class="space-y-2">
        ${card(`
          <div class="flex items-baseline justify-between gap-3">
            <div>
              <div class="font-medium text-text-dark">Badminton</div>
              <div class="text-sm text-text-mid">Teneale</div>
            </div>
            <div class="text-sm text-text-mid">${fmtShort.format(new Date("2026-06-17"))}</div>
          </div>
        `, "py-3")}
        ${card(`
          <div class="flex items-baseline justify-between gap-3">
            <div>
              <div class="font-medium text-text-dark">Memory Clinic — Dr Nguyen</div>
              <div class="text-sm text-text-mid">Dr Nguyen</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-sm font-medium text-text-dark">${fmtShort.format(new Date("2026-06-19"))}</div>
              <div class="text-xs text-text-mid">10:30 am</div>
            </div>
          </div>
        `)}
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-baseline justify-between">
        <h2 class="text-lg font-medium text-text-dark">Recent updates</h2>
        <a class="text-sm text-primary">All</a>
      </div>
      <div class="space-y-3">
        ${card(`
          <header class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-3">
              ${avatar(PEOPLE.dad, "sm")}
              <div>
                <div class="font-medium text-text-dark text-sm">Dad</div>
                <div class="text-xs text-text-mid">3 hours ago</div>
              </div>
            </div>
          </header>
          <p class="text-text-dark">Mum slept well — first uninterrupted night in a while. She enjoyed her oats this morning.</p>
        `)}
      </div>
    </section>
  </div>
</main>`,
});

// 6. Family Tasks --------------------------------
VIEWS["family-tasks"] = shell({
  title: "Family — Tasks",
  viewName: "family-tasks",
  withTabs: "/family/tasks",
  body: `
<main class="min-h-screen px-6 py-8 pb-24">
  <div class="max-w-2xl mx-auto space-y-6">
    <header class="flex items-baseline justify-between">
      <h1 class="text-2xl font-semibold text-text-dark">Tasks</h1>
      <button class="rounded-lg bg-primary text-white px-4 py-3 font-medium text-base">+ New</button>
    </header>

    <nav class="flex flex-wrap gap-2">
      <a class="rounded-full px-3 py-1.5 text-sm border bg-primary text-white border-primary">All</a>
      <a class="rounded-full px-3 py-1.5 text-sm border bg-white text-text-mid border-line">This week</a>
      <a class="rounded-full px-3 py-1.5 text-sm border bg-white text-text-mid border-line">Unclaimed</a>
      <a class="rounded-full px-3 py-1.5 text-sm border bg-white text-text-mid border-line">Mine</a>
    </nav>

    <div class="space-y-2">
      ${card(`
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1.5">${badge("🚶 Visit")} ${badge("claimed", "primary")}</div>
            <div class="font-medium text-text-dark">Badminton</div>
            <div class="text-sm text-text-mid mt-1">Wed 17 Jun · 11:00 am</div>
          </div>
          ${avatar(PEOPLE.teneale, "sm")}
        </div>
      `)}
      ${card(`
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1.5">${badge("🛒 Shopping")} ${badge("claimed", "primary")}</div>
            <div class="font-medium text-text-dark">Pick up groceries for Mum</div>
            <div class="text-sm text-text-mid mt-1">Today · 11:00 am</div>
          </div>
          ${avatar(PEOPLE.dad, "sm")}
        </div>
      `)}
      ${card(`
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1.5">${badge("🚶 Visit")} ${badge("open")}</div>
            <div class="font-medium text-text-dark">Sunday morning visit to Mum</div>
            <div class="text-sm text-text-mid mt-1">Sun 21 Jun · 10:30 am</div>
          </div>
        </div>
      `)}
    </div>

    <section class="space-y-2 pt-6 border-t border-line">
      <h2 class="text-sm font-medium text-text-mid uppercase tracking-wide">Recently done</h2>
      <div class="space-y-2 opacity-70">
        ${card(`
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1.5">${badge("🛒 Shopping")} ${badge("done", "success")}</div>
              <div class="font-medium text-text-dark">Chemist pickup</div>
              <div class="text-sm text-text-mid mt-1">Yesterday</div>
            </div>
            ${avatar(PEOPLE.shawn, "sm")}
          </div>
        `)}
      </div>
    </section>
  </div>
</main>`,
});

// 7. Family Tasks — New --------------------------------
VIEWS["family-tasks-new"] = shell({
  title: "Family — New task",
  viewName: "family-tasks-new",
  withTabs: "/family/tasks",
  body: `
<main class="min-h-screen px-6 py-8 pb-24">
  <div class="max-w-md mx-auto space-y-6">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-text-dark">New task</h1>
      <a class="text-sm text-text-mid underline">Cancel</a>
    </header>

    <form class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Title <span class="text-warning">*</span></label>
        <input value="Visit Mum" class="w-full rounded-lg border border-line bg-white px-3 py-2 text-base" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Notes (optional)</label>
        <textarea rows="3" class="w-full rounded-lg border border-line bg-white px-3 py-2 text-base">Stay for a cuppa and walk her dog</textarea>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Type *</label>
        <select class="w-full rounded-lg border border-line bg-white px-3 py-2 text-base">
          <option>🚶 Visit</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Date</label>
        <input type="date" value="2026-06-19" class="w-full rounded-lg border border-line bg-white px-3 py-2 text-base" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Time <span class="text-text-mid font-normal">(optional)</span></label>
        <div class="grid grid-cols-[1fr_auto] gap-2 items-stretch">
          <select class="rounded-lg border border-line bg-white px-3 py-2 text-base">
            <option>10:00 am</option>
          </select>
          <input type="time" value="10:00" class="rounded-lg border border-line bg-white px-3 py-2 text-base w-32" />
        </div>
        <p class="text-xs text-text-mid mt-1">Pick a half-hour from the list, or type any time on the right.</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Assign to</label>
        <select class="w-full rounded-lg border border-line bg-white px-3 py-2 text-base">
          <option>Leave unassigned</option>
        </select>
      </div>
      <div class="flex gap-2 pt-2">
        <button type="button" class="rounded-lg bg-primary text-white px-4 py-3 font-medium flex-1">Create task</button>
      </div>
    </form>
  </div>
</main>`,
});

// 8. Family Tasks — Detail --------------------------------
VIEWS["family-tasks-detail"] = shell({
  title: "Family — Task detail",
  viewName: "family-tasks-detail",
  withTabs: "/family/tasks",
  body: `
<main class="min-h-screen px-6 py-8 pb-24">
  <div class="max-w-md mx-auto space-y-6">
    <a class="text-sm text-primary">← Back</a>

    <div class="space-y-2">
      <div class="flex items-center gap-2">${badge("🚶 Visit")} ${badge("claimed", "primary")}</div>
      <h1 class="text-2xl font-semibold text-text-dark">Badminton</h1>
      <p class="text-text-mid">Wed 17 Jun · 11:00 am</p>
    </div>

    ${card(`<p class="text-text-dark">Pick up Mum at 10:30 — she likes to be early.</p>`)}

    <div class="rounded-xl border border-line bg-white p-4 space-y-3">
      <div class="text-sm font-medium text-text-dark">Assigned to</div>
      <form class="flex items-center gap-2">
        <select class="rounded border border-line bg-white px-2 py-1.5 text-sm"><option>Teneale</option></select>
        <button class="border border-line bg-white text-text-dark rounded-lg px-4 py-3 font-medium text-base">Save &amp; back</button>
      </form>
    </div>

    <div class="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3 mt-10">
      <div class="text-sm font-medium text-text-dark">When the task is finished</div>
      <p class="text-sm text-text-mid">Marks this task complete and removes it from the active list.</p>
      <button class="rounded-lg bg-success text-white px-4 py-3 font-medium text-base">Mark task complete</button>
    </div>
  </div>
</main>`,
});

// 9. Family Appointments --------------------------------
VIEWS["family-appointments"] = shell({
  title: "Family — Appointments",
  viewName: "family-appointments",
  withTabs: "/family/appointments",
  body: `
<main class="min-h-screen px-6 py-8 pb-24">
  <div class="max-w-2xl mx-auto space-y-6">
    <header class="flex items-baseline justify-between">
      <h1 class="text-2xl font-semibold text-text-dark">Appointments</h1>
      <button class="rounded-lg bg-primary text-white px-4 py-3 font-medium text-base">+ New</button>
    </header>

    <div class="flex gap-3 text-sm">
      <a class="text-primary font-medium">Upcoming</a>
      <a class="text-text-mid underline">History</a>
    </div>

    <div class="space-y-2">
      ${card(`
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <div class="font-medium text-text-dark">Memory Clinic — Dr Nguyen</div>
            <div class="text-sm text-text-mid">Dr Nguyen</div>
            <div class="text-sm text-text-mid">Hollywood Private Hospital</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-sm font-medium text-text-dark">Fri 19 Jun</div>
            <div class="text-xs text-text-mid">10:30 am</div>
          </div>
        </div>
      `)}
      ${card(`
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <div class="font-medium text-text-dark">GP follow-up</div>
            <div class="text-sm text-text-mid">Dr Patel</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-sm font-medium text-text-dark">Wed 8 Jul</div>
            <div class="text-xs text-text-mid">2:00 pm</div>
          </div>
        </div>
      `)}
    </div>
  </div>
</main>`,
});

// 10. Family Updates --------------------------------
VIEWS["family-updates"] = shell({
  title: "Family — Updates",
  viewName: "family-updates",
  withTabs: "/family/updates",
  body: `
<main class="min-h-screen px-6 py-8 pb-24">
  <div class="max-w-2xl mx-auto space-y-6">
    <header>
      <h1 class="text-2xl font-semibold text-text-dark">Updates</h1>
      <p class="text-text-mid">Flagged updates appear first.</p>
    </header>

    <button class="w-full rounded-lg bg-primary px-4 py-3 text-white font-medium text-base">Post an update</button>

    <div class="space-y-3">
      ${card(`
        <header class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center gap-3">
            ${avatar(PEOPLE.teneale, "sm")}
            <div>
              <div class="font-medium text-text-dark text-sm">Teneale</div>
              <div class="text-xs text-text-mid">yesterday</div>
            </div>
          </div>
          ${badge("📢 Urgent", "warning")}
        </header>
        <p class="text-text-dark">Mum couldn't find her glasses this morning — we eventually found them in the fridge. Just a heads-up to keep an eye out.</p>
      `, "border-amber-300 bg-amber-50")}
      ${card(`
        <header class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center gap-3">
            ${avatar(PEOPLE.dad, "sm")}
            <div>
              <div class="font-medium text-text-dark text-sm">Dad</div>
              <div class="text-xs text-text-mid">3 hours ago</div>
            </div>
          </div>
        </header>
        <p class="text-text-dark">Mum slept well — first uninterrupted night in a while. She enjoyed her oats this morning.</p>
      `)}
      ${card(`
        <header class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center gap-3">
            ${avatar(PEOPLE.shawn, "sm")}
            <div>
              <div class="font-medium text-text-dark text-sm">Shawn</div>
              <div class="text-xs text-text-mid">2 days ago</div>
            </div>
          </div>
        </header>
        <p class="text-text-dark">Took Mum for a drive along the coast. She loved watching the surfers.</p>
      `)}
    </div>
  </div>
</main>`,
});

// 11. Family Profile --------------------------------
VIEWS["family-profile"] = shell({
  title: "Family — Profile",
  viewName: "family-profile",
  withTabs: "/family/profile",
  body: `
<main class="min-h-screen px-6 py-8 pb-24">
  <div class="max-w-md mx-auto space-y-6">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-text-dark">Profile</h1>
      <button class="text-sm text-text-mid underline">Sign out</button>
    </header>

    ${card(`
      <div class="text-sm text-text-mid">Signed in as</div>
      <div class="font-medium text-text-dark">shawn@example.com</div>
      <div class="text-sm text-text-mid mt-1">Role: family</div>
    `, "space-y-1")}

    <form class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Full name</label>
        <input value="Shawn Cole" disabled class="w-full rounded-lg border border-line bg-zinc-50 px-3 py-2 text-base text-text-mid" />
        <p class="text-xs text-text-mid mt-1">Changed by the admin via /admin/setup.</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Preferred name <span class="text-warning">*</span></label>
        <input value="Shawn" class="w-full rounded-lg border border-line bg-white px-3 py-2 text-base" />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Phone</label>
        <input value="0412 345 678" type="tel" class="w-full rounded-lg border border-line bg-white px-3 py-2 text-base" />
      </div>
      <button class="rounded-lg bg-primary text-white px-4 py-3 font-medium text-base">Save changes</button>
    </form>

    ${card(`
      <div class="text-sm font-medium text-text-dark">Notification preferences</div>
      <p class="text-sm text-text-mid mt-1">Coming in Phase 2 — email and push alerts for flagged updates and new tasks.</p>
    `)}

    ${card(`
      <div class="text-sm font-medium text-text-dark">Admin</div>
      <p class="text-sm text-text-mid">Manage users, set PINs, and edit Mum's medications. Requires the admin password.</p>
      <a class="inline-block rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-text-dark">Open admin setup →</a>
    `, "space-y-2")}
  </div>
</main>`,
});

// 12. Extended --------------------------------
VIEWS["extended"] = shell({
  title: "Extended family",
  viewName: "extended",
  body: `
<main class="min-h-screen px-6 py-8">
  <div class="max-w-2xl mx-auto space-y-10">
    <header class="flex items-baseline justify-between">
      <h1 class="text-2xl font-semibold text-text-dark">Family Care</h1>
      <button class="text-sm text-text-mid underline">Sign out</button>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-medium text-text-dark">Updates</h2>
      <div class="space-y-3">
        ${card(`
          <header class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-3">
              ${avatar(PEOPLE.dad, "sm")}
              <div>
                <div class="font-medium text-text-dark text-sm">Dad</div>
                <div class="text-xs text-text-mid">3 hours ago</div>
              </div>
            </div>
          </header>
          <p class="text-text-dark">Mum slept well — first uninterrupted night in a while.</p>
        `)}
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium text-text-dark">Where you can help</h2>
      <div class="space-y-2">
        ${card(`
          <div class="flex items-start justify-between gap-3">
            <div>
              ${badge("🚶 Visit")}
              <div class="font-medium text-text-dark mt-1.5">Sunday morning visit to Mum</div>
              <div class="text-sm text-text-mid">Sun 21 Jun · 10:30 am</div>
            </div>
            <button class="rounded-lg bg-primary text-white px-4 py-3 font-medium text-base">I can help</button>
          </div>
        `)}
        ${card(`
          <div class="flex items-start justify-between gap-3">
            <div>
              ${badge("🚗 Transport")}
              <div class="font-medium text-text-dark mt-1.5">Drive Mum to physio</div>
              <div class="text-sm text-text-mid">Thu 18 Jun · 2:00 pm</div>
            </div>
            <button class="rounded-lg bg-primary text-white px-4 py-3 font-medium text-base">I can help</button>
          </div>
        `)}
      </div>
    </section>
  </div>
</main>`,
});

// 13. Admin setup --------------------------------
VIEWS["admin-setup"] = shell({
  title: "Admin setup",
  viewName: "admin-setup",
  body: `
<main class="min-h-screen px-6 py-10 bg-zinc-50">
  <div class="max-w-3xl mx-auto space-y-10">
    <a class="inline-block text-sm text-primary">← Back to app</a>
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Admin setup</h1>
      <button class="text-sm text-text-mid underline">End admin session</button>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">Users (4)</h2>
      <ul class="divide-y divide-line rounded-xl border border-line bg-white">
        <li class="p-4 space-y-3">
          <div class="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <div class="font-medium flex items-center gap-2">
                Shawn <span class="text-sm text-text-mid font-normal">(Shawn Cole)</span>
                <span class="inline-flex items-center rounded-full bg-primary-light text-primary px-2 py-0.5 text-xs font-medium">Admin</span>
              </div>
              <div class="text-sm text-text-mid">shawn@example.com · family</div>
              <div class="text-xs text-text-mid mt-0.5">Last sign-in: 15 Jun, 9:14 am</div>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button class="rounded border border-line text-text-dark px-3 py-1.5 text-sm">Revoke admin</button>
              <button class="rounded bg-primary text-white px-3 py-1.5 text-sm font-medium">Send sign-in link</button>
              <button class="rounded border border-amber-300 text-warning px-3 py-1.5 text-sm">Delete</button>
            </div>
          </div>
        </li>
        <li class="p-4 space-y-3">
          <div class="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <div class="font-medium flex items-center gap-2">
                Dad <span class="text-sm text-text-mid font-normal">(David Cole)</span>
              </div>
              <div class="text-sm text-text-mid">dad@example.com · primary_carer</div>
              <div class="text-xs text-text-mid mt-0.5">Last sign-in: 15 Jun, 10:01 am</div>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button class="rounded border border-line text-text-dark px-3 py-1.5 text-sm">Make admin</button>
              <button class="rounded bg-primary text-white px-3 py-1.5 text-sm font-medium">Send sign-in link</button>
              <button class="rounded border border-amber-300 text-warning px-3 py-1.5 text-sm">Delete</button>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <input value="••••" class="rounded border border-line px-3 py-1.5 text-sm w-32" />
              <button class="rounded bg-primary text-white px-3 py-1.5 text-sm">Reset PIN</button>
            </div>
            <button class="rounded border border-line px-3 py-1.5 text-sm text-text-mid">Disable PIN</button>
          </div>
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-medium">Medications</h2>
      <ul class="divide-y divide-line rounded-xl border border-line bg-white">
        <li class="p-4 flex items-center justify-between">
          <div>
            <div class="font-medium">Donepezil <span class="text-sm text-text-mid">10mg</span></div>
            <div class="text-sm text-text-mid">Once daily with breakfast</div>
          </div>
          <button class="rounded border border-line px-3 py-1.5 text-sm text-text-mid">Deactivate</button>
        </li>
        <li class="p-4 flex items-center justify-between">
          <div>
            <div class="font-medium">Memantine <span class="text-sm text-text-mid">5mg</span></div>
            <div class="text-sm text-text-mid">Twice daily</div>
          </div>
          <button class="rounded border border-line px-3 py-1.5 text-sm text-text-mid">Deactivate</button>
        </li>
      </ul>
    </section>
  </div>
</main>`,
});

// -------------------- Write files --------------------

for (const [name, html] of Object.entries(VIEWS)) {
  await writeFile(join(out, `${name}.html`), html);
  console.log(`✓ ${name}.html`);
}

// Index page linking to all of them
const index = `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8"><title>Family Care — Design export</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>html,body{font-family:'Inter',ui-sans-serif,system-ui,sans-serif;}</style>
</head>
<body class="bg-zinc-50 min-h-screen px-6 py-10">
<div class="max-w-2xl mx-auto space-y-6">
  <header>
    <h1 class="text-2xl font-semibold">Family Care — Design export</h1>
    <p class="text-zinc-600">Static snapshots of every view, fully self-contained for upload to Claude Design or any design tool that imports HTML.</p>
  </header>
  <ul class="space-y-2 rounded-xl border bg-white">
    ${Object.keys(VIEWS).map((n) => `<li class="p-3 border-b last:border-0"><a class="text-blue-600 hover:underline" href="${n}.html">${n}.html</a></li>`).join("")}
  </ul>
</div>
</body>
</html>`;
await writeFile(join(out, "index.html"), index);
console.log("✓ index.html");
