"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-helpers";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/calendar/crypto";
import { discoverCalendar } from "@/lib/calendar/apple";

// Validates the app-specific password against iCloud immediately (via a
// live CalDAV discovery call) so a typo or expired password fails right
// here with a clear message, rather than silently breaking the first
// time an appointment tries to push.
export async function connectAppleCalendar(formData: FormData): Promise<void> {
  const ctx = await requireSession();
  const username = String(formData.get("apple_username") ?? "").trim();
  const appPassword = String(formData.get("apple_app_password") ?? "").trim();

  if (!username || !appPassword) throw new Error("Both fields are required.");

  let calendarUrl: string;
  try {
    calendarUrl = await discoverCalendar(username, appPassword);
  } catch (err) {
    throw new Error(
      `Couldn't connect to iCloud — check the Apple ID and app-specific password. (${err instanceof Error ? err.message : "unknown error"})`,
    );
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin.from("calendar_connections").upsert(
    {
      user_id: ctx.userId,
      provider: "apple",
      status: "active",
      apple_username: username,
      apple_app_password_encrypted: encryptSecret(appPassword),
      caldav_calendar_url: calendarUrl,
      last_error: null,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(`Could not save connection: ${error.message}`);

  revalidatePath("/family/profile");
}

export async function disconnectCalendar(provider: "google" | "apple"): Promise<void> {
  const ctx = await requireSession();
  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("calendar_connections")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("provider", provider);
  if (error) throw new Error(`Could not disconnect: ${error.message}`);

  revalidatePath("/family/profile");
}
