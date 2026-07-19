"use client";

import { useRef, useTransition } from "react";
import { postMessage } from "@/app/actions/chat";

export function ChatComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;
    startTransition(async () => {
      await postMessage(formData);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex items-end gap-2">
      <textarea
        name="body"
        required
        rows={1}
        placeholder="Message the family…"
        disabled={pending}
        className="flex-1 rounded-2xl border-2 border-line bg-white px-4 py-2.5 text-sm
                   focus:outline-none focus:border-sky-500 disabled:opacity-60 resize-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-white
                   disabled:opacity-60"
        style={{ background: "var(--color-sky-500)" }}
        aria-label="Send"
      >
        {pending ? "…" : "➤"}
      </button>
    </form>
  );
}
