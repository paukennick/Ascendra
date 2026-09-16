import Anthropic from "@anthropic-ai/sdk";
import { oidcFederationProvider } from "@anthropic-ai/sdk/lib/credentials/oidc-federation";
import { getVercelOidcToken } from "@vercel/oidc";

let client: Anthropic | null = null;

// Production authenticates to Anthropic via Workload Identity Federation:
// Vercel issues each Function a short-lived OIDC token (no secret stored),
// which gets exchanged for an Anthropic access token bound to a federation
// rule configured in the Claude Console (Settings -> Workload identity).
// ANTHROPIC_API_KEY is kept as a fallback so local dev (which has no Vercel
// OIDC token) keeps working with a plain key in .env.local.
function getClient(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    client = new Anthropic({ apiKey });
    return client;
  }

  const federationRuleId = process.env.ANTHROPIC_FEDERATION_RULE_ID;
  const organizationId = process.env.ANTHROPIC_ORGANIZATION_ID;
  if (!federationRuleId || !organizationId) {
    throw new Error(
      "No Anthropic credentials configured. Set ANTHROPIC_API_KEY for local dev, or " +
        "ANTHROPIC_FEDERATION_RULE_ID + ANTHROPIC_ORGANIZATION_ID (+ ANTHROPIC_SERVICE_ACCOUNT_ID / " +
        "ANTHROPIC_WORKSPACE_ID) for Workload Identity Federation on Vercel — see backend/.env.example."
    );
  }

  client = new Anthropic({
    credentials: oidcFederationProvider({
      identityTokenProvider: () => getVercelOidcToken(),
      federationRuleId,
      organizationId,
      serviceAccountId: process.env.ANTHROPIC_SERVICE_ACCOUNT_ID,
      workspaceId: process.env.ANTHROPIC_WORKSPACE_ID,
      baseURL: "https://api.anthropic.com",
      fetch,
    }),
  });
  return client;
}

// Model id is read from env so it can be bumped without a redeploy of code —
// confirm the current model string at https://docs.anthropic.com/en/docs/about-claude/models
// before relying on this in production; the default below may be stale.
export function getModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
}

// Cheaper model for uncached, per-user-interaction calls (chat, grading, PBQ
// generation) — lesson content stays on the default model since it's
// generated once per objective and cached for every user afterward, so its
// cost doesn't scale with usage the way these calls do. Swap AI_PROVIDER=local
// (Ollama) in for these once that's built, to drop the cost further.
export function getFastModel(): string {
  return process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001";
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
async function callClaudeWithMeta(opts: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<{ text: string; stopReason: string | null }> {
  if (isLocalProvider()) {
    return { text: await callOllama(opts), stopReason: null };
  }
  const anthropic = getClient();
  const res = await anthropic.messages.create({
    model: opts.model ?? getModel(),
    max_tokens: opts.maxTokens ?? 2000,
    // Newer Claude models (e.g. Sonnet 5) reject `temperature` outright
    // ("deprecated for this model"), so only send it when a caller opts in.
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    system: opts.system,
    messages: opts.messages,
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    const blockTypes = res.content.map((b) => b.type).join(", ") || "none";
    throw new Error(
      `Anthropic response had no text content block. stop_reason=${res.stop_reason}, blocks=[${blockTypes}]`
    );
  }
  return { text: block.text, stopReason: res.stop_reason };
}

export async function callClaude(opts: {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const { text } = await callClaudeWithMeta(opts);
  return text;
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
  model?: string;
}): Promise<T> {
  const { text: raw, stopReason } = await callClaudeWithMeta(opts);
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `Claude did not return valid JSON. stop_reason=${stopReason}, length=${cleaned.length}. ` +
        `Head: ${cleaned.slice(0, 300)} ... Tail: ${cleaned.slice(-300)}`
    );
  }
}
