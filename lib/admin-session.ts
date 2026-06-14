import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 4; // 4 hours

function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error("ADMIN_PASSWORD is not set.");
  }
  return pw;
}

// HMAC-derived token so the cookie never contains the raw password.
function deriveToken(password: string): string {
  return createHmac("sha256", password).update("admin").digest("hex");
}

export async function startAdminSession(submittedPassword: string): Promise<boolean> {
  const expected = getAdminPassword();
  const a = Buffer.from(submittedPassword);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const token = deriveToken(expected);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: MAX_AGE,
  });
  return true;
}

export async function endAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE);
  if (!cookie) return false;
  try {
    const expected = deriveToken(getAdminPassword());
    const a = Buffer.from(cookie.value);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Admin session required.");
  }
}
