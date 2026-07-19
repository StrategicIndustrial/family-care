import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const UNLOCK_COOKIE   = "pin_unlocked";
const ATTEMPTS_COOKIE = "pin_attempts";

// Once unlocked on a device, stay unlocked — no idle timer. The only way
// back to a re-auth screen is the cookie itself going away (cleared
// storage, new device) or the underlying Supabase session becoming
// invalid, both of which fall through to the normal email-OTP sign-in.
const UNLOCK_MAX_AGE      = 400 * 24 * 60 * 60; // seconds — matches the Supabase session cookie ceiling
const ATTEMPTS_MAX_AGE    = 60 * 60;        // 1h, plenty for a person stuck typing
export const MAX_PIN_ATTEMPTS = 5;

// HMAC secret — derived from SERVICE_ROLE_KEY so it never lives on the client.
// Fall back to a build-time placeholder so static analysis doesn't crash; the
// real secret is enforced at runtime when these helpers are actually called.
function secret(): Buffer {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for PIN session");
  return createHmac("sha256", k).update("pin-session-v1").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

// -------------------- unlock cookie --------------------

export async function markPinUnlocked(userId: string): Promise<void> {
  const sig = sign(userId);
  const jar = await cookies();
  jar.set(UNLOCK_COOKIE, `${userId}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UNLOCK_MAX_AGE,
  });
}

export async function isPinUnlocked(userId: string): Promise<boolean> {
  const jar = await cookies();
  const cookie = jar.get(UNLOCK_COOKIE);
  if (!cookie) return false;

  const [cookieUserId, cookieSig] = cookie.value.split(".");
  if (!cookieUserId || !cookieSig) return false;
  if (cookieUserId !== userId) return false;

  return safeEqual(cookieSig, sign(userId));
}

export async function clearPinUnlocked(): Promise<void> {
  const jar = await cookies();
  jar.delete(UNLOCK_COOKIE);
}

// -------------------- attempts counter --------------------

export async function getPinAttempts(userId: string): Promise<number> {
  const jar = await cookies();
  const cookie = jar.get(ATTEMPTS_COOKIE);
  if (!cookie) return 0;

  const [cookieUserId, countStr, cookieSig] = cookie.value.split(".");
  if (!cookieUserId || !countStr || !cookieSig) return 0;
  if (cookieUserId !== userId) return 0;

  const expected = sign(`${userId}.${countStr}`);
  if (!safeEqual(cookieSig, expected)) return 0;

  const count = Number(countStr);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export async function bumpPinAttempts(userId: string): Promise<number> {
  const current = await getPinAttempts(userId);
  const next = current + 1;
  const sig = sign(`${userId}.${next}`);
  const jar = await cookies();
  jar.set(ATTEMPTS_COOKIE, `${userId}.${next}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ATTEMPTS_MAX_AGE,
  });
  return next;
}

export async function clearPinAttempts(): Promise<void> {
  const jar = await cookies();
  jar.delete(ATTEMPTS_COOKIE);
}
