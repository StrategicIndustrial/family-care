"use client";

import { useEffect } from "react";

// Best-effort request that the browser/OS not evict this origin's storage
// (cookies included) under pressure — relevant since sessions are meant to
// last indefinitely on personal/dedicated devices. Not a guarantee, and
// unsupported browsers just no-op.
export function PersistentStorageRequest() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.storage?.persist) return;

    navigator.storage.persist().catch(() => {
      // Best-effort only — nothing to do if the browser declines or the
      // API isn't fully supported.
    });
  }, []);

  return null;
}
