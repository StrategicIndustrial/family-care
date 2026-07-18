"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-helpers";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin-session";
import type { ApptType, UserRole } from "@/lib/supabase/types";

// Per-user override of the role default matrix (calendar_role_defaults).
export async function updateMyCalendarPref(apptType: ApptType, enabled: boolean): Promise<void> {
  const ctx = await requireSession();
  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("calendar_sync_prefs")
    .upsert({ user_id: ctx.userId, appt_type: apptType, enabled }, { onConflict: "user_id,appt_type" });
  if (error) throw new Error(`Could not save preference: ${error.message}`);

  revalidatePath("/family/profile");
}

// Admin-only: changes the system-wide default for a role x appt_type cell.
export async function updateRoleDefault(role: UserRole, apptType: ApptType, enabled: boolean): Promise<void> {
  await requireSession();
  if (!(await isAdminUser())) throw new Error("Admin only.");

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("calendar_role_defaults")
    .upsert({ role, appt_type: apptType, enabled }, { onConflict: "role,appt_type" });
  if (error) throw new Error(`Could not save default: ${error.message}`);

  revalidatePath("/admin/setup");
}
