"use server";

import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyPin as bcryptVerify } from "@/lib/pin";
import {
  markPinUnlocked,
  clearPinUnlocked,
  bumpPinAttempts,
  clearPinAttempts,
  getPinAttempts,
  MAX_PIN_ATTEMPTS,
} from "@/lib/pin-session";

export type PinResult =
  | { ok: true }
  | { ok: false; reason: "wrong"; attemptsLeft: number }
  | { ok: false; reason: "locked" }
  | { ok: false; reason: "no_session" }
  | { ok: false; reason: "not_enabled" };

export async function verifyPinAction(pin: string): Promise<PinResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "no_session" };

  // Check attempts before touching the hash — a locked-out user can't even try.
  const attempts = await getPinAttempts(user.id);
  if (attempts >= MAX_PIN_ATTEMPTS) return { ok: false, reason: "locked" };

  // pin_hash isn't readable via RLS for the patient role; use service role.
  // This is safe because we only fetch the hash for the authenticated user.
  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("pin_enabled, pin_hash, role")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.pin_enabled || !profile.pin_hash) {
    return { ok: false, reason: "not_enabled" };
  }

  const valid = await bcryptVerify(pin, profile.pin_hash);
  if (!valid) {
    const next = await bumpPinAttempts(user.id);
    if (next >= MAX_PIN_ATTEMPTS) return { ok: false, reason: "locked" };
    return { ok: false, reason: "wrong", attemptsLeft: MAX_PIN_ATTEMPTS - next };
  }

  await markPinUnlocked(user.id);
  await clearPinAttempts();
  return { ok: true };
}

export async function lockPinAction(): Promise<void> {
  await clearPinUnlocked();
}
