import { PatientBottomTabs } from "@/components/mum/PatientBottomTabs";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasUnreadChatMessages } from "@/lib/chat";

export default async function MumLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasUnreadChat = user ? await hasUnreadChatMessages(user.id) : false;

  return (
    <div className="flex-1 flex flex-col pb-20">
      {children}
      <PatientBottomTabs hasUnreadChat={hasUnreadChat} />
    </div>
  );
}
