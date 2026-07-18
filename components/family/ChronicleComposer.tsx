"use client";

import { useRef, useState, useTransition } from "react";
import { createMedicalNote } from "@/app/actions/chronicle";
import { Button } from "@/components/ui/Button";

const NOTE_CATEGORIES: { value: string; label: string }[] = [
  { value: "gp_note",     label: "GP Note" },
  { value: "specialist",  label: "Specialist" },
  { value: "hospital",    label: "Hospital" },
  { value: "test_result", label: "Test Result" },
  { value: "observation", label: "Observation" },
  { value: "other",       label: "Other" },
];

const ACCEPTED_MIME = "application/pdf,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChronicleComposer() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("gp_note");
  const [date, setDate] = useState(todayISO());
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    setCategory("gp_note");
    setDate(todayISO());
    setBody("");
    setFile(null);
    setError(null);
    setOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!open) {
    return (
      <Button variant="lavender" fullWidth onClick={() => setOpen(true)}>
        + Add medical note
      </Button>
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError(`File too large. Maximum is ${formatBytes(MAX_FILE_BYTES)}.`);
      e.target.value = "";
      return;
    }
    setFile(f);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !formRef.current) return;
    setError(null);
    const fd = new FormData(formRef.current);
    startTransition(async () => {
      try {
        await createMedicalNote(fd);
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-white p-4 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
    >
      <h3 className="font-extrabold text-text-dark text-sm">Add medical note</h3>

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-2">Category</label>
        <div className="grid grid-cols-3 gap-2">
          {NOTE_CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              onClick={() => setCategory(value)}
              className={`rounded-xl py-2.5 text-xs font-bold border-2 transition-all ${
                category === value ? "border-lavender-400 bg-lavender-50 text-lavender-700" : "border-line bg-white text-text-mid"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={category} />
      </div>

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-2">Date</label>
        <input
          type="date"
          name="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          disabled={pending}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base focus:border-lavender-400 focus:outline-none disabled:opacity-60"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-2">Notes</label>
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={pending}
          placeholder="Describe what was noted, discussed, or observed…"
          rows={5}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base focus:border-lavender-400 focus:outline-none disabled:opacity-60 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-text-mid uppercase tracking-wide mb-2">
          Attachment <span className="font-normal normal-case text-text-mid">(PDF or image, max 20 MB)</span>
        </label>

        {file ? (
          <div className="flex items-center gap-2 rounded-xl border border-lavender-200 bg-lavender-50 px-3 py-2.5">
            <span className="flex-1 text-sm text-lavender-700 font-semibold truncate">{file.name}</span>
            <span className="text-xs text-text-mid shrink-0">{formatBytes(file.size)}</span>
            {!pending && (
              <button
                type="button"
                onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="text-text-mid hover:text-red-500 transition-colors"
                aria-label="Remove attachment"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-line bg-white py-4 text-sm text-text-mid font-semibold
                       hover:border-lavender-300 hover:bg-lavender-50 transition-all disabled:opacity-50"
          >
            📎 Attach a file
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept={ACCEPTED_MIME}
          onChange={handleFileChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {pending && <p className="text-xs text-text-mid font-semibold">Saving…</p>}
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="lavender" disabled={pending || !body.trim()} className="flex-1">
          {pending ? "Saving…" : "Save note"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={reset}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
