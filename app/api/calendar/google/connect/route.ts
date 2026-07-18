import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { requireSession } from "@/lib/auth-helpers";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

// Signs `${userId}.${expiresAtMs}` so the OAuth `state` param can't be
// tampered with to link a calendar to someone else's account.
function signState(userId: string): string {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes to complete the flow
  const payload = `${userId}.${expiresAt}`;
  const secret = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY ?? "";
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export async function GET() {
  const ctx = await requireSession();

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!clientId || !siteUrl) {
    return NextResponse.json({ error: "Google Calendar isn't configured on this deployment yet." }, { status: 503 });
  }

  const redirectUri = `${siteUrl}/api/calendar/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: signState(ctx.userId),
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
