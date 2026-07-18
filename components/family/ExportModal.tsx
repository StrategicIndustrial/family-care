"use client";

import { useState } from "react";

type ExportType = "note" | "observation" | "appointment";
type ExportFormat = "pdf" | "csv";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TYPE_OPTIONS: { key: ExportType; label: string; emoji: string }[] = [
  { key: "note", label: "Notes", emoji: "📋" },
  { key: "observation", label: "Observations", emoji: "👁" },
  { key: "appointment", label: "Appointments", emoji: "📅" },
];

export function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [types, setTypes] = useState<ExportType[]>(["note", "observation", "appointment"]);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function toggleType(t: ExportType) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleDownload() {
    if (types.length === 0) {
      setError("Please select at least one entry type.");
      return;
    }
    if (from > to) {
      setError("Start date must be before the end date.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/chronicle-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, types, format }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Export failed" }));
        setError(body.error ?? `Export failed (HTTP ${res.status})`);
        setStatus("error");
        return;
      }

      const blob = await res.blob();
      const filename = `care-chronicle-${from}-to-${to}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("idle");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Export for GP">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-text-dark">Export for GP</h2>
              <p className="text-xs text-text-mid mt-0.5">Download the Chronicle as a file to share with the GP.</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-text-mid hover:bg-gray-200 transition-colors"
              aria-label="Close export modal"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5 pb-4">
            <fieldset>
              <legend className="text-xs font-extrabold text-text-dark uppercase tracking-wide mb-2">Date range</legend>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label htmlFor="export-from" className="text-[11px] text-text-mid block mb-1">From</label>
                  <input
                    id="export-from"
                    type="date"
                    value={from}
                    max={to}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-lavender-400"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="export-to" className="text-[11px] text-text-mid block mb-1">To</label>
                  <input
                    id="export-to"
                    type="date"
                    value={to}
                    min={from}
                    max={todayISO()}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-lavender-400"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-extrabold text-text-dark uppercase tracking-wide mb-2">Include</legend>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(({ key, label, emoji }) => {
                  const checked = types.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleType(key)}
                      aria-pressed={checked}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold border transition-all ${
                        checked ? "bg-lavender-100 border-lavender-300 text-lavender-700" : "bg-white border-gray-200 text-text-mid"
                      }`}
                    >
                      <span aria-hidden="true">{emoji}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-extrabold text-text-dark uppercase tracking-wide mb-2">Format</legend>
              <div className="flex gap-3">
                {([
                  { key: "pdf" as ExportFormat, label: "PDF", desc: "Formatted report" },
                  { key: "csv" as ExportFormat, label: "CSV", desc: "Spreadsheet rows" },
                ]).map(({ key, label, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormat(key)}
                    aria-pressed={format === key}
                    className={`flex-1 rounded-xl border p-3 text-left transition-all ${
                      format === key ? "border-lavender-400 bg-lavender-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className={`text-sm font-bold ${format === key ? "text-lavender-700" : "text-text-dark"}`}>{label}</div>
                    <div className="text-[11px] text-text-mid mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-full border border-gray-200 bg-white py-3 text-sm font-bold text-text-mid hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isLoading || types.length === 0}
            className="flex-1 rounded-full cta-sage text-white py-3 text-sm font-bold disabled:opacity-60 transition-all"
          >
            {isLoading ? "Preparing…" : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
