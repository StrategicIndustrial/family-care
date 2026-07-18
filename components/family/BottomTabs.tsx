"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/cx";

type Tab = { href: string; label: string; icon: string };

type Props = {
  homeHref: "/family" | "/dad";
};

export function BottomTabs({ homeHref }: Props) {
  const pathname = usePathname();

  const TABS: Tab[] = [
    { href: homeHref,               label: "Home",         icon: "🏠" },
    { href: "/family/tasks",        label: "Tasks",        icon: "✅" },
    { href: "/family/appointments", label: "Calendar",     icon: "🗓️" },
    { href: "/family/medical",      label: "Medical",      icon: "⚕️" },
    { href: "/family/updates",      label: "Updates",      icon: "💬" },
    { href: "/family/profile",      label: "Profile",      icon: "👤" },
  ];

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-30
                 rounded-3xl bg-white/95 backdrop-blur
                 shadow-[0_8px_32px_rgba(0,0,0,0.15)]
                 px-2 py-2
                 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{ bottom: 24, width: "min(400px, calc(100% - 24px))" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-6">
        {TABS.map((tab) => {
          const isHome = tab.href === "/family" || tab.href === "/dad";
          const active = isHome ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 py-2 rounded-2xl",
                  active ? "text-sage-600 font-bold" : "text-text-mid hover:text-text-dark",
                )}
              >
                <span aria-hidden="true" className="text-lg leading-none">{tab.icon}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
