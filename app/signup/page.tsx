import Link from "next/link";
import { submitSignUp } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Please fill in both fields.",
  bad_code:       "That invite code isn't correct — check the code your family administrator sent you.",
  not_found:      "We couldn't find an account with that email — ask the admin to set it up first.",
  send_failed:    "Couldn't send the sign-in link — try again in a moment.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? "Something went wrong — try again." : null;

  if (sent === "1") {
    return (
      <main className="flex-1 flex flex-col hdr-cream anim-slide-up">
        <div className="w-full max-w-sm mx-auto px-6 flex flex-col flex-1">
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
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-4">
            <div className="text-5xl" aria-hidden="true">💌</div>
            <div>
              <h1 className="text-2xl font-extrabold text-text-dark mb-2">Check your email</h1>
              <p className="text-base text-text-mid leading-relaxed">
                We&apos;ve sent a sign-in link to your inbox.<br />
                Tap it to open the app.
              </p>
            </div>
          </div>
          <div className="pb-10 text-center">
            <Link href="/signin" className="text-sm text-sage-600 font-extrabold">
              Back to Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

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

        <h1 className="text-[22px] font-extrabold text-text-dark mb-2">Create your account</h1>

        {/* Info banner */}
        <div className="mb-5 rounded-2xl bg-sage-50 border-2 border-sage-100 px-4 py-3 flex gap-3 items-start">
          <span className="text-lg flex-shrink-0" aria-hidden="true">ℹ️</span>
          <p className="text-sm text-sage-text leading-relaxed">
            You need an invite code from your family administrator to join. Check your email for the code they sent you.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl border-2 border-peach-200 bg-peach-100 text-peach-600 text-sm font-bold px-4 py-3">
            {errorMessage}
          </div>
        )}

        <form action={submitSignUp} className="flex flex-col gap-5 flex-1">
          <div>
            <label htmlFor="email" className="block text-sm font-extrabold text-sage-text mb-2">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder="your@email.com"
              className="w-full rounded-2xl border-2 border-sage-100 bg-white px-4 py-3.5 text-base font-semibold text-text-dark
                         focus:outline-none focus:border-sage-500"
            />
          </div>

          <div>
            <label htmlFor="invite_code" className="block text-sm font-extrabold text-sage-text mb-2">
              Invite code
            </label>
            <input
              id="invite_code"
              name="invite_code"
              type="text"
              autoCapitalize="characters"
              autoComplete="off"
              required
              placeholder="e.g. FAM-2024-ABCD"
              className="w-full rounded-2xl border-2 border-sage-100 bg-white px-4 py-3.5 text-base font-semibold text-text-dark
                         focus:outline-none focus:border-sage-500 uppercase tracking-widest"
            />
          </div>

          <div className="mt-auto pb-10 flex flex-col gap-3">
            <button
              type="submit"
              className="w-full py-[17px] cta-sage rounded-2xl text-white text-lg font-extrabold"
            >
              Continue →
            </button>
            <div className="text-center">
              <Link href="/signin" className="text-sm text-text-mid">
                Already have an account?{" "}
                <span className="text-sage-600 font-extrabold">Sign in</span>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
