import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";

// Mum's view — fully built in Step 9.
// Stub here just confirms the auth + role guard works end to end.
export default async function MumHome() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_name")
    .eq("id", user!.id)
    .single();

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-semibold text-text-dark">
          Good morning, {profile?.preferred_name ?? "Mum"} ☀️
        </h1>
        <p className="text-text-mid">
          This is the placeholder for Mum's view — full design lands in Step 9.
        </p>
        <SignOutButton />
      </div>
    </main>
  );
}

// Set warm-bg variant for Mum's view via data attribute on <html>
// (configured in globals.css). The layout below applies it.
export const dynamic = "force-dynamic";
