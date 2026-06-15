"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/cx";

type Tab = { href: string; label: string; icon: string };

type Props = {
  // Where the Home tab links. /family for sons; /dad for primary_carer.
  homeHref: "/family" | "/dad";
};

export function BottomTabs({ homeHref }: Props) {
  const pathname = usePathname();

  const TABS: Tab[] = [
    { href: homeHref,               label: "Home",         icon: "🏠" },
    { href: "/family/tasks",        label: "Tasks",        icon: "📋" },
    { href: "/family/appointments", label: "Appointments", icon: "📅" },
    { href: "/family/updates",      label: "Updates",      icon: "💬" },
    { href: "/family/profile",      label: "Profile",      icon: "👤" },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-line bg-white
                 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 max-w-2xl mx-auto">
        {TABS.map((tab) => {
          // Home tabs are exact match (so "/family" doesn't light up on every /family/* route).
          const isHome = tab.href === "/family" || tab.href === "/dad";
          const active = isHome ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 py-2.5 text-xs",
                  active ? "text-primary" : "text-text-mid hover:text-text-dark",
                )}
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  {tab.icon}
                </span>
                <span className={active ? "font-medium" : ""}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
