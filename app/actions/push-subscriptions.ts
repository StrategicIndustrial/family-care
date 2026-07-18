"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth-helpers";

export async function saveSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<void> {
  const ctx = await requireSession();
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: ctx.userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(`Could not save push subscription: ${error.message}`);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await requireSession();
  const supabase = await getSupabaseServerClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
