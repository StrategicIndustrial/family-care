import Link from "next/link";

export const dynamic = "force-dynamic";

// No Observations link — that stays carer-only regardless of role.
const LINKS = [
  { href: "/family/chronicle", title: "Chronicle", subtitle: "Your medical timeline & notes", icon: "📄" },
  { href: "/mum/medical/medications", title: "Medications", subtitle: "Your medicines & doses", icon: "💊" },
];

export default function MumMedicalHub() {
  return (
    <main className="flex-1 pb-28 anim-fade-in">
      <header className="hdr-peach-soft px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-extrabold text-white">Medical & Healthcare</h1>
          <p className="text-sm text-white/85 mt-1">Your medications and medical notes</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)] flex items-center gap-3"
          >
            <span className="text-2xl" aria-hidden="true">{l.icon}</span>
            <div className="flex-1">
              <div className="font-extrabold text-text-dark">{l.title}</div>
              <div className="text-xs text-text-mid mt-0.5">{l.subtitle}</div>
            </div>
            <span className="text-text-mid">›</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
