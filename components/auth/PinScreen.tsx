"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPinAction, type PinResult } from "@/app/actions/pin";

type Props = {
  preferredName: string;
  warm?: boolean; // person in care palette
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

  useEffect(() => {
    const idx = digits.findIndex((d) => !d);
    inputRefs.current[idx === -1 ? 3 : idx]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind]);

  async function submit(pin: string) {
    setState({ kind: "checking" });
    const result: PinResult = await verifyPinAction(pin);

    if (result.ok) { router.refresh(); return; }
    if (result.reason === "locked") { setState({ kind: "locked" }); return; }
    if (result.reason === "wrong") {
      setDigits(["", "", "", ""]);
      setState({ kind: "wrong", attemptsLeft: result.attemptsLeft });
      return;
    }
    router.refresh();
  }

  function handleChange(i: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    if (cleaned && i < 3) inputRefs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 4) submit(next.join(""));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  const bg = warm ? "bg-warm-bg" : "bg-cream";
  const locked = state.kind === "locked";
  const checking = state.kind === "checking";

  const filled = digits.filter(Boolean).length;

  return (
    <main className={`flex-1 flex flex-col items-center justify-center px-8 py-16 ${bg} anim-fade-in`}>
      <div className="w-full max-w-sm text-center space-y-8">
        <header className="flex flex-col items-center space-y-3">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: warm ? "#fde8e0" : "#e8e0f5" }}
            aria-hidden="true"
          >
            {warm ? "👵" : "👤"}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-dark">Hi, {preferredName}</h1>
            <p className="text-sm text-text-mid mt-1">
              {locked
                ? "Ask one of the boys to help you get back in."
                : "Enter your PIN to continue"}
            </p>
          </div>
        </header>

        {!locked && (
          <>
            {/* Big dot indicator */}
            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full border-2 border-sage-100 transition-colors"
                  style={{ background: i < filled ? "#7bbfa0" : "transparent" }}
                />
              ))}
            </div>

            {/* Hidden inputs — the real form */}
            <div className="flex justify-center gap-2 sr-only">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={1}
                  value={d}
                  disabled={checking}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            {/* Visible tap keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={checking}
                  onClick={() => {
                    const next = [...digits];
                    const idx = next.findIndex((d) => !d);
                    if (idx === -1) return;
                    next[idx] = String(n);
                    setDigits(next);
                    if (next.every(Boolean)) submit(next.join(""));
                  }}
                  className="rounded-2xl bg-white py-5 text-2xl font-extrabold text-text-dark shadow-[0_2px_8px_rgba(0,0,0,0.07)] active:brightness-95"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={checking}
                onClick={() => setDigits((d) => {
                  const next = [...d];
                  const idx = [...next].reverse().findIndex(Boolean);
                  if (idx === -1) return next;
                  next[next.length - 1 - idx] = "";
                  return next;
                })}
                className="rounded-2xl py-5 text-2xl font-extrabold text-peach-500 active:brightness-95"
              >
                ⌫
              </button>
              <button
                key={0}
                type="button"
                disabled={checking}
                onClick={() => {
                  const next = [...digits];
                  const idx = next.findIndex((d) => !d);
                  if (idx === -1) return;
                  next[idx] = "0";
                  setDigits(next);
                  if (next.every(Boolean)) submit(next.join(""));
                }}
                className="rounded-2xl bg-white py-5 text-2xl font-extrabold text-text-dark shadow-[0_2px_8px_rgba(0,0,0,0.07)] active:brightness-95"
              >
                0
              </button>
              <div />
            </div>
          </>
        )}

        {state.kind === "wrong" && (
          <p className="text-peach-500 text-sm font-bold">
            That's not right. {state.attemptsLeft === 1 ? "1 try left." : `${state.attemptsLeft} tries left.`}
          </p>
        )}
        {checking && <p className="text-text-mid text-sm">Checking…</p>}
      </div>
    </main>
  );
}
