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
        shouldCreateUser: false,
      },
    });

    if (error) {
      // Surface the real Supabase error rather than a generic message —
      // this is the only client-side signal we get when something like
      // rate-limiting, a misconfigured Supabase URL, or a CORS/site-URL
      // mismatch is the actual cause.
      console.error("signInWithOtp failed:", error);
      setStatus({
        kind: "error",
        message: `${error.message || "Something went wrong"} (status: ${error.status ?? "unknown"})`,
      });
    } else {
      setStatus({ kind: "sent", email: trimmed });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-2xl bg-sage-50 border-2 border-sage-100 p-5 text-center space-y-2">
        <p className="font-extrabold text-sage-text">Check your email 💌</p>
        <p className="text-sm text-text-mid">
          We sent a sign-in link to <span className="text-text-dark font-bold">{status.email}</span>.<br />
          Tap it in the same browser to continue.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <div>
        <label htmlFor="email" className="block text-sm font-bold text-sage-text mb-2">
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
          className="w-full rounded-2xl border-2 border-sage-100 bg-white px-4 py-4 text-base text-text-dark
                     focus:border-sage-500 focus:outline-none disabled:opacity-60 font-semibold"
          placeholder="your@email.com"
        />
      </div>

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="w-full rounded-2xl cta-sage text-white text-lg font-extrabold py-4
                   shadow-[0_6px_20px_rgba(93,168,130,0.4)]
                   disabled:opacity-60"
      >
        {status.kind === "sending" ? "Sending…" : "Send me a sign-in link"}
      </button>

      {status.kind === "error" && (
        <p className="text-sm text-peach-600 text-center font-bold">{status.message}</p>
      )}
    </form>
  );
}
