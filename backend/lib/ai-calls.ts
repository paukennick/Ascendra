import { AnthropicError, APIError } from "@anthropic-ai/sdk";
import { query } from "@/lib/db";
import { after } from "next/server";
import { reserveAiSpend } from "@/lib/ai-spend-gate";
import { estimateCall, type CallEstimate } from "@/lib/ai-spend-ledger";

// Phase 0: one ai_calls row per model call (migration 028), so cost, latency,
// failure rate and prompt-cache hit rate can be read from the database instead
// of guessed. Written from lib/anthropic.ts for every call, success or
// failure.
//
// Logging is strictly best-effort: it is started WITHOUT being awaited and any
// failure (table missing because migration 028 has not been applied yet, pool
// exhausted, bad user id) is swallowed after a console warning. A logging
// problem must never fail or slow a learner's request.
//
// Only counts, ids and a short error code are stored -- never prompt text,
// answers or model output, and never an error message (a provider error body
// can echo the request).

export type AiPurpose =
  | "lesson_intro"
  | "lesson_practice"
  | "grade_open"
  | "pbq_generate"
  | "pbq_grade"
  | "chat"
  | "guess_feedback"
  // REQ-109: exam-style items for the shared exam_items bank.
  | "exam_items"
  // REQ-106: lab report questions (once per objective) and lab report grading.
  | "lab_questions"
  | "lab_grade"
  // REQ-111: deep understanding. concept_sets / prereq_map / learned_set run
  // once per course (shared); explain_back once per explanation submitted.
  | "concept_sets"
  | "prereq_map"
  | "learned_set"
  | "explain_back"
  // REQ-110: one shared "Quiz me" question per objective (lib/coach-quiz.ts).
  | "coach_quiz"
  // Audit 3 H2: the fast-model check of a coach reply against open items.
  | "coach_guard"
  // REQ-108: Today's review and unit checks.
  | "review_generate"
  | "review_grade"
  | "unitcheck_generate"
  | "unitcheck_grade"
  // REQ-114: the second-model fact-check of new shared items (one call per
  // generation batch) and the one automated re-check of a flagged item.
  | "fact_check"
  | "item_recheck"
  // REQ-187: did the coach agree in chat that a graded answer was marked
  // wrongly? (lib/chat-dispute.ts; only on a dispute message.)
  | "chat_dispute"
  // REQ-123: verifiable labs -- one grading call per lab step answered, and
  // the generator's batch writes plus its fact-check (scripts/generate-labs.ts).
  | "lab_step_grade"
  | "lab_generate"
  | "lab_fact_check"
  // scripts/eval/* only; those scripts also set AI_CALL_LOG=off.
  | "eval_lesson"
  | "eval_judge"
  | "eval_grading"
  // Audit 3 M5: the live-eval runners (scripts/eval/live.ts).
  | "eval_guard"
  | "eval_pbq"
  | "eval_unitcheck"
  | "eval_explain_back"
  | "eval_lab"
  | "eval_generation"
  | "eval_cache"
  // REQ-196: the fact-checker eval (scripts/factcheck-eval.ts).
  | "eval_factcheck";

export interface AiCallMeta {
  purpose: AiPurpose;
  model: string;
  // The learner the call is for. REQ-202: with one, the call is held to that
  // learner's spend gate (lib/ai-spend-gate.ts) before it is sent. null means
  // no learner (an offline script, an unattributed shared job).
  userId?: string | null;
  // Worst-case cost of the request (estimateCall on the body). Omitted, the
  // gate assumes a call with no prompt and a full-size answer.
  estimate?: CallEstimate;
  // A provider that costs nothing (AI_PROVIDER=local) skips the money gate.
  free?: boolean;
}

export interface AiUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export interface AiCallRecord {
  userId: string | null;
  purpose: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  latencyMs: number;
  ok: boolean;
  errorCode: string | null;
}

export type AiCallSink = (record: AiCallRecord) => Promise<void>;

// A failure of our own checking of an otherwise-delivered response (no text
// block, no parsed output). `code` is what lands in ai_calls.error_code.
export class AiResponseError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AiResponseError";
  }
}

// Adversary audit finding 7 (FAIL-307): a model reply that was empty, had no
// text block, or failed the structured-output schema -- or the provider
// being overloaded, rate-limited or unreachable -- came back to the learner
// as a generic 500. These are transient and not the learner's doing, so
// lib/http.ts serverError answers them with a 503 and MODEL_UNAVAILABLE.
// A 4xx from the API for a request WE built wrong (400, 401, 403, 404) stays
// a 500: retrying will not fix it, and it should page someone.
export const MODEL_UNAVAILABLE =
  "The AI coach couldn't give a usable answer just now. Nothing was lost -- please try again in a moment.";

export function isTransientModelFailure(err: unknown): boolean {
  if (err instanceof AiResponseError) return true;
  if (err && typeof err === "object" && (err as { name?: unknown }).name === "ZodError") return true;
  if (err instanceof APIError) {
    const status = err.status;
    return status === undefined || status === 408 || status === 429 || status >= 500;
  }
  return err instanceof AnthropicError;
}

const ERROR_CODE_MAX = 80;

// A short, stable code for the failure -- never the message. Anthropic SDK API
// errors carry `status` and a body `error.error.type`; our own response checks
// carry `code`; network errors carry a Node `code` (ECONNRESET, ...).
export function errorCodeOf(err: unknown): string {
  const e = (err ?? {}) as {
    status?: unknown;
    code?: unknown;
    name?: unknown;
    error?: { error?: { type?: unknown } };
  };
  let code: string;
  if (typeof e.status === "number") {
    const type = e.error?.error?.type;
    code = typeof type === "string" && type ? `http_${e.status}_${type}` : `http_${e.status}`;
  } else if (typeof e.code === "string" && e.code) {
    code = e.code;
  } else if (typeof e.name === "string" && e.name) {
    code = e.name;
  } else {
    code = "unknown_error";
  }
  return code.slice(0, ERROR_CODE_MAX);
}

function intOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}

async function insertAiCall(r: AiCallRecord): Promise<void> {
  await query(
    `insert into ai_calls
       (user_id, purpose, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
        latency_ms, ok, error_code)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      r.userId,
      r.purpose.slice(0, 40),
      r.model.slice(0, 80),
      r.inputTokens,
      r.outputTokens,
      r.cacheReadTokens,
      r.cacheWriteTokens,
      r.latencyMs,
      r.ok,
      r.errorCode,
    ]
  );
}

let sink: AiCallSink = insertAiCall;

// Test seam: replace where records go (null restores the database insert).
export function setAiCallSink(next: AiCallSink | null): void {
  sink = next ?? insertAiCall;
}

export const insertAiCallRecord = insertAiCall;

function loggingEnabled(): boolean {
  return process.env.AI_CALL_LOG !== "off";
}

// Hands the record to the sink and returns immediately. Never throws, whether
// the sink throws synchronously or rejects later.
//
// REQ-118 (Audit 3 MEDIUM-10): inside a request the write is scheduled with
// Next's after(), which keeps the function alive until it finishes. A bare
// fire-and-forget promise can be frozen with the function once the response
// is sent (Vercel), losing the row and undercounting cost. Outside a request
// (scripts, tests, a stream that outlived its request) after() throws and the
// write starts straight away, as before.
export function logAiCall(record: AiCallRecord): void {
  if (!loggingEnabled()) return;
  const write = () => {
    try {
      return Promise.resolve(sink(record)).catch(warnLogFailure);
    } catch (err) {
      warnLogFailure(err);
      return Promise.resolve();
    }
  };
  if (!scheduleAfterResponse(write)) void write();
}

// after() when there is a request to attach to; false when there is not.
export function scheduleAfterResponse(task: () => Promise<unknown>): boolean {
  try {
    after(task);
    return true;
  } catch {
    return false;
  }
}

function warnLogFailure(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[ai_calls] could not record model call (ignored): ${msg.slice(0, 200)}`);
}

/**
 * Runs `send`, then `check` on its result, and records the outcome. Returns
 * what `send` returned; rethrows whatever `send` or `check` threw. Usage is
 * recorded even when `check` rejects an otherwise-delivered response, since
 * those tokens were billed.
 *
 * REQ-202: before `send`, the spend gate (lib/ai-spend-gate.ts) runs for every
 * call, and for one with a userId it refuses the call (AiBudgetError, or
 * AiSpendUnavailableError when the database cannot say) or reserves its
 * worst-case cost. The reservation is settled with the real usage below, in
 * the same ai_calls row, so a gated call writes one row, not two.
 */
export async function loggedCall<R>(
  meta: AiCallMeta,
  send: () => Promise<R>,
  check?: (result: R) => void
): Promise<R> {
  // Refused here means no model call and no ai_calls row of its own.
  const reservation = meta.free
    ? null
    : await reserveAiSpend({
        userId: meta.userId ?? null,
        purpose: meta.purpose,
        model: meta.model,
        estimate: meta.estimate ?? estimateCall(meta.model, {}),
      });
  const started = Date.now();
  let usage: AiUsage | undefined;
  let ok = false;
  let errorCode: string | null = null;
  try {
    const result = await send();
    usage = (result as { usage?: AiUsage } | null | undefined)?.usage ?? undefined;
    check?.(result);
    ok = true;
    return result;
  } catch (err) {
    errorCode = errorCodeOf(err);
    throw err;
  } finally {
    const record: AiCallRecord = {
      userId: meta.userId ?? null,
      purpose: meta.purpose,
      model: meta.model,
      inputTokens: intOrNull(usage?.input_tokens),
      outputTokens: intOrNull(usage?.output_tokens),
      cacheReadTokens: intOrNull(usage?.cache_read_input_tokens),
      cacheWriteTokens: intOrNull(usage?.cache_creation_input_tokens),
      latencyMs: Math.max(0, Date.now() - started),
      ok,
      errorCode,
    };
    // The reservation row IS this call's record; it is written whether or not
    // AI_CALL_LOG is on, because the spend cap reads it.
    if (reservation) await reservation.settle(record);
    else logAiCall(record);
  }
}
