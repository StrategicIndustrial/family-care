import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";
import { SignInForm } from "@/components/auth/SignInForm";

// Landing — magic link sign-in. If already authenticated, jump to role view.
export default async function Home() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) redirect(ROLE_HOME[profile.role]);
    // Authed but no profile row — shouldn't happen post-trigger.
    // Fall through to the sign-in screen.
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-text-dark">Family Care</h1>
          <p className="text-text-mid">Sign in with your email — we'll send you a link.</p>
        </header>
        <SignInForm />
      </div>
    </main>
  );
}
