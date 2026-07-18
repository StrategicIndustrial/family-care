import { BottomTabs } from "@/components/family/BottomTabs";
import { PatientBottomTabs } from "@/components/mum/PatientBottomTabs";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

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

  let isPatient = false;
  if (user) {
    const admin = getSupabaseServiceClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    isPatient = profile?.role === "patient";
  }

  return (
    <div className="flex-1 flex flex-col pb-20">
      {children}
      {isPatient ? <PatientBottomTabs /> : <BottomTabs homeHref="/family" />}
    </div>
  );
}
