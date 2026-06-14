import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export type SessionContext = {
  userId: string;
  role: UserRole;
  preferredName: string;
};

// Server helper: returns the authenticated user's id + role.
// Throws if not signed in or no profile row.
export async function requireSession(): Promise<SessionContext> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, preferred_name")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("No profile.");

  return { userId: user.id, role: profile.role, preferredName: profile.preferred_name };
}

export async function requireRole(...allowed: UserRole[]): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!allowed.includes(ctx.role)) throw new Error("Not allowed.");
  return ctx;
}
