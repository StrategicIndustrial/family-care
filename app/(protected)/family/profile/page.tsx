import Link from "next/link";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { updateOwnProfile } from "@/app/actions/profile";
import { signOut } from "@/app/actions/auth";
import { connectAppleCalendar, disconnectCalendar } from "@/app/actions/calendar-apple";
import { CalendarTypeToggles } from "@/components/family/CalendarTypeToggles";
import type { ApptType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const APPT_TYPES: ApptType[] = ["gp", "specialist", "scan_test", "other"];

const CALENDAR_ERROR_MESSAGES: Record<string, string> = {
  missing_params: "Google didn't return the expected response — try connecting again.",
  invalid_state: "That connection link expired — try connecting again.",
  not_configured: "Google Calendar isn't set up on this deployment yet.",
  token_exchange_failed: "Google rejected the connection — try again.",
  no_refresh_token: "Google didn't grant offline access — try disconnecting your Google account access at myaccount.google.com/permissions and connecting again.",
  save_failed: "Connected to Google but couldn't save it — try again.",
};

export default async function FamilyProfile({
  searchParams,
}: {
  searchParams: Promise<{ calendar_connected?: string; calendar_error?: string }>;
}) {
  const { calendar_connected, calendar_error } = await searchParams;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseServiceClient();
  const [{ data: profile }, { data: familyMembers }, { data: connections }, { data: myPrefs }] = await Promise.all([
    admin.from("profiles").select("full_name, preferred_name, phone, role, is_admin").eq("id", user.id).single(),
    admin.from("profiles").select("id, preferred_name, full_name, role").order("created_at", { ascending: true }),
    admin.from("calendar_connections").select("provider, status, apple_username").eq("user_id", user.id),
    admin.from("calendar_sync_prefs").select("appt_type, enabled").eq("user_id", user.id),
  ]);

  const { data: roleDefaults } = await admin
    .from("calendar_role_defaults")
    .select("appt_type, enabled")
    .eq("role", profile?.role ?? "family");

  const memberCount = familyMembers?.length ?? 0;
  const googleConnection = connections?.find((c) => c.provider === "google");
  const appleConnection = connections?.find((c) => c.provider === "apple");

  const roleDefaultMap = new Map((roleDefaults ?? []).map((r) => [r.appt_type, r.enabled]));
  const overrideMap = new Map((myPrefs ?? []).map((p) => [p.appt_type, p.enabled]));
  const effectivePrefs = Object.fromEntries(
    APPT_TYPES.map((t) => [t, overrideMap.has(t) ? overrideMap.get(t)! : (roleDefaultMap.get(t) ?? false)]),
  ) as Record<ApptType, boolean>;

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

        {/* Calendar sync */}
        <Card className="space-y-4">
          <div>
            <div className="text-sm font-extrabold text-text-dark">Calendar sync</div>
            <p className="text-xs text-text-mid mt-0.5">
              Push appointments to your own phone calendar — one-way, we never read yours.
            </p>
          </div>

          {calendar_connected === "google" && (
            <div className="rounded-xl bg-sage-50 border border-sage-100 px-3 py-2 text-xs font-semibold text-sage-text">
              Google Calendar connected ✓
            </div>
          )}
          {calendar_error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
              {CALENDAR_ERROR_MESSAGES[calendar_error] ?? "Something went wrong connecting your calendar."}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-line px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-bold text-text-dark">Google Calendar</div>
                <div className="text-xs text-text-mid">
                  {googleConnection ? (googleConnection.status === "active" ? "Connected" : `Needs attention (${googleConnection.status})`) : "Not connected"}
                </div>
              </div>
              {googleConnection ? (
                <form action={disconnectCalendar.bind(null, "google")}>
                  <button type="submit" className="text-xs font-bold text-red-500 hover:text-red-600">Disconnect</button>
                </form>
              ) : (
                <Link href="/api/calendar/google/connect" className="text-xs font-bold text-sage-600 hover:underline shrink-0">
                  Connect
                </Link>
              )}
            </div>

            <div className="rounded-xl border-2 border-line px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-text-dark">Apple Calendar</div>
                  <div className="text-xs text-text-mid truncate">
                    {appleConnection ? `Connected — ${appleConnection.apple_username}` : "Not connected"}
                  </div>
                </div>
                {appleConnection && (
                  <form action={disconnectCalendar.bind(null, "apple")}>
                    <button type="submit" className="text-xs font-bold text-red-500 hover:text-red-600 shrink-0">Disconnect</button>
                  </form>
                )}
              </div>
              {!appleConnection && (
                <form action={connectAppleCalendar} className="space-y-2 pt-1">
                  <input
                    name="apple_username"
                    type="email"
                    required
                    placeholder="Apple ID email"
                    className="w-full rounded-lg border-2 border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-text-dark focus:outline-none focus:border-lavender-500"
                  />
                  <input
                    name="apple_app_password"
                    type="password"
                    required
                    placeholder="App-specific password"
                    className="w-full rounded-lg border-2 border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-text-dark focus:outline-none focus:border-lavender-500"
                  />
                  <p className="text-[11px] text-text-mid">
                    Generate one at Apple ID → Sign-In and Security → App-Specific Passwords.
                  </p>
                  <button type="submit" className="rounded-lg cta-lavender text-white text-xs font-extrabold px-3 py-1.5">
                    Connect
                  </button>
                </form>
              )}
            </div>
          </div>

          {(googleConnection || appleConnection) && (
            <div>
              <div className="text-xs font-bold text-text-mid uppercase tracking-wide mb-2">
                Which appointment types get pushed
              </div>
              <CalendarTypeToggles initial={effectivePrefs} />
            </div>
          )}
        </Card>

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
