import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";

// Magic link callback. Supabase appends ?code=… to the redirect URL.
// We exchange it for a session, then route to the role's home.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next"); // optional override for PIN/lock flows later

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/?error=exchange_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/?error=no_user`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    // Auth succeeded but no profile row — sign them out and surface a friendly error.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=no_profile`);
  }

  const target = next && next.startsWith("/") ? next : ROLE_HOME[profile.role];
  return NextResponse.redirect(`${origin}${target}`);
}
