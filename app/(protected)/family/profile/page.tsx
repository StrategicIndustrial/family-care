import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { updateOwnProfile } from "@/app/actions/profile";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const dynamic = "force-dynamic";

export default async function FamilyProfile() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, preferred_name, phone, role")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex-1 px-6 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-dark">Profile</h1>
          <SignOutButton />
        </header>

        <Card className="space-y-1">
          <div className="text-sm text-text-mid">Signed in as</div>
          <div className="font-medium text-text-dark">{user.email}</div>
          <div className="text-sm text-text-mid mt-1">Role: {profile?.role}</div>
        </Card>

        <form action={updateOwnProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input
              defaultValue={profile?.full_name ?? ""}
              disabled
              className="w-full rounded-lg border border-line bg-zinc-50 px-3 py-2 text-base text-text-mid"
            />
            <p className="text-xs text-text-mid mt-1">
              Changed by the admin via /admin/setup.
            </p>
          </div>

          <Field
            name="preferred_name"
            label="Preferred name"
            defaultValue={profile?.preferred_name ?? ""}
            required
          />
          <Field
            name="phone"
            label="Phone"
            type="tel"
            defaultValue={profile?.phone ?? ""}
          />

          <button type="submit" className="rounded-lg bg-primary text-white px-4 py-3 font-medium">
            Save changes
          </button>
        </form>

        <Card>
          <div className="text-sm font-medium text-text-dark">Notification preferences</div>
          <p className="text-sm text-text-mid mt-1">
            Coming in Phase 2 — email and push alerts for flagged updates and new tasks.
          </p>
        </Card>

        <Card className="space-y-2">
          <div className="text-sm font-medium text-text-dark">Admin</div>
          <p className="text-sm text-text-mid">
            Manage users, set PINs, and edit Mum's medications. Requires the admin
            password.
          </p>
          <Link
            href="/admin/setup"
            className="inline-block rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-text-dark hover:border-primary"
          >
            Open admin setup →
          </Link>
        </Card>
      </div>
    </main>
  );
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
      <label htmlFor={name} className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-warning"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
      />
    </div>
  );
}
