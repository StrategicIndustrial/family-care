import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";
import { SignInForm } from "@/components/auth/SignInForm";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_code:    "That link didn't include a sign-in code — request a fresh one below.",
  exchange_failed: "That link looks like it was sent to a different browser. Request a new one from this browser.",
  verify_failed:   "That link couldn't be verified — request a fresh one below.",
  otp_expired:     "That sign-in link has expired — request a fresh one below.",
  access_denied:   "That sign-in link was rejected — request a fresh one below.",
  no_profile:      "We couldn't find a profile for that account — ask the admin to set one up.",
  no_user:         "Something went wrong signing you in — try again.",
  no_email:        "We couldn't find an email on file. Ask the admin to update it.",
};

// Landing — magic link sign-in. If already authenticated, jump to role view.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user && !error) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) redirect(ROLE_HOME[profile.role]);
    // Authed but no profile row — shouldn't happen post-trigger.
    // Fall through to the sign-in screen.
  }

  const errorMessage = error ? AUTH_ERROR_MESSAGES[error] ?? "Sign-in failed — try again." : null;

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-text-dark">Family Care</h1>
          <p className="text-text-mid">Sign in with your email — we'll send you a link.</p>
        </header>

        {errorMessage && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 text-warning text-sm px-4 py-3">
            {errorMessage}
          </div>
        )}

        <SignInForm />
      </div>
    </main>
  );
}
