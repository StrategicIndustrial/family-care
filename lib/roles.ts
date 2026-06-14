import type { UserRole } from "@/lib/supabase/types";

// Where each role lands after auth. The (protected) layout enforces this —
// if the user is at the wrong path for their role, they get redirected.
export const ROLE_HOME: Record<UserRole, string> = {
  patient: "/mum",
  primary_carer: "/dad",
  family: "/family",
  extended: "/extended",
};

// Reverse lookup: given a path under (protected), which role owns it?
export function roleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/mum")) return "patient";
  if (pathname.startsWith("/dad")) return "primary_carer";
  if (pathname.startsWith("/family")) return "family";
  if (pathname.startsWith("/extended")) return "extended";
  return null;
}
