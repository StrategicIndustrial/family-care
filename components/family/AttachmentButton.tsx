"use client";

import { useTransition } from "react";
import { getDocumentDownloadUrl } from "@/app/actions/chronicle";

export function AttachmentButton({ documentId, documentName }: { documentId: string; documentName?: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const url = await getDocumentDownloadUrl(documentId);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        alert("Could not open attachment. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-all mt-1
                 bg-lavender-50 border-lavender-200 text-lavender-700 hover:bg-lavender-100 disabled:opacity-50"
    >
      📎 <span className="truncate max-w-[160px]">{pending ? "Getting link…" : (documentName ?? "Attachment")}</span>
    </button>
  );
}
