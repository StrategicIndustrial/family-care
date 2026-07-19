import { BottomTabs } from "@/components/family/BottomTabs";
import { PatientBottomTabs } from "@/components/mum/PatientBottomTabs";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { hasUnreadChatMessages } from "@/lib/chat";

// Family-route shell with bottom tabs. Both family role + Dad use these
// pages (tasks, appointments, updates, profile); Dad gets his own home
// tab via the layout in /dad. The patient role also reaches one page here
// (/family/updates, per lib/roles.ts) — she gets her own nav instead of
// the carer BottomTabs, whose Home/Tasks/Calendar/Profile tabs all point
// into pages she isn't allowed to view (this was the cause of "tapping
// Home shows carer content" — the same BottomTabs used to render for
// everyone regardless of role).
export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: string | undefined;
  if (user) {
    const admin = getSupabaseServiceClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    role = profile?.role;
  }
  const hasUnreadChat = user ? await hasUnreadChatMessages(user.id) : false;

  // Extended family only ever reaches /family/chat here (linked from their
  // own /extended home) — the carer BottomTabs' other tabs (Tasks, Calendar,
  // Medical, Updates) aren't pages they're allowed to view, so they get no
  // bottom nav rather than one that bounces them home on every other tap.
  return (
    <div className="flex-1 flex flex-col pb-20">
      {children}
      {role === "patient" && <PatientBottomTabs hasUnreadChat={hasUnreadChat} />}
      {(role === "primary_carer" || role === "family") && <BottomTabs homeHref="/family" hasUnreadChat={hasUnreadChat} />}
    </div>
  );
}
