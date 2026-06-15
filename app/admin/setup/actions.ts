"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  startAdminSession,
  endAdminSession,
  requireAdmin,
} from "@/lib/admin-session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { hashPin } from "@/lib/pin";
import type { UserRole } from "@/lib/supabase/types";

const VALID_ROLES: UserRole[] = ["patient", "primary_carer", "family", "extended"];

// -------------------- session --------------------

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await startAdminSession(password);
  if (!ok) redirect("/admin/setup?error=bad_password");
  redirect("/admin/setup");
}

export async function logoutAdmin() {
  await endAdminSession();
  // Send them to the landing page rather than back to the password screen —
  // ending the admin session usually means leaving admin behind entirely.
  redirect("/");
}

// -------------------- users / profiles --------------------

export async function createProfile(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const preferred_name = String(formData.get("preferred_name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!email || !full_name || !preferred_name) {
    redirect("/admin/setup?error=missing_field");
  }
  if (!VALID_ROLES.includes(role)) {
    redirect("/admin/setup?error=invalid_role");
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name, preferred_name, role },
  });

  if (error) {
    const code = error.message.includes("already") ? "email_taken" : "create_failed";
    redirect(`/admin/setup?error=${code}`);
  }

  revalidatePath("/admin/setup");
  redirect("/admin/setup?ok=user_created");
}

export async function setUserPin(formData: FormData) {
  await requireAdmin();

  const user_id = String(formData.get("user_id") ?? "");
  const pin = String(formData.get("pin") ?? "");

  if (!user_id || !/^\d{4}$/.test(pin)) {
    redirect("/admin/setup?error=bad_pin");
  }

  const hash = await hashPin(pin);
  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("profiles")
    .update({ pin_hash: hash, pin_enabled: true })
    .eq("id", user_id);

  if (error) redirect("/admin/setup?error=pin_save_failed");
  revalidatePath("/admin/setup");
  redirect("/admin/setup?ok=pin_set");
}

export async function clearUserPin(formData: FormData) {
  await requireAdmin();

  const user_id = String(formData.get("user_id") ?? "");
  if (!user_id) redirect("/admin/setup?error=missing_user");

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("profiles")
    .update({ pin_hash: null, pin_enabled: false })
    .eq("id", user_id);

  if (error) redirect("/admin/setup?error=pin_clear_failed");
  revalidatePath("/admin/setup");
  redirect("/admin/setup?ok=pin_cleared");
}

// Grant or revoke admin status on another user. Only an existing admin
// can do this (requireAdmin guards the call), so promotion has to start
// from someone who's already privileged.
export async function setUserAdmin(formData: FormData) {
  await requireAdmin();
  const user_id = String(formData.get("user_id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!user_id) redirect("/admin/setup?error=missing_user");

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_admin: next })
    .eq("id", user_id);
  if (error) redirect("/admin/setup?error=update_failed");

  revalidatePath("/admin/setup");
  revalidatePath("/family/profile");
  redirect(`/admin/setup?ok=${next ? "admin_granted" : "admin_revoked"}`);
}

// Edit an existing user's profile + role. Email itself isn't editable here —
// changing email later requires a separate auth flow.
export async function updateUserProfile(formData: FormData) {
  await requireAdmin();

  const user_id = String(formData.get("user_id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const preferred_name = String(formData.get("preferred_name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  const phone_raw = String(formData.get("phone") ?? "").trim();
  const phone = phone_raw === "" ? null : phone_raw;

  if (!user_id || !full_name || !preferred_name) {
    redirect("/admin/setup?error=missing_field");
  }
  if (!VALID_ROLES.includes(role)) {
    redirect("/admin/setup?error=invalid_role");
  }

  const admin = getSupabaseServiceClient();

  // Update auth user_metadata so future trigger runs (if any) stay aligned.
  const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
    user_metadata: { full_name, preferred_name, role },
  });
  if (authErr) redirect("/admin/setup?error=update_failed");

  const { error } = await admin
    .from("profiles")
    .update({ full_name, preferred_name, role, phone })
    .eq("id", user_id);

  if (error) redirect("/admin/setup?error=update_failed");
  revalidatePath("/admin/setup");
  redirect("/admin/setup?ok=user_updated");
}

// Send a magic-link sign-in email to a user. Useful when they say they
// didn't receive the original one (or never got prompted to sign in).
export async function sendSignInLink(formData: FormData) {
  await requireAdmin();
  const user_id = String(formData.get("user_id") ?? "");
  if (!user_id) redirect("/admin/setup?error=missing_user");

  const admin = getSupabaseServiceClient();
  const { data: lookup } = await admin.auth.admin.getUserById(user_id);
  const email = lookup?.user?.email;
  if (!email) redirect("/admin/setup?error=no_email");

  // Use the regular signInWithOtp flow — it triggers Supabase's email
  // template and rate-limits correctly. generateLink would return a URL
  // but not always trigger the email on free-tier projects.
  const { error } = await admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      // Mirror the user-facing flow so they land in the right place.
      emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : undefined,
    },
  });
  if (error) redirect("/admin/setup?error=send_failed");

  redirect("/admin/setup?ok=link_sent");
}

// Delete a user — removes the auth row, which cascades into profiles via the
// FK + CASCADE in the migration. Use with care.
export async function deleteUser(formData: FormData) {
  await requireAdmin();
  const user_id = String(formData.get("user_id") ?? "");
  if (!user_id) redirect("/admin/setup?error=missing_user");

  const admin = getSupabaseServiceClient();
  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) redirect("/admin/setup?error=delete_failed");

  revalidatePath("/admin/setup");
  redirect("/admin/setup?ok=user_deleted");
}

// -------------------- medications --------------------

export async function createMedication(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const dosage = String(formData.get("dosage") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const prescriber = String(formData.get("prescriber") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !dosage || !frequency) {
    redirect("/admin/setup?error=missing_field");
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("medications")
    .insert({ name, dosage, frequency, prescriber, notes });

  if (error) redirect("/admin/setup?error=med_create_failed");
  revalidatePath("/admin/setup");
  redirect("/admin/setup?ok=med_created");
}

export async function toggleMedication(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!id) redirect("/admin/setup?error=missing_med");

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("medications")
    .update({ is_active: next })
    .eq("id", id);

  if (error) redirect("/admin/setup?error=med_update_failed");
  revalidatePath("/admin/setup");
  redirect("/admin/setup?ok=med_updated");
}
