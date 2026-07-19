import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { ChatComposer } from "@/components/family/ChatComposer";
import { ChatAutoRefresh } from "@/components/family/ChatAutoRefresh";
import { MarkChatReadOnMount } from "@/components/family/MarkChatReadOnMount";
import { formatRelativeTime } from "@/lib/format";
import { clsx } from "@/lib/cx";

export const dynamic = "force-dynamic";

export default async function FamilyChat() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const { data: messages } = await admin
    .from("messages")
    .select("id, author_id, body, created_at, author:profiles!messages_author_id_fkey(preferred_name)")
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <main className="flex-1 bg-warm-bg flex flex-col anim-fade-in">
      <MarkChatReadOnMount />
      <ChatAutoRefresh />

      <header className="hdr-sky px-6 pt-12 pb-5 rounded-b-3xl shrink-0">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-extrabold text-white">Family Chat</h1>
          <p className="text-sm text-white/80 mt-0.5">One shared thread for everyone</p>
        </div>
      </header>

      <div className="flex-1 px-4 pt-4 pb-2 max-w-2xl mx-auto w-full space-y-2.5 overflow-y-auto">
        {(messages ?? []).length === 0 ? (
          <div className="rounded-2xl bg-white p-4 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <p className="text-sm text-text-mid">No messages yet — say hello.</p>
          </div>
        ) : (
          (messages ?? []).map((m) => {
            const mine = m.author_id === user.id;
            return (
              <div key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
                    mine ? "bg-sky-500 text-white rounded-br-md" : "bg-white text-text-dark rounded-bl-md",
                  )}
                >
                  {!mine && (
                    <div className="text-[11px] font-extrabold text-sky-600 mb-0.5">
                      {m.author?.preferred_name ?? "Someone"}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                  <div className={clsx("text-[10px] mt-1", mine ? "text-white/70" : "text-text-mid")}>
                    {formatRelativeTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 pb-4 max-w-2xl mx-auto w-full shrink-0">
        <ChatComposer />
      </div>
    </main>
  );
}
