import Link from "next/link";
import { isAdmin, isAdminUser } from "@/lib/admin-session";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { CalendarMatrixGrid } from "@/components/admin/CalendarMatrixGrid";
import {
  loginAdmin,
  logoutAdmin,
  createProfile,
  setUserPin,
  clearUserPin,
  updateUserProfile,
  sendSignInLink,
  deleteUser,
  setUserAdmin,
  createMedication,
  toggleMedication,
} from "./actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  bad_password: "Incorrect password — or you're not marked as an admin.",
  missing_field: "Please fill in all required fields.",
  invalid_role: "Pick a valid role.",
  email_taken: "That email is already in use.",
  create_failed: "Could not create the user — try again.",
  bad_pin: "PIN must be exactly 4 digits.",
  pin_save_failed: "Could not save the PIN.",
  pin_clear_failed: "Could not clear the PIN.",
  update_failed: "Could not save the changes — try again.",
  send_failed: "Could not send the sign-in link — try again in a moment.",
  delete_failed: "Could not delete the user.",
  no_email: "No email on file for this user.",
  missing_user: "User missing.",
  missing_med: "Medication missing.",
  med_create_failed: "Could not add medication.",
  med_update_failed: "Could not update medication.",
};

const OK_MESSAGES: Record<string, string> = {
  user_created: "User created ✓",
  user_updated: "User updated ✓",
  user_deleted: "User deleted ✓",
  link_sent: "Sign-in link sent ✓",
  pin_set: "PIN saved ✓",
  pin_cleared: "PIN cleared ✓",
  admin_granted: "Admin access granted ✓",
  admin_revoked: "Admin access revoked ✓",
  med_created: "Medication added ✓",
  med_updated: "Medication updated ✓",
};

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  // Three-stage gate: must be signed in, must be is_admin, must have entered password.
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex-1 px-6 py-16 bg-zinc-50">
        <div className="max-w-sm mx-auto space-y-6 text-center">
          <Link href="/" className="inline-block text-sm text-primary">← Back to app</Link>
          <h1 className="text-2xl font-semibold">Admin setup</h1>
          <p className="text-text-mid">
            Sign in to the app first, then come back here.
          </p>
          <Link href="/" className="inline-block rounded-lg bg-primary text-white px-4 py-3 font-medium">
            Go to sign-in
          </Link>
        </div>
      </main>
    );
  }

  const userIsAdmin = await isAdminUser();
  if (!userIsAdmin) {
    return (
      <main className="flex-1 px-6 py-16 bg-zinc-50">
        <div className="max-w-sm mx-auto space-y-6 text-center">
          <Link href="/" className="inline-block text-sm text-primary">← Back to app</Link>
          <h1 className="text-2xl font-semibold">Admin setup</h1>
          <p className="text-text-mid">
            You're signed in, but your account isn't marked as an admin.
            Ask an existing admin to grant you access.
          </p>
        </div>
      </main>
    );
  }

  const authed = await isAdmin();
  if (!authed) {
    return (
      <main className="flex-1 px-6 py-16 bg-zinc-50">
        <div className="max-w-sm mx-auto space-y-6">
          <Link href="/" className="inline-block text-sm text-primary">← Back to app</Link>
          <h1 className="text-2xl font-semibold">Admin setup</h1>
          <p className="text-sm text-text-mid">
            Signed in as an admin user. Enter the shared admin password to continue.
          </p>
          <form action={loginAdmin} className="space-y-4">
            <input
              type="password"
              name="password"
              required
              autoFocus
              placeholder="Admin password"
              className="w-full rounded-lg border border-line bg-white px-4 py-3"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-primary text-white px-4 py-3 font-medium"
            >
              Continue
            </button>
            {error && ERROR_MESSAGES[error] && (
              <p className="text-sm text-warning text-center">{ERROR_MESSAGES[error]}</p>
            )}
          </form>
        </div>
      </main>
    );
  }

  const admin = getSupabaseServiceClient();

  // Profile rows + auth users (for email + email_confirmed_at) in parallel.
  const [{ data: profiles }, { data: authUsers }, { data: meds }, { data: calendarDefaults }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, preferred_name, role, phone, pin_enabled, is_admin")
      .order("created_at", { ascending: true }),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin
      .from("medications")
      .select("id, name, dosage, frequency, is_active")
      .order("created_at", { ascending: true }),
    admin.from("calendar_role_defaults").select("role, appt_type, enabled"),
  ]);

  const calendarMatrixInitial = Object.fromEntries(
    (calendarDefaults ?? []).map((d) => [`${d.role}:${d.appt_type}`, d.enabled]),
  );

  const authById = new Map<string, { email: string | undefined; lastSignInAt: string | null }>();
  for (const u of authUsers?.users ?? []) {
    authById.set(u.id, {
      email: u.email,
      lastSignInAt: u.last_sign_in_at ?? null,
    });
  }

  return (
    <main className="flex-1 px-6 py-10 bg-zinc-50">
      <div className="max-w-3xl mx-auto space-y-10">
        <Link href="/" className="inline-block text-sm text-primary">← Back to app</Link>
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin setup</h1>
          <form action={logoutAdmin}>
            <button type="submit" className="text-sm text-text-mid underline">
              End admin session
            </button>
          </form>
        </header>

        {ok && OK_MESSAGES[ok] && (
          <div className="rounded-lg border border-success/30 bg-success/10 text-success px-4 py-3">
            {OK_MESSAGES[ok]}
          </div>
        )}
        {error && ERROR_MESSAGES[error] && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 text-warning px-4 py-3">
            {ERROR_MESSAGES[error]}
          </div>
        )}

        {/* ---------- Create user ---------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Create user</h2>
          <form action={createProfile} className="space-y-3 rounded-xl border border-line bg-white p-5">
            <Field name="email" label="Email" type="email" required />
            <div className="grid grid-cols-2 gap-3">
              <Field name="full_name" label="Full name" required />
              <Field name="preferred_name" label="Preferred name" required placeholder="Mum / Dad / James" />
            </div>
            <label className="block text-sm font-medium">Role</label>
            <select
              name="role"
              required
              defaultValue="family"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
            >
              <option value="patient">patient (Mum)</option>
              <option value="primary_carer">primary_carer (Dad)</option>
              <option value="family">family (son)</option>
              <option value="extended">extended (sibling)</option>
            </select>
            <button type="submit" className="rounded-lg bg-primary text-white px-4 py-2 font-medium">
              Create user
            </button>
            <p className="text-xs text-text-mid pt-1">
              Creating a user doesn't email them — use "Send sign-in link" on the
              user row below when they're ready to log in.
            </p>
          </form>
        </section>

        {/* ---------- Users ---------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Users ({profiles?.length ?? 0})</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {(profiles ?? []).map((p) => {
              const authInfo = authById.get(p.id);
              const lastSignIn = authInfo?.lastSignInAt
                ? new Date(authInfo.lastSignInAt).toLocaleString("en-AU", {
                    dateStyle: "medium", timeStyle: "short",
                  })
                : "never";
              const needsPin = p.role === "patient" || p.role === "primary_carer";

              return (
                <li key={p.id} className="p-4 space-y-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {p.preferred_name}{" "}
                        <span className="text-sm text-text-mid font-normal">({p.full_name})</span>
                        {p.is_admin && (
                          <span className="inline-flex items-center rounded-full bg-primary-light text-primary px-2 py-0.5 text-xs font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-text-mid">
                        {authInfo?.email ?? "(no auth row)"} · {p.role}
                      </div>
                      <div className="text-xs text-text-mid mt-0.5">
                        Last sign-in: {lastSignIn}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <form action={setUserAdmin}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <input type="hidden" name="next" value={String(!p.is_admin)} />
                        <button
                          type="submit"
                          className="rounded border border-line text-text-dark px-3 py-1.5 text-sm"
                        >
                          {p.is_admin ? "Revoke admin" : "Make admin"}
                        </button>
                      </form>
                      <form action={sendSignInLink}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded bg-primary text-white px-3 py-1.5 text-sm font-medium"
                        >
                          Send sign-in link
                        </button>
                      </form>
                      <form action={deleteUser}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-warning/40 text-warning px-3 py-1.5 text-sm"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* ----- PIN row (patient + primary_carer only) ----- */}
                  {needsPin && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <form action={setUserPin} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={p.id} />
                        <input
                          type="text"
                          name="pin"
                          inputMode="numeric"
                          pattern="\d{4}"
                          maxLength={4}
                          placeholder="4-digit PIN"
                          className="rounded border border-line px-3 py-1.5 text-sm w-32"
                        />
                        <button
                          type="submit"
                          className="rounded bg-primary text-white px-3 py-1.5 text-sm"
                        >
                          {p.pin_enabled ? "Reset PIN" : "Set PIN"}
                        </button>
                      </form>
                      {p.pin_enabled && (
                        <form action={clearUserPin}>
                          <input type="hidden" name="user_id" value={p.id} />
                          <button
                            type="submit"
                            className="rounded border border-line px-3 py-1.5 text-sm text-text-mid"
                          >
                            Disable PIN
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* ----- Edit details ----- */}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary select-none">
                      Edit details
                    </summary>
                    <form action={updateUserProfile} className="mt-3 space-y-3 rounded-lg bg-zinc-50 p-4">
                      <input type="hidden" name="user_id" value={p.id} />
                      <div className="grid grid-cols-2 gap-3">
                        <Field name="full_name" label="Full name" defaultValue={p.full_name} required />
                        <Field name="preferred_name" label="Preferred name" defaultValue={p.preferred_name} required />
                      </div>
                      <Field name="phone" label="Phone" type="tel" defaultValue={p.phone ?? ""} />
                      <label className="block text-sm font-medium">Role</label>
                      <select
                        name="role"
                        defaultValue={p.role}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2"
                      >
                        <option value="patient">patient</option>
                        <option value="primary_carer">primary_carer</option>
                        <option value="family">family</option>
                        <option value="extended">extended</option>
                      </select>
                      <button type="submit" className="rounded-lg bg-primary text-white px-4 py-2 font-medium">
                        Save changes
                      </button>
                    </form>
                  </details>
                </li>
              );
            })}
            {(!profiles || profiles.length === 0) && (
              <li className="p-4 text-sm text-text-mid">No users yet.</li>
            )}
          </ul>
        </section>

        {/* ---------- Medications ---------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Medications</h2>
          <form action={createMedication} className="space-y-3 rounded-xl border border-line bg-white p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field name="name" label="Name" required placeholder="Donepezil" />
              <Field name="dosage" label="Dosage" required placeholder="10mg" />
            </div>
            <Field name="frequency" label="Frequency" required placeholder="Once daily with breakfast" />
            <div className="grid grid-cols-2 gap-3">
              <Field name="prescriber" label="Prescriber" placeholder="Dr Nguyen" />
              <Field name="notes" label="Notes" />
            </div>
            <button type="submit" className="rounded-lg bg-primary text-white px-4 py-2 font-medium">
              Add medication
            </button>
          </form>

          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {(meds ?? []).map((m) => (
              <li key={m.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className={`font-medium ${m.is_active ? "" : "text-text-mid line-through"}`}>
                    {m.name} <span className="text-sm text-text-mid">{m.dosage}</span>
                  </div>
                  <div className="text-sm text-text-mid">{m.frequency}</div>
                </div>
                <form action={toggleMedication}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="next" value={String(!m.is_active)} />
                  <button
                    type="submit"
                    className="rounded border border-line px-3 py-1.5 text-sm text-text-mid"
                  >
                    {m.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </li>
            ))}
            {(!meds || meds.length === 0) && (
              <li className="p-4 text-sm text-text-mid">No medications yet.</li>
            )}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Calendar sync defaults</h2>
          <p className="text-sm text-text-mid">
            Which appointment types push to each role's calendar by default. Each person can still override this for themselves from their profile.
          </p>
          <CalendarMatrixGrid initial={calendarMatrixInitial} />
        </section>
      </div>
    </main>
  );
}

function Field({
  name, label, type = "text", required, placeholder, defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base"
      />
    </div>
  );
}
