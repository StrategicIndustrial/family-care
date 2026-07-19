"use client";

import { useEffect } from "react";
import { markChatRead } from "@/app/actions/chat";

export function MarkChatReadOnMount() {
  useEffect(() => {
    markChatRead().catch(() => {
      // Best-effort — worst case the unread badge stays on a bit longer.
    });
  }, []);

  return null;
}
