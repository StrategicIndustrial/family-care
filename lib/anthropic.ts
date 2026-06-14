// Thin wrapper around the Anthropic Messages API.
// Server-only — never import from a Client Component.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

type MessageBlock = { type: "text"; text: string };

type AnthropicResponse = {
  content: MessageBlock[];
  stop_reason?: string;
  error?: { type: string; message: string };
};

export async function callClaude(opts: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: opts.model ?? "claude-sonnet-4-6",
      max_tokens: opts.maxTokens ?? 1000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const body = (await res.json()) as AnthropicResponse;
  if (body.error) throw new Error(`Claude API: ${body.error.message}`);

  const text = (body.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("Claude returned an empty response.");
  return text;
}
