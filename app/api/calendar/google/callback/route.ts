import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/calendar/crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function verifyState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAtStr, sig] = parts;
  const payload = `${userId}.${expiresAtStr}`;
  const secret = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY ?? "";
  const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Date.now() > Number(expiresAtStr)) return null;
  return userId;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/family/profile?calendar_error=missing_params`);
  }
  const userId = verifyState(state);
  if (!userId) {
    return NextResponse.redirect(`${siteUrl}/family/profile?calendar_error=invalid_state`);
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${siteUrl}/family/profile?calendar_error=not_configured`);
  }

  const redirectUri = `${siteUrl}/api/calendar/google/callback`;
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${siteUrl}/family/profile?calendar_error=token_exchange_failed`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  if (!tokens.refresh_token) {
    // Google only returns a refresh_token on the *first* consent for this
    // client+user pair. If they'd previously connected and revoked from
    // Google's side without disconnecting here, prompt=consent above
    // should force a fresh one — but if this still happens, we can't
    // push later without asking them to reconnect.
    return NextResponse.redirect(`${siteUrl}/family/profile?calendar_error=no_refresh_token`);
  }

  const admin = getSupabaseServiceClient();
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await admin.from("calendar_connections").upsert(
    {
      user_id: userId,
      provider: "google",
      status: "active",
      access_token_encrypted: encryptSecret(tokens.access_token),
      refresh_token_encrypted: encryptSecret(tokens.refresh_token),
      token_expires_at: tokenExpiresAt,
      last_error: null,
    },
    { onConflict: "user_id,provider" },
  );

  if (error) {
    return NextResponse.redirect(`${siteUrl}/family/profile?calendar_error=save_failed`);
  }

  return NextResponse.redirect(`${siteUrl}/family/profile?calendar_connected=google`);
}
