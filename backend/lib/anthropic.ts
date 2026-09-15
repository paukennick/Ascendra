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

// Local-dev-only alternate provider: a self-hosted Ollama instance (elsewhere
// on the network) speaking its OpenAI-compatible /v1/chat/completions API.
// Never used unless AI_PROVIDER=local is explicitly set — production always
// uses Anthropic. Quality is noticeably rougher than Claude; this exists for
// free local iteration, not as a production substitute.
function isLocalProvider(): boolean {
  return process.env.AI_PROVIDER === "local";
}

function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
}

function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

async function callOllama(opts: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const baseUrl = getOllamaBaseUrl();
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 2000,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Ollama request to ${baseUrl} failed (${res.status}). Is it running and reachable from this machine, with OLLAMA_HOST=0.0.0.0 set on the host if it's on another workstation? ${body.slice(0, 300)}`
    );
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Ollama response had no message content.");
  }
  return text;
}

/**
 * Calls the configured AI provider (Anthropic by default, or a local Ollama
 * instance when AI_PROVIDER=local) and returns the raw reply text. Throws on
 * API error (routes should catch and 500).
 */
export async function callClaude(opts: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  if (isLocalProvider()) {
    return callOllama(opts);
  }
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
