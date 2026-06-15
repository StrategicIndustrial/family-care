import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_HOME, allowedRolesForPath } from "@/lib/roles";
import { isPinUnlocked } from "@/lib/pin-session";
import { PinScreen } from "@/components/auth/PinScreen";
import { IdleWatcher } from "@/components/auth/IdleWatcher";

// Server-side guard for every route under (protected):
//   1. Require a Supabase session — else bounce to /
//   2. Read role from profiles
//   3. If the user is on a path that doesn't match their role, redirect them home
//   4. For patient/primary_carer with pin_enabled, render PinScreen until unlocked
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
    .select("role, preferred_name, pin_enabled")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    await supabase.auth.signOut();
    redirect("/?error=no_profile");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const allowed = allowedRolesForPath(pathname);

  if (allowed && !allowed.includes(profile.role)) {
    redirect(ROLE_HOME[profile.role]);
  }

  const pinRequired =
    (profile.role === "patient" || profile.role === "primary_carer") &&
    profile.pin_enabled;

  if (pinRequired) {
    const unlocked = await isPinUnlocked(user.id);
    if (!unlocked) {
      return (
        <PinScreen
          preferredName={profile.preferred_name}
          warm={profile.role === "patient"}
        />
      );
    }
  }

  return (
    <>
      {children}
      {pinRequired && <IdleWatcher />}
    </>
  );
}
