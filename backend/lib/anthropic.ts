import Anthropic from "@anthropic-ai/sdk";
import { oidcFederationProvider } from "@anthropic-ai/sdk/lib/credentials/oidc-federation";
import { getVercelOidcToken } from "@vercel/oidc";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { flattenSystem, type SystemPrompt } from "@/lib/prompts";
import { AiResponseError, loggedCall, type AiPurpose } from "@/lib/ai-calls";

// The two methods this module uses, loosely typed so tests can supply a fake
// (no network, no key) and because request params carry fields the installed
// SDK's types predate (thinking.type "between_tools").
interface ClientLike {
  messages: {
    create(params: any): Promise<any>;
    parse(params: any): Promise<any>;
  };
}

let client: ClientLike | null = null;

// Test seam: null restores the real client.
export function __setClientForTest(c: ClientLike | null): void {
  client = c;
}

// Production authenticates to Anthropic via Workload Identity Federation:
// Vercel issues each Function a short-lived OIDC token (no secret stored),
// which gets exchanged for an Anthropic access token bound to a federation
// rule configured in the Claude Console (Settings -> Workload identity).
// ANTHROPIC_API_KEY is kept as a fallback so local dev (which has no Vercel
// OIDC token) keeps working with a plain key in .env.local.
function getClient(): ClientLike {
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

// Model ids are read from env so they can be bumped without a code change.
// The defaults are the Claude 5.5 models (Phase 0 of the AI modernization).
// Production should confirm both ids against
// https://platform.claude.com/docs/en/about-claude/models before relying on
// them, and may pin ANTHROPIC_MODEL / ANTHROPIC_FAST_MODEL to roll back to the
// 4.5 ids (claude-sonnet-4-5, claude-haiku-4-5-20251001): modelParams below
// knows both generations, so a rollback needs no code change.
export function getModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
}

// Cheaper model for uncached, per-user-interaction calls (chat, grading, PBQ
// generation) — lesson content stays on the default model since it's
// generated once per objective and cached for every user afterward, so its
// cost doesn't scale with usage the way these calls do. Swap AI_PROVIDER=local
// (Ollama) in for these once that's built, to drop the cost further.
export function getFastModel(): string {
  return process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-5-5";
}

// ---------------------------------------------------------------------------
// Per-model request parameters
// ---------------------------------------------------------------------------
//
// What each model family accepts differs, and a wrong combination is a 400
// from the API (a failed learner request), so it is decided here, in one pure
// function, rather than at each call site:
//
//  - temperature / top_p / top_k: never sent. Sonnet 5.5 returns 400 for them,
//    both 5.5 models want them omitted, and no caller needs them.
//  - thinking: the 5.5 models run adaptive thinking when `thinking` is
//    omitted, and thinking tokens count against max_tokens. Two real
//    production-shaped failures came from that on Sonnet 5 (a text block
//    truncated mid-JSON, and a reply with no text block at all). The tasks
//    here are content generation / grading, not open reasoning, so callers ask
//    for thinking "off". How "off" is spelled depends on the model:
//      Sonnet 5.5  {type:"between_tools"}  ({type:"disabled"} is a 400);
//                  valid only at effort low|medium|high.
//      Haiku 5.5   {type:"disabled"}, valid at effort high or below.
//      4.5 models  {type:"disabled"}.
//    {type:"enabled", budget_tokens} is a 400 on 5.5 and is never sent.
//  - output_config.effort: sent for the 5.5 models; NOT supported on the 4.5
//    models, where it is dropped (so ANTHROPIC_MODEL can be rolled back).
//  - An unrecognized model id gets neither thinking nor effort (the safe
//    default: nothing the API could reject) plus a one-time warning, and its
//    max_tokens gets thinking headroom since thinking may run.

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export type ThinkingMode = "off" | "default";
export type ModelFamily = "sonnet-5-5" | "haiku-5-5" | "opus-5-5" | "legacy-4-5" | "unknown";

export type ThinkingParam = { type: "disabled" } | { type: "between_tools" };

export interface ModelParams {
  thinking?: ThinkingParam;
  effort?: Effort;
}

const EFFORTS: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];
// Effort levels at which turning thinking off is valid.
const THINKING_OFF_EFFORTS: readonly Effort[] = ["low", "medium", "high"];

export function modelFamily(model: string): ModelFamily {
  const m = model.trim().toLowerCase();
  if (/^claude-sonnet-5-5(-|$)/.test(m)) return "sonnet-5-5";
  if (/^claude-haiku-5-5(-|$)/.test(m)) return "haiku-5-5";
  if (/^claude-opus-5-5(-|$)/.test(m)) return "opus-5-5";
  if (/^claude-(sonnet|haiku)-4-5(-|$)/.test(m)) return "legacy-4-5";
  return "unknown";
}

export function modelParams(
  model: string,
  opts: { effort?: Effort; thinking?: ThinkingMode } = {}
): ModelParams {
  const { effort } = opts;
  const thinking: ThinkingMode = opts.thinking ?? "default";
  if (effort !== undefined && !EFFORTS.includes(effort)) {
    throw new Error(`Invalid effort "${String(effort)}" (expected one of ${EFFORTS.join(", ")}).`);
  }
  const family = modelFamily(model);

  const offAllowedAtEffort = effort === undefined || THINKING_OFF_EFFORTS.includes(effort);
  const rejectOff = (spelling: string) =>
    new Error(
      `thinking "off" (${spelling}) is only valid at effort low, medium or high on ${model}; got "${effort}". ` +
        `Use thinking "default" or a lower effort.`
    );

  switch (family) {
    case "sonnet-5-5":
      if (thinking === "off") {
        if (!offAllowedAtEffort) throw rejectOff("between_tools");
        return { thinking: { type: "between_tools" }, ...(effort ? { effort } : {}) };
      }
      return effort ? { effort } : {};
    case "haiku-5-5":
      if (thinking === "off") {
        if (!offAllowedAtEffort) throw rejectOff("disabled");
        return { thinking: { type: "disabled" }, ...(effort ? { effort } : {}) };
      }
      return effort ? { effort } : {};
    case "opus-5-5":
      // Effort is supported. How to switch thinking off on Opus 5.5 has not
      // been verified, so it is never sent: Opus runs its default thinking
      // (its only user here is the offline eval judge, where that is wanted),
      // and effortMaxTokens gives it headroom.
      return effort ? { effort } : {};
    case "legacy-4-5":
      // No effort parameter on these models. Thinking is off unless asked for,
      // and "disabled" is the explicit spelling.
      return thinking === "off" ? { thinking: { type: "disabled" } } : {};
    default:
      return {};
  }
}

// Extra max_tokens for calls where the model may think (thinking tokens share
// the max_tokens ceiling with the answer). Known models called with thinking
// "off" need none, so the existing per-call caps (lessons 4000/6000, grading
// 800/900, PBQ 1200, chat 1200, guess feedback 500) stay as they were: those
// were sized for the answer alone, and with thinking off the answer is all the
// model produces. Unknown models and Opus (thinking can't be turned off, or
// we can't tell) get headroom.
export const THINKING_HEADROOM_TOKENS = 4000;

export function effectiveMaxTokens(model: string, base: number, thinking: ThinkingMode = "default"): number {
  const family = modelFamily(model);
  const thinkingMayRun =
    family === "unknown" ||
    family === "opus-5-5" ||
    ((family === "sonnet-5-5" || family === "haiku-5-5") && thinking === "default");
  return thinkingMayRun ? base + THINKING_HEADROOM_TOKENS : base;
}

const warnedUnknownModels = new Set<string>();

// One warning per unknown model id per process. `log` is injectable for tests.
export function warnUnknownModelOnce(model: string, log: (msg: string) => void = console.warn): boolean {
  if (warnedUnknownModels.has(model)) return false;
  warnedUnknownModels.add(model);
  log(
    `[anthropic] Unrecognized model id "${model}": sending no thinking or effort parameters. ` +
      `Add it to modelFamily() in lib/anthropic.ts if it supports them.`
  );
  return true;
}

export function __resetUnknownModelWarningsForTest(): void {
  warnedUnknownModels.clear();
}

// ---------------------------------------------------------------------------
// Request building
// ---------------------------------------------------------------------------

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  // Put a prompt-cache breakpoint after this turn, so the conversation up to
  // and including it is read from cache next time instead of re-billed. Only
  // useful on the last turn of a long, stable history (chat).
  cacheBreakpoint?: boolean;
}

export interface CallOptions {
  system: string | SystemPrompt;
  messages: ChatTurn[];
  maxTokens?: number;
  model?: string;
  effort?: Effort;
  thinking?: ThinkingMode;
  // Recorded in ai_calls; required so a new call site can't go unlabelled.
  purpose: AiPurpose;
  userId?: string | null;
}

const EPHEMERAL = { type: "ephemeral" } as const;

// SystemPrompt -> two system content blocks: the stable coach rules first,
// with a cache breakpoint, then the per-task instructions. The cache prefix
// covers everything up to and including the breakpoint block, so the stable
// block must come first and must be byte-identical between calls. Prompts
// under the model's minimum cacheable length (512 tokens on the 5.5 models,
// 1,024 on Sonnet 4.5, 4,096 on Haiku 4.5) are simply not cached; no error.
function systemParam(system: string | SystemPrompt) {
  if (typeof system === "string") return system;
  return [
    { type: "text" as const, text: system.stable, cache_control: EPHEMERAL },
    { type: "text" as const, text: system.task },
  ];
}

function messagesParam(messages: ChatTurn[]) {
  // The 5.5 models reject a conversation that ends with an assistant turn
  // (prefill) with a 400. Fail here, with a clear message, instead.
  const last = messages[messages.length - 1];
  if (!last) throw new Error("A model request needs at least one message.");
  if (last.role !== "user") {
    throw new Error("A model request must end with a user turn; assistant prefill is rejected by the 5.5 models.");
  }
  return messages.map((m) =>
    m.cacheBreakpoint
      ? { role: m.role, content: [{ type: "text" as const, text: m.content, cache_control: EPHEMERAL }] }
      : { role: m.role, content: m.content }
  );
}

// The request body, as a plain object. Pure, so the shape that matters
// (no temperature/top_p/top_k, thinking and effort per model, system blocks,
// effort merged into the same output_config as the structured-output format)
// is unit-tested without a network.
export function buildRequest(opts: CallOptions, outputFormat?: unknown): Record<string, unknown> {
  const model = opts.model ?? getModel();
  const thinkingMode = opts.thinking ?? "default";
  const params = modelParams(model, { effort: opts.effort, thinking: thinkingMode });
  const outputConfig = {
    ...(params.effort ? { effort: params.effort } : {}),
    ...(outputFormat ? { format: outputFormat } : {}),
  };
  return {
    model,
    max_tokens: effectiveMaxTokens(model, opts.maxTokens ?? 2000, thinkingMode),
    ...(params.thinking ? { thinking: params.thinking } : {}),
    ...(Object.keys(outputConfig).length ? { output_config: outputConfig } : {}),
    system: systemParam(opts.system),
    messages: messagesParam(opts.messages),
  };
}

function prepare(opts: CallOptions, outputFormat?: unknown): { model: string; body: Record<string, unknown> } {
  const model = opts.model ?? getModel();
  if (modelFamily(model) === "unknown") warnUnknownModelOnce(model);
  return { model, body: buildRequest({ ...opts, model }, outputFormat) };
}

// ---------------------------------------------------------------------------
// Local-dev-only alternate provider
// ---------------------------------------------------------------------------
// A self-hosted Ollama instance (elsewhere on the network) speaking its
// OpenAI-compatible /v1/chat/completions API. Never used unless
// AI_PROVIDER=local is explicitly set — production always uses Anthropic.
// Quality is noticeably rougher than Claude; this exists for free local
// iteration, not as a production substitute.
function isLocalProvider(): boolean {
  return process.env.AI_PROVIDER === "local";
}

function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
}

function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";
}

async function callOllama(opts: { system: string; messages: ChatTurn[]; maxTokens?: number }): Promise<string> {
  const baseUrl = getOllamaBaseUrl();
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      temperature: 0.4,
      max_tokens: opts.maxTokens ?? 2000,
      messages: [
        { role: "system", content: opts.system },
        ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
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

// Local models have no structured-output mode, so for AI_PROVIDER=local only:
// strip a ```json fence if present and parse. The result is still validated
// against the same zod schema Anthropic's structured output enforces.
export function parseLooseJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AiResponseError(
      "invalid_json",
      `Local model did not return valid JSON. length=${cleaned.length}. ` +
        `Head: ${cleaned.slice(0, 300)} ... Tail: ${cleaned.slice(-300)}`
    );
  }
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

/**
 * Calls the configured AI provider (Anthropic by default, or a local Ollama
 * instance when AI_PROVIDER=local) and returns the reply text. Throws on API
 * error (routes should catch and 500). Every call, success or failure, is
 * recorded in ai_calls (lib/ai-calls.ts) without ever affecting the result.
 */
export async function callClaude(opts: CallOptions): Promise<string> {
  if (isLocalProvider()) {
    return loggedCall({ purpose: opts.purpose, model: getOllamaModel(), userId: opts.userId }, () =>
      callOllama({ system: flattenSystem(opts.system), messages: opts.messages, maxTokens: opts.maxTokens })
    );
  }
  const { model, body } = prepare(opts);
  const res = await loggedCall(
    { purpose: opts.purpose, model, userId: opts.userId },
    () => getClient().messages.create(body),
    (r) => {
      if (!r.content?.some((b: { type: string }) => b.type === "text")) {
        const blockTypes = (r.content ?? []).map((b: { type: string }) => b.type).join(", ") || "none";
        throw new AiResponseError(
          "no_text_block",
          `Anthropic response had no text content block. stop_reason=${r.stop_reason}, blocks=[${blockTypes}]`
        );
      }
    }
  );
  return res.content.find((b: { type: string }) => b.type === "text").text as string;
}

/**
 * Calls Claude with output_config.format built from a Zod schema (via the
 * SDK's zodOutputFormat helper), so the API itself constrains generation to
 * valid, schema-conforming JSON instead of the model free-hand writing JSON
 * text per prompt instructions and this code parsing it after the fact. Use
 * this for every call that wants JSON.
 *
 * Built after three distinct raw-JSON failures on real objectives in lesson
 * generation, none of them the same bug: output truncated mid-string
 * (stop_reason max_tokens), no text block produced at all (stop_reason
 * max_tokens with blocks=[thinking] -- see modelParams above), and
 * syntactically invalid JSON despite a clean stop_reason end_turn (a raw,
 * unescaped newline inside a string value). Structured outputs close all
 * three at the API level instead of patching each symptom as it turns up.
 */
export async function callClaudeStructured<S extends z.ZodType>(
  opts: CallOptions & { schema: S }
): Promise<z.infer<S>> {
  if (isLocalProvider()) {
    const raw = await loggedCall({ purpose: opts.purpose, model: getOllamaModel(), userId: opts.userId }, () =>
      callOllama({ system: flattenSystem(opts.system), messages: opts.messages, maxTokens: opts.maxTokens })
    );
    return opts.schema.parse(parseLooseJson(raw));
  }
  const { model, body } = prepare(opts, zodOutputFormat(opts.schema));
  const message = await loggedCall(
    { purpose: opts.purpose, model, userId: opts.userId },
    () => getClient().messages.parse(body),
    (m) => {
      if (m.parsed_output === null || m.parsed_output === undefined) {
        throw new AiResponseError(
          "no_parsed_output",
          `Claude structured output missing parsed_output. stop_reason=${m.stop_reason}`
        );
      }
    }
  );
  return message.parsed_output as z.infer<S>;
}
