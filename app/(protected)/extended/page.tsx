import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";

// Extended family view — full version lands in Step 12.
export default async function ExtendedHome() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_name")
    .eq("id", user!.id)
    .single();

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-dark">
            Hi {profile?.preferred_name ?? "there"}
          </h1>
          <SignOutButton />
        </div>
        <p className="text-text-mid">
          Placeholder — Extended view lands in Step 12.
        </p>
      </div>
    </main>
  );
}
