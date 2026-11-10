import type { AiPurpose } from "@/lib/ai-calls";
import { callCostUsd, estimateTokens } from "@/lib/ai-pricing";
import { UserFacingError } from "@/lib/http";

// REQ-202 (F1, the AI spend gate): what a learner's model calls have cost and
// what one about to be made could cost. The money side of the gate in
// lib/ai-spend-gate.ts; kept free of the gate's own imports so that
// lib/ai-budget.ts (the route-level checks) and the gate can both read it.
//
// Two daily pools, each with its own cap, so a heavy legitimate grader does
// not lose the coach and a coach-heavy day does not stop grading:
//
//   coach    everything that writes: chat and its guards, lesson text, practice
//            and exam items, quiz questions, labs, re-checks. AI_DAILY_BUDGET_USD.
//   grading  the graders of a learner's own answer: typed answers, PBQs, lab
//            steps, review and unit checks, explain-back, guess feedback.
//            AI_DAILY_GRADING_BUDGET_USD.
//
// Every AiPurpose is listed; the Record type makes a new purpose a compile
// error until someone chooses its pool (lib/ai-spend-gate.test.ts checks it
// again at run time).

export type AiPool = "coach" | "grading";

export const PURPOSE_POOL: Record<AiPurpose, AiPool> = {
  lesson_intro: "coach",
  lesson_practice: "coach",
  grade_open: "grading",
  pbq_generate: "coach",
  pbq_grade: "grading",
  chat: "coach",
  guess_feedback: "grading",
  exam_items: "coach",
  lab_questions: "coach",
  lab_grade: "grading",
  concept_sets: "coach",
  prereq_map: "coach",
  learned_set: "coach",
  explain_back: "grading",
  coach_quiz: "coach",
  coach_guard: "coach",
  review_generate: "coach",
  review_grade: "grading",
  unitcheck_generate: "coach",
  unitcheck_grade: "grading",
  fact_check: "coach",
  item_recheck: "coach",
  chat_dispute: "coach",
  lab_step_grade: "grading",
  lab_generate: "coach",
  lab_fact_check: "coach",
  // Offline scripts only (no learner, so never reserved); a pool is still
  // needed to satisfy the type.
  eval_lesson: "coach",
  eval_judge: "coach",
  eval_grading: "grading",
  eval_guard: "coach",
  eval_pbq: "coach",
  eval_unitcheck: "coach",
  eval_explain_back: "grading",
  eval_lab: "coach",
  eval_generation: "coach",
  eval_cache: "coach",
  eval_factcheck: "coach",
};

export function poolOf(purpose: string): AiPool {
  // An unknown purpose string (an old row, a typo) is priced and capped as
  // coach: the stricter, dearer pool.
  return (PURPOSE_POOL as Record<string, AiPool | undefined>)[purpose] ?? "coach";
}

export function purposesOf(pool: AiPool): string[] {
  return Object.entries(PURPOSE_POOL)
    .filter(([, p]) => p === pool)
    .map(([purpose]) => purpose);
}

// The database is unreachable or refused the spend check. The spend-heavy
// paths fail CLOSED on this: not knowing what a learner has spent is not a
// licence to spend (audit finding 6). A 503 the app already retries.
export const SPEND_UNAVAILABLE_MESSAGE =
  "The AI coach is paused for a moment while we check on things. Nothing was lost -- please try again shortly.";

export class AiSpendUnavailableError extends UserFacingError {
  constructor(message = SPEND_UNAVAILABLE_MESSAGE) {
    super(message, 503);
    this.name = "AiSpendUnavailableError";
  }
}

// Anything that can run SQL: `query` from lib/db.ts, or a transaction's.
export type SqlRunner = <T extends Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;

interface SpendRow {
  model: string;
  input: number;
  output: number;
  read: number;
  write: number;
  long_input: number;
  long_output: number;
  long_read: number;
  long_write: number;
}

// The last 24 hours' cost of one learner's calls, in USD, for one pool or for
// all of them. Counts every row in ai_calls, so a reservation that has not
// settled yet (migration-free: a reserved row is an ai_calls row holding the
// estimate, see ai-spend-gate.ts) is counted at its estimate. Same pricing and
// long-context rule as lib/ai-budget.ts. Uses the (user_id, created_at) index.
export async function poolSpendUsd(run: SqlRunner, userId: string, pool: AiPool | "all"): Promise<number> {
  const filter = pool === "all" ? "" : "and purpose = any($2::text[])";
  const params: unknown[] = pool === "all" ? [userId] : [userId, purposesOf(pool)];
  const rows = await run<SpendRow & Record<string, unknown>>(
    `select model,
            coalesce(sum(input_tokens) filter (where not long), 0)::float8 as input,
            coalesce(sum(output_tokens) filter (where not long), 0)::float8 as output,
            coalesce(sum(cache_read_tokens) filter (where not long), 0)::float8 as read,
            coalesce(sum(cache_write_tokens) filter (where not long), 0)::float8 as write,
            coalesce(sum(input_tokens) filter (where long), 0)::float8 as long_input,
            coalesce(sum(output_tokens) filter (where long), 0)::float8 as long_output,
            coalesce(sum(cache_read_tokens) filter (where long), 0)::float8 as long_read,
            coalesce(sum(cache_write_tokens) filter (where long), 0)::float8 as long_write
       from (select model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
                    coalesce(input_tokens, 0) + coalesce(cache_read_tokens, 0) + coalesce(cache_write_tokens, 0) > 100000 as long
               from ai_calls
              where user_id = $1 and created_at > now() - interval '24 hours' ${filter}) c
      group by model`,
    params
  );
  let usd = 0;
  for (const r of rows) {
    usd += callCostUsd(r.model, { inputTokens: r.input, outputTokens: r.output, cacheReadTokens: r.read, cacheWriteTokens: r.write }, { longContext: false });
    usd += callCostUsd(
      r.model,
      { inputTokens: r.long_input, outputTokens: r.long_output, cacheReadTokens: r.long_read, cacheWriteTokens: r.long_write },
      { longContext: true }
    );
  }
  return usd;
}

// ---------------------------------------------------------------------------
// What one call could cost
// ---------------------------------------------------------------------------

export interface CallEstimate {
  usd: number;
  // The tokens the estimate prices, as a reservation row stores them.
  inputTokens: number;
  outputTokens: number;
}

// Headroom on the character-based token count: code, tables and non-English
// text run more tokens per character than prose, and the count must stay an
// upper bound (a reservation that is too low lets calls through that settle
// above the cap).
export const INPUT_ESTIMATE_MARGIN = 1.25;
// Used when a request carries no max_tokens (it always does from
// lib/anthropic.ts buildRequest; this is a backstop for a direct caller).
export const FALLBACK_OUTPUT_TOKENS = 8000;

// An upper bound on one call's cost, from the request body before it is sent:
// the prompt priced as if none of it were cached (a cache write is the dearest
// input line) and the output at max_tokens, which already includes any
// thinking headroom (anthropic.ts effectiveMaxTokens).
export function estimateCall(model: string, body: { system?: unknown; messages?: unknown; max_tokens?: unknown }): CallEstimate {
  const text = JSON.stringify(body.system ?? "") + JSON.stringify(body.messages ?? "");
  const inputTokens = Math.ceil(estimateTokens(text) * INPUT_ESTIMATE_MARGIN);
  const outputTokens =
    typeof body.max_tokens === "number" && Number.isFinite(body.max_tokens) && body.max_tokens > 0
      ? Math.ceil(body.max_tokens)
      : FALLBACK_OUTPUT_TOKENS;
  return { usd: callCostUsd(model, { cacheWriteTokens: inputTokens, outputTokens }), inputTokens, outputTokens };
}
