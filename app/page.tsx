import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/roles";

export default async function Home() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) redirect(ROLE_HOME[profile.role]);
  }

  return (
    <main className="flex-1 flex items-center justify-center hdr-cream anim-fade-in">
      <div className="w-full max-w-sm px-8 flex flex-col items-center min-h-screen">
        {/* Logo + tagline */}
        <div className="flex-1 flex flex-col items-center justify-center gap-0">
          <div
            className="rounded-3xl cta-sage flex items-center justify-center mb-7
                       shadow-[0_8px_24px_rgba(123,191,160,0.35)]"
            style={{ width: 88, height: 88 }}
            aria-hidden="true"
          >
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M22 8C17.6 8 14 11.6 14 16c0 3.2 1.8 6 4.4 7.5C12.8 25.3 9 29.7 9 35h26c0-5.3-3.8-9.7-9.4-11.5C28.2 22 30 19.2 30 16c0-4.4-3.6-8-8-8z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <h1 className="text-[32px] font-extrabold text-text-dark tracking-tight mb-2 text-center">
            Family Care
          </h1>
          <p className="text-base text-text-mid text-center leading-relaxed">
            Keeping your family connected,<br />one day at a time.
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-3 pb-12">
          <Link
            href="/signup"
            className="w-full py-[18px] cta-sage rounded-2xl text-white text-lg font-extrabold text-center
                       shadow-[0_6px_20px_rgba(93,168,130,0.4)] block"
          >
            Create Account
          </Link>
          <Link
            href="/signin"
            className="w-full py-[18px] rounded-2xl text-center text-lg font-extrabold
                       border-2 border-sage-100 text-sage-600 block bg-transparent"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
