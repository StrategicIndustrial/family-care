import type { UserRole } from "@/lib/supabase/types";

// Where each role lands after auth. The (protected) layout enforces this —
// if the user is at the wrong path for their role, they get redirected.
export const ROLE_HOME: Record<UserRole, string> = {
  patient: "/mum",
  primary_carer: "/dad",
  family: "/family",
  extended: "/extended",
};

// Given a path under (protected), return the set of roles allowed to view it.
// /family/* is shared between primary_carer and family — Dad needs to see
// the same coordination pages (tasks, appointments, updates) the sons use.
export function allowedRolesForPath(pathname: string): UserRole[] | null {
  if (pathname.startsWith("/mum")) return ["patient"];
  if (pathname.startsWith("/dad")) return ["primary_carer"];
  // /family/updates is also accessible to patient (Leanne) — she sees the feed.
  if (pathname === "/family/updates") return ["patient", "primary_carer", "family"];
  if (pathname.startsWith("/family")) return ["primary_carer", "family"];
  if (pathname.startsWith("/extended")) return ["extended"];
  return null;
}
