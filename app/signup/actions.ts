"use server";

import { redirect } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function submitSignUp(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const code = (formData.get("invite_code") as string | null)?.trim().toUpperCase() ?? "";

  if (!email || !code) {
    redirect("/signup?error=missing_fields");
  }

  const INVITE_CODE = (process.env.FAMILY_INVITE_CODE ?? "").toUpperCase();
  if (!INVITE_CODE) {
    // Distinct from "wrong code" — this means the env var itself is missing
    // or not scoped to this environment in the hosting provider, not that
    // the user typed something incorrect.
    redirect("/signup?error=not_configured");
  }
  if (code !== INVITE_CODE) {
    redirect("/signup?error=bad_code");
  }

  const admin = getSupabaseServiceClient();

  // Confirm a profile exists for this email.
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  const exists = users?.users.some((u) => u.email?.toLowerCase() === email);
  if (!exists) {
    redirect("/signup?error=not_found");
  }

  // Send a magic link (same flow the admin panel uses).
  const { error } = await admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : undefined,
    },
  });

  if (error) redirect("/signup?error=send_failed");

  redirect("/signup?sent=1");
}
