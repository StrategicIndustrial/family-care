import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";

// Magic link callback. Supabase appends ?code=… to the redirect URL.
// We exchange it for a session, then route to the role's home.
//
// IMPORTANT: exchangeCodeForSession writes the new session cookies to the
// response, but a subsequent supabase.auth.getUser() reads from the REQUEST
// cookies — which still contain any previous session. So we use the user
// returned by the exchange directly to avoid a session-collision bug where
// clicking another user's magic link while signed in routes you to your
// own role home.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !exchangeData?.user) {
    return NextResponse.redirect(`${origin}/?error=exchange_failed`);
  }

  const userId = exchangeData.user.id;

  // Use service-role to read role — request-time RLS would also still be
  // bound to the old session here.
  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile?.role) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=no_profile`);
  }

  const target = next && next.startsWith("/") ? next : ROLE_HOME[profile.role];
  return NextResponse.redirect(`${origin}${target}`);
}
