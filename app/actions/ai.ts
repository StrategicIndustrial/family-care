"use server";

import { requireRole } from "@/lib/auth-helpers";
import { callClaude } from "@/lib/anthropic";

// Brief §8 — verbatim system prompt for Dad's update composer.
const POLISH_SYSTEM_PROMPT = `You are helping a caring husband write a brief family update about his wife, who has dementia.

He has written a rough note. Rewrite it as a warm, clear 2-3 sentence family update.
Keep his voice. Don't be overly formal. Don't use clinical language.
Don't add information that wasn't there. Output only the rewritten text, nothing else.`;

const MAX_INPUT_CHARS = 2000;

export async function polishUpdate(rough: string): Promise<string> {
  // Brief says this is Dad's button specifically, but allow family too —
  // they post updates as well and benefit from the same nudge.
  await requireRole("primary_carer", "family");

  const trimmed = rough.trim();
  if (!trimmed) throw new Error("Write something first.");
  if (trimmed.length > MAX_INPUT_CHARS) {
    throw new Error("That's a long one — keep it under ~2000 characters.");
  }

  return callClaude({
    system: POLISH_SYSTEM_PROMPT,
    user: trimmed,
    maxTokens: 1000,
  });
}
