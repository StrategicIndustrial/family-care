import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_HOME, roleForPath } from "@/lib/roles";

// Server-side guard for every route under (protected):
//   1. Require a Supabase session — else bounce to /
//   2. Read role from profiles
//   3. If the user is on a path that doesn't match their role, redirect them home
//
// PIN gating (patient + primary_carer) is layered on top in Step 6 — a client
// component reads pin_enabled and renders the PIN screen before children.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, preferred_name")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    await supabase.auth.signOut();
    redirect("/?error=no_profile");
  }

  // Use the x-pathname header set by the proxy to determine current path.
  // Next 16 doesn't expose pathname in server components directly.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const requestedRole = roleForPath(pathname);

  if (requestedRole && requestedRole !== profile.role) {
    redirect(ROLE_HOME[profile.role]);
  }

  return <>{children}</>;
}
