import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";
import type { EmailOtpType } from "@supabase/supabase-js";

// Magic link callback. Supabase appends either:
//   - ?code=...                              (PKCE flow, same-browser only)
//   - ?token_hash=...&type=magiclink         (verify-otp flow, cross-browser)
//
// We support both: if the user requested the link from this browser,
// the PKCE code verifier is present and exchangeCodeForSession works. If
// an admin triggered the link, the PKCE verifier lives in the admin's
// browser, so we fall back to verifyOtp on the token_hash.
//
// Use the user returned by the exchange/verify directly — getUser()
// would re-read the REQUEST cookies which may still hold a stale session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // Surface any Supabase-side error (e.g. otp_expired) to the sign-in page.
  const supabaseError = searchParams.get("error");
  if (supabaseError) {
    return NextResponse.redirect(`${origin}/signin?error=${supabaseError}`);
  }

  const supabase = await getSupabaseServerClient();
  let userId: string | undefined;

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error || !data?.user) {
      return NextResponse.redirect(`${origin}/signin?error=verify_failed`);
    }
    userId = data.user.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.user) {
      return NextResponse.redirect(`${origin}/signin?error=exchange_failed`);
    }
    userId = data.user.id;
  } else {
    return NextResponse.redirect(`${origin}/signin?error=missing_code`);
  }

  // Look up role with service-role so we bypass any stale RLS-session binding.
  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile?.role) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/signin?error=no_profile`);
  }

  const target = next && next.startsWith("/") ? next : ROLE_HOME[profile.role];
  return NextResponse.redirect(`${origin}${target}`);
}
