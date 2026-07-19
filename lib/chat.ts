import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Cheap unread indicator for the nav badge — messages from anyone else
// since this user's last visit to the chat page (or ever, if they've
// never opened it).
export async function hasUnreadChatMessages(userId: string): Promise<boolean> {
  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("chat_last_read_at")
    .eq("id", userId)
    .single();

  let query = admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .neq("author_id", userId);
  if (profile?.chat_last_read_at) {
    query = query.gt("created_at", profile.chat_last_read_at);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}
