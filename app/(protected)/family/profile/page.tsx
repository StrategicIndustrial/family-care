import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { updateOwnProfile } from "@/app/actions/profile";
import { signOut } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function FamilyProfile() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const [{ data: profile }, { data: familyMembers }] = await Promise.all([
    admin.from("profiles").select("full_name, preferred_name, phone, role, is_admin").eq("id", user.id).single(),
    admin.from("profiles").select("id, preferred_name, full_name, role").order("created_at", { ascending: true }),
  ]);

  const memberCount = familyMembers?.length ?? 0;

  return (
    <main className="flex-1 pb-24 anim-fade-in">
      <header className="hdr-lavender px-6 pt-12 pb-8 rounded-b-3xl">
        <div className="max-w-md mx-auto flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center text-4xl" aria-hidden="true">
            👨‍👩‍👧‍👦
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white">The Family</h1>
            <p className="text-sm text-white/85 mt-1">{memberCount} member{memberCount === 1 ? "" : "s"}</p>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 mt-5 space-y-4">
        <Card className="space-y-1">
          <div className="text-xs font-bold text-text-mid">Signed in as</div>
          <div className="font-extrabold text-text-dark">{user.email}</div>
          <div className="text-xs text-text-mid mt-1">Role: {profile?.role}</div>
        </Card>

        {/* Family members list */}
        <section className="space-y-2">
          <h2 className="text-sm font-extrabold text-text-dark px-2">Family Members</h2>
          <div className="space-y-2">
            {(familyMembers ?? []).map((m) => (
              <div key={m.id}
                   className="rounded-2xl bg-white p-4 flex items-center gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                <Avatar name={m.preferred_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-text-dark">{m.preferred_name}</div>
                  <div className="text-xs text-text-mid">
                    {roleLabel(m.role)}
                    {m.full_name && m.full_name !== m.preferred_name && ` · ${m.full_name}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Edit own profile */}
        <form action={updateOwnProfile} className="space-y-3 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          <div className="text-sm font-extrabold text-text-dark">Your details</div>
          <div>
            <label className="block text-xs font-bold text-lavender-text mb-1">Full name</label>
            <input
              defaultValue={profile?.full_name ?? ""}
              disabled
              className="w-full rounded-2xl border-2 border-line bg-cream/60 px-3 py-2.5 text-base text-text-mid font-semibold"
            />
            <p className="text-[11px] text-text-mid mt-1">Changed by the admin via /admin/setup.</p>
          </div>

          <Field name="preferred_name" label="Preferred name"
                 defaultValue={profile?.preferred_name ?? ""} required />
          <Field name="phone" label="Phone" type="tel"
                 defaultValue={profile?.phone ?? ""} />

          <button type="submit" className="rounded-2xl cta-lavender text-white font-extrabold px-5 py-3">
            Save changes
          </button>
        </form>

        {profile?.is_admin && (
          <Link
            href="/admin/setup"
            className="block rounded-2xl bg-white p-4 border-2 border-lavender-200 text-center font-extrabold text-lavender-600 shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
          >
            ⚙️ Admin Settings
          </Link>
        )}

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-2xl bg-transparent border-2 border-lavender-200 text-lavender-500 font-extrabold py-3"
          >
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "patient": return "Person in Care";
    case "primary_carer": return "Significant Other";
    case "family": return "Family Member";
    case "extended": return "Extended Family";
    default: return role;
  }
}

function Field({
  name, label, type = "text", required, defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-bold text-lavender-text mb-1">
        {label}{required && <span className="text-peach-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border-2 border-lavender-100 bg-white px-3 py-2.5 text-base font-semibold text-text-dark focus:outline-none focus:border-lavender-500"
      />
    </div>
  );
}
