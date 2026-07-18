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
  // /family/updates and /family/profile are also accessible to patient (Leanne).
  if (pathname === "/family/updates") return ["patient", "primary_carer", "family"];
  if (pathname === "/family/profile") return ["patient", "primary_carer", "family"];
  // Chronicle is Leanne's compiled medical view too (add + view notes/results,
  // never Observations, never Export/AI Insights — enforced in the page itself).
  if (pathname.startsWith("/family/chronicle")) return ["patient", "primary_carer", "family"];
  // Leanne's own calendar view lives at /mum/tasks, not the carer's
  // /family/appointments list — but she reaches the same new/detail
  // pages from it (create/edit an appointment), so those subpaths admit
  // her too while the bare list stays carer-only.
  if (pathname === "/family/appointments") return ["primary_carer", "family"];
  if (pathname.startsWith("/family/appointments/")) return ["patient", "primary_carer", "family"];
  if (pathname.startsWith("/family")) return ["primary_carer", "family"];
  if (pathname.startsWith("/extended")) return ["extended"];
  return null;
}
