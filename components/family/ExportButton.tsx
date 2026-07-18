"use client";

import { useState } from "react";
import { ExportModal } from "@/components/family/ExportModal";

export function ExportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-white/80 hover:text-white bg-white/20 rounded-xl px-3 py-2 transition-all"
      >
        Export for GP
      </button>
      <ExportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
