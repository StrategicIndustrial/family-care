"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROLE_HOME } from "@/lib/roles";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

type CodeStatus = "idle" | "verifying" | "error";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle");
  const [codeError, setCodeError] = useState("");

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
      console.error("signInWithOtp failed:", error);
      setStatus({
        kind: "error",
        message: `${error.message || "Something went wrong"} (status: ${error.status ?? "unknown"})`,
      });
    } else {
      setStatus({ kind: "sent", email: trimmed });
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (status.kind !== "sent") return;
    const token = code.trim();
    if (token.length < 6) return;

    setCodeStatus("verifying");
    setCodeError("");
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: status.email,
      token,
      type: "email",
    });

    if (error || !data?.user) {
      setCodeError(
        /expired/i.test(error?.message ?? "")
          ? "That code has expired — go back and request a new one."
          : "That code isn't right — check the email and try again.",
      );
      setCodeStatus("error");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (!profile?.role) {
      await supabase.auth.signOut();
      setCodeError("We couldn't find a profile for that account — ask the admin to set one up.");
      setCodeStatus("error");
      return;
    }

    router.push(ROLE_HOME[profile.role]);
  }

  if (status.kind === "sent") {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="rounded-2xl bg-sage-50 border-2 border-sage-100 p-4 text-center">
          <p className="font-extrabold text-sage-text mb-1">Check your email 💌</p>
          <p className="text-sm text-text-mid">
            We sent a code and a link to <span className="text-text-dark font-bold">{status.email}</span>.
            If you're using the installed app, type the 6-digit code below instead of tapping the link
            (the link opens in a browser, not the installed app).
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="w-full flex flex-col gap-3">
          <div>
            <label htmlFor="otp-code" className="block text-sm font-bold text-sage-text mb-2">
              Enter your code
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={codeStatus === "verifying"}
              className="w-full rounded-2xl border-2 border-sage-100 bg-white px-4 py-4 text-2xl text-center tracking-[0.5em] font-extrabold text-text-dark
                         focus:border-sage-500 focus:outline-none disabled:opacity-60"
              placeholder="••••••"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={codeStatus === "verifying" || code.length < 6}
            className="w-full rounded-2xl cta-sage text-white text-lg font-extrabold py-4
                       shadow-[0_6px_20px_rgba(93,168,130,0.4)] disabled:opacity-60"
          >
            {codeStatus === "verifying" ? "Checking…" : "Sign in"}
          </button>

          {codeStatus === "error" && (
            <p className="text-sm text-peach-600 text-center font-bold">{codeError}</p>
          )}

          <button
            type="button"
            onClick={() => { setStatus({ kind: "idle" }); setCode(""); setCodeStatus("idle"); setCodeError(""); }}
            className="text-sm text-sage-600 font-extrabold text-center"
          >
            Use a different email or resend the code
          </button>
        </form>
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
        />
      </div>

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="w-full rounded-2xl cta-sage text-white text-lg font-extrabold py-4
                   shadow-[0_6px_20px_rgba(93,168,130,0.4)]
                   disabled:opacity-60"
      >
        {status.kind === "sending" ? "Sending…" : "Send me a sign-in code"}
      </button>

      {status.kind === "error" && (
        <p className="text-sm text-peach-600 text-center font-bold">{status.message}</p>
      )}
    </form>
  );
}
