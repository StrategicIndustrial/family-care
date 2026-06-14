"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { lockPinAction } from "@/app/actions/pin";

// 10-minute idle window. Brief §7: PIN screen re-appears after app resumes
// from background with ≥10 minutes of inactivity.
//
// On every navigation the proxy refreshes the unlock cookie's max-age, so
// active users stay signed in. This watcher handles the case where the tab
// is open but unused — we explicitly lock after 10 min idle so the gate
// re-appears on the next interaction.
const IDLE_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export function IdleWatcher() {
  const router = useRouter();
  const lastActive = useRef<number>(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const armTimer = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const idle = Date.now() - lastActive.current;
        if (idle >= IDLE_MS) {
          await lockPinAction();
          router.refresh();
        }
      }, IDLE_MS);
    };

    const onActivity = () => {
      lastActive.current = Date.now();
      armTimer();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const idle = Date.now() - lastActive.current;
        if (idle >= IDLE_MS) {
          lockPinAction().then(() => router.refresh());
        } else {
          onActivity();
        }
      }
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    armTimer();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
