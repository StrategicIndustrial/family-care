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
  }

  const errorMessage = error ? AUTH_ERROR_MESSAGES[error] ?? "Sign-in failed — try again." : null;

  return (
    <main className="flex-1 flex items-center justify-center hdr-cream anim-fade-in">
      <div className="w-full max-w-sm px-8 py-14 flex flex-col items-center min-h-screen">
        {/* Logo card */}
        <div className="flex-1 flex flex-col items-center justify-center gap-7">
          <div
            className="h-22 w-22 rounded-3xl cta-sage flex items-center justify-center
                       shadow-[0_8px_24px_rgba(123,191,160,0.35)]"
            style={{ width: 88, height: 88 }}
            aria-hidden="true"
          >
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M22 8C17.6 8 14 11.6 14 16c0 3.2 1.8 6 4.4 7.5C12.8 25.3 9 29.7 9 35h26c0-5.3-3.8-9.7-9.4-11.5C28.2 22 30 19.2 30 16c0-4.4-3.6-8-8-8z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-text-dark tracking-tight">Family Care</h1>
            <p className="text-base text-text-mid leading-relaxed">
              Keeping your family connected,<br />one day at a time.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="w-full mb-4 rounded-2xl border-2 border-peach-200 bg-peach-100 text-peach-600 text-sm font-bold px-4 py-3">
            {errorMessage}
          </div>
        )}

        <div className="w-full">
          <SignInForm />
        </div>
      </div>
    </main>
  );
}
