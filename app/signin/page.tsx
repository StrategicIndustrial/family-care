import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";
import { SignInForm } from "@/components/auth/SignInForm";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code:    "That link didn't include a sign-in code — request a fresh one below.",
  exchange_failed: "That link looks like it was sent to a different browser. Request a new one from this browser.",
  verify_failed:   "That link couldn't be verified — request a fresh one below.",
  otp_expired:     "That sign-in link has expired — request a fresh one below.",
  access_denied:   "That sign-in link was rejected — request a fresh one below.",
  no_profile:      "We couldn't find a profile for that account — ask the admin to set one up.",
  no_user:         "Something went wrong signing you in — try again.",
  no_email:        "We couldn't find an email on file. Ask the admin to update it.",
};

export default async function SignInPage({
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
  }

  const errorMessage = error ? ERROR_MESSAGES[error] ?? "Sign-in failed — try again." : null;

  return (
    <main className="flex-1 flex flex-col hdr-cream anim-slide-up">
      <div className="w-full max-w-sm mx-auto px-6 flex flex-col flex-1">
        {/* Back */}
        <div className="pt-14 pb-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 text-sage-600"
            aria-label="Back"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        <h1 className="text-[22px] font-extrabold text-text-dark mb-6">Welcome back</h1>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border-2 border-peach-200 bg-peach-100 text-peach-600 text-sm font-bold px-4 py-3">
            {errorMessage}
          </div>
        )}

        <SignInForm />

        <div className="mt-auto pb-10 text-center">
          <Link href="/signup" className="text-sm text-text-mid">
            New to Family Care?{" "}
            <span className="text-sage-600 font-extrabold">Create account</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
