"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// No Realtime/websocket — this app is server actions + revalidation
// throughout, so "feels live while the screen is open" is just a light
// poll refetching the page while the chat is mounted. Negligible load
// at this user count.
const POLL_MS = 12_000;

export function ChatAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
