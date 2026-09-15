import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it in Vercel project env vars (or .env.local for local dev) — see backend/.env.example. Get a key at https://console.anthropic.com/settings/keys"
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Model id is read from env so it can be bumped without a redeploy of code —
// confirm the current model string at https://docs.anthropic.com/en/docs/about-claude/models
// before relying on this in production; the default below may be stale.
export function getModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Calls the Anthropic Messages API and returns the raw text of the first
 * text content block. Throws on API error (routes should catch and 500).
 */
export async function callClaude(opts: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const anthropic = getClient();
  const res = await anthropic.messages.create({
    model: getModel(),
    max_tokens: opts.maxTokens ?? 2000,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: opts.messages,
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Anthropic response had no text content block.");
  }
  return block.text;
}

/**
 * Calls Claude and parses the reply as JSON. Strips a ```json fence if present
 * (models sometimes wrap JSON in one even when told not to) and throws a
 * descriptive error if parsing still fails, including a truncated raw reply
 * so the failure is debuggable from route logs.
 */
export async function callClaudeJSON<T>(opts: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const raw = await callClaude(opts);
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `Claude did not return valid JSON. Raw reply (truncated): ${cleaned.slice(0, 500)}`
    );
  }
}
