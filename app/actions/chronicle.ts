"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth-helpers";
import { callClaude } from "@/lib/anthropic";

const STORAGE_BUCKET = "care-documents";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const NOTE_CATEGORIES = ["gp_note", "specialist", "hospital", "test_result", "observation", "other"] as const;
type NoteCategory = (typeof NOTE_CATEGORIES)[number];

// Add a Chronicle medical note, optionally with an attached file.
//
// The reference prototype did this via a Supabase Edge Function issuing a
// signed upload URL, with the browser PUTting the file directly and
// reporting progress via XHR. Here the file rides along as multipart
// FormData straight into this Server Action instead — one round trip,
// no signed-URL plumbing, at the cost of no live progress percentage.
// next.config.ts raises the Server Action body limit to 25 MB to fit.
export async function createMedicalNote(formData: FormData): Promise<void> {
  const ctx = await requireRole("primary_carer", "family", "patient");

  const category = String(formData.get("category") ?? "");
  if (!NOTE_CATEGORIES.includes(category as NoteCategory)) {
    throw new Error("Invalid category.");
  }
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date.");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Notes can't be empty.");

  const file = formData.get("file");
  let documentId: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`File too large — maximum is ${MAX_FILE_BYTES / (1024 * 1024)} MB.`);
    }
    if (!ACCEPTED_MIME.has(file.type)) {
      throw new Error("Only PDF or image attachments (JPEG/PNG/WebP/GIF/HEIC) are accepted.");
    }

    const admin = getSupabaseServiceClient();
    const storagePath = `${ctx.userId}/${randomUUID()}-${file.name}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: doc, error: docError } = await admin
      .from("documents")
      .insert({
        storage_path: storagePath,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        author: ctx.userId,
      })
      .select("id")
      .single();
    if (docError || !doc) throw new Error(`Could not save attachment: ${docError?.message}`);
    documentId = doc.id;
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("medical_notes").insert({
    category,
    date,
    body,
    author_id: ctx.userId,
    ...(documentId ? { document_id: documentId } : {}),
  });
  if (error) throw new Error(`Could not save note: ${error.message}`);

  revalidatePath("/family/chronicle");
  revalidatePath("/family");
  revalidatePath("/dad");
}

// Short-lived signed URL so an attachment can be opened/downloaded —
// never a public bucket URL. Role-gated the same way the table read is.
export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  await requireRole("primary_carer", "family", "patient");

  const admin = getSupabaseServiceClient();
  const { data: doc, error: docError } = await admin
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();
  if (docError || !doc) throw new Error("Attachment not found.");

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, 60);
  if (error || !data) throw new Error(`Could not create download link: ${error?.message}`);

  return data.signedUrl;
}

// ── AI Insights ─────────────────────────────────────────────────────────
// Summarises the Chronicle timeline for a given range, cached in
// ai_insights keyed by (range, filters_hash, data_hash) so re-requesting
// against unchanged data doesn't re-charge Anthropic credits.

const INSIGHTS_SYSTEM_PROMPT = `You are summarising a dementia patient's care timeline for her family, from carer notes, medical records, and appointment history.

Write a concise summary (4-6 short paragraphs, using ## headings and **bold** for key points) covering: overall pattern of behaviour/symptoms/mood, notable medical events, and anything that stands out as worth flagging to a GP. Be factual — don't speculate beyond what's in the notes. Use plain, warm language, not clinical jargon.`;

type ChronicleRange = "30d" | "90d";

function rangeCutoff(range: ChronicleRange): string {
  const days = range === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function generateInsights(range: ChronicleRange): Promise<{ summary: string; generatedAt: string }> {
  await requireRole("primary_carer", "family");
  const admin = getSupabaseServiceClient();
  const cutoff = rangeCutoff(range);

  const [notesR, obsR, apptR] = await Promise.all([
    admin.from("medical_notes").select("category, date, body").gte("date", cutoff).order("date", { ascending: false }),
    admin.from("observations").select("type, body, created_at").gte("created_at", cutoff).order("created_at", { ascending: false }),
    admin.from("appointments").select("title, appointment_date, specialist, location").gte("appointment_date", cutoff).order("appointment_date", { ascending: false }),
  ]);

  const dataset = {
    notes: notesR.data ?? [],
    observations: obsR.data ?? [],
    appointments: apptR.data ?? [],
  };
  const dataHash = createHash("sha256").update(JSON.stringify(dataset)).digest("hex");
  const filtersHash = "none";

  const { data: cached } = await admin
    .from("ai_insights")
    .select("summary, generated_at")
    .eq("range", range)
    .eq("filters_hash", filtersHash)
    .eq("data_hash", dataHash)
    .maybeSingle();

  if (cached) return { summary: cached.summary, generatedAt: cached.generated_at };

  if (dataset.notes.length === 0 && dataset.observations.length === 0 && dataset.appointments.length === 0) {
    throw new Error("Nothing logged in this period yet — add some notes or observations first.");
  }

  const userPrompt = `Timeline data (JSON):\n${JSON.stringify(dataset, null, 2)}`;
  const summary = await callClaude({ system: INSIGHTS_SYSTEM_PROMPT, user: userPrompt, maxTokens: 1200 });

  const { data: saved, error: saveError } = await admin
    .from("ai_insights")
    .upsert(
      { range, filters_hash: filtersHash, data_hash: dataHash, summary },
      { onConflict: "range,filters_hash,data_hash" },
    )
    .select("generated_at")
    .single();
  if (saveError || !saved) throw new Error(`Generated but failed to cache: ${saveError?.message}`);

  return { summary, generatedAt: saved.generated_at };
}
