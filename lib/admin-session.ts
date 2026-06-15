import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

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

// Per-user gate: must be signed in via Supabase AND profile.is_admin = true.
// Decoupled from the password cookie so we can check user-identity independently.
export async function isAdminUser(): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin === true;
}

export async function startAdminSession(submittedPassword: string): Promise<boolean> {
  // Both checks must pass: the signed-in user must be an admin AND the
  // password must match. Either alone is insufficient.
  if (!(await isAdminUser())) return false;

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

// Current cookie is valid AND the user is still an admin.
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE);
  if (!cookie) return false;
  try {
    const expected = deriveToken(getAdminPassword());
    const a = Buffer.from(cookie.value);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  // Re-check is_admin on every request so a revoke takes effect immediately.
  return isAdminUser();
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Admin session required.");
  }
}
