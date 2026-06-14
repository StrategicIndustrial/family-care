"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPinAction, type PinResult } from "@/app/actions/pin";

type Props = {
  preferredName: string;
  warm?: boolean; // true → Mum's palette
};

type State =
  | { kind: "entering" }
  | { kind: "checking" }
  | { kind: "wrong"; attemptsLeft: number }
  | { kind: "locked" };

export function PinScreen({ preferredName, warm = false }: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [state, setState] = useState<State>({ kind: "entering" });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first empty slot on mount and after a wrong attempt.
  useEffect(() => {
    const idx = digits.findIndex((d) => !d);
    inputRefs.current[idx === -1 ? 3 : idx]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind]);

  async function submit(pin: string) {
    setState({ kind: "checking" });
    const result: PinResult = await verifyPinAction(pin);

    if (result.ok) {
      router.refresh();
      return;
    }
    if (result.reason === "locked") {
      setState({ kind: "locked" });
      return;
    }
    if (result.reason === "wrong") {
      setDigits(["", "", "", ""]);
      setState({ kind: "wrong", attemptsLeft: result.attemptsLeft });
      return;
    }
    // no_session / not_enabled → refresh so the layout re-evaluates
    router.refresh();
  }

  function handleChange(i: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);

    if (cleaned && i < 3) {
      inputRefs.current[i + 1]?.focus();
    }
    if (next.every((d) => d) && next.join("").length === 4) {
      submit(next.join(""));
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  const bg = warm ? "bg-warm-bg" : "bg-white";
  const locked = state.kind === "locked";
  const checking = state.kind === "checking";

  return (
    <main className={`flex-1 flex items-center justify-center px-6 py-10 ${bg}`}>
      <div className="w-full max-w-sm text-center space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-text-dark">
            Hi {preferredName}
          </h1>
          <p className="text-text-mid">
            {locked
              ? "Ask one of the boys to help you get back in."
              : "Enter your 4-digit PIN to continue."}
          </p>
        </header>

        {!locked && (
          <div className="flex justify-center gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={d}
                disabled={checking}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                aria-label={`Digit ${i + 1}`}
                className="w-14 h-16 rounded-xl border-2 border-line bg-white text-center
                           text-2xl font-semibold text-text-dark
                           focus:border-primary focus:outline-none disabled:opacity-60"
              />
            ))}
          </div>
        )}

        {state.kind === "wrong" && (
          <p className="text-warning text-sm">
            That's not right.{" "}
            {state.attemptsLeft === 1
              ? "1 try left."
              : `${state.attemptsLeft} tries left.`}
          </p>
        )}
        {checking && <p className="text-text-mid text-sm">Checking…</p>}
      </div>
    </main>
  );
}
