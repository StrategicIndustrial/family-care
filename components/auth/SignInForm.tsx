"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus({ kind: "sending" });
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false, // accounts are created by admin only
      },
    });

    if (error) {
      setStatus({
        kind: "error",
        message: "Something went wrong — try again in a moment.",
      });
    } else {
      setStatus({ kind: "sent", email: trimmed });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-xl border border-line bg-primary-light p-6 text-center space-y-2">
        <p className="font-medium text-primary">Check your email</p>
        <p className="text-sm text-text-mid">
          We sent a sign-in link to <span className="text-text-dark">{status.email}</span>.
          You can close this tab once you tap the link.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text-dark mb-2">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status.kind === "sending"}
          className="w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-text-dark
                     focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                     disabled:opacity-60"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="w-full rounded-lg bg-primary px-4 py-3 text-base font-medium text-white
                   hover:bg-primary/90 disabled:opacity-60"
      >
        {status.kind === "sending" ? "Sending…" : "Send me a sign-in link"}
      </button>

      {status.kind === "error" && (
        <p className="text-sm text-warning text-center">{status.message}</p>
      )}
    </form>
  );
}
