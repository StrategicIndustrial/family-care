"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth-helpers";
import { sendPushToUser } from "@/lib/webpush";

const CHAT_PATH = "/family/chat";

// Post a message to the one shared family thread — any signed-in role.
// Pushes a generic notification (not the message body) to everyone else,
// since a chat push showing full content on a lock screen would be a
// real disclosure risk on a device someone else might glance at.
export async function postMessage(formData: FormData): Promise<void> {
  const ctx = await requireSession();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Message is empty.");

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("messages").insert({ author_id: ctx.userId, body });
  if (error) throw new Error(`Could not send message: ${error.message}`);

  revalidatePath(CHAT_PATH);

  const admin = getSupabaseServiceClient();
  const { data: others } = await admin.from("profiles").select("id").neq("id", ctx.userId);
  await Promise.all(
    (others ?? []).map((p) =>
      sendPushToUser(p.id, {
        title: "Family Care",
        body: `New message from ${ctx.preferredName}`,
        url: CHAT_PATH,
        tag: "chat",
      }),
    ),
  );
}

// Marks the chat as read up to now — drives the unread badge in nav.
export async function markChatRead(): Promise<void> {
  const ctx = await requireSession();
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ chat_last_read_at: new Date().toISOString() })
    .eq("id", ctx.userId);
  if (error) throw new Error(`Could not update: ${error.message}`);
  revalidatePath(CHAT_PATH);
}
