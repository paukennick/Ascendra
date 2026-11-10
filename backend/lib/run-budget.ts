import { setAiCallSink, type AiCallRecord } from "@/lib/ai-calls";
import { callCostUsd, estimateTokens, priceFor } from "@/lib/ai-pricing";
import { effectiveMaxTokens, type ThinkingMode } from "@/lib/anthropic";

// REQ-196: a hard dollar cap for one run of a GitHub Actions job that calls
// the model (the re-check, the fact-checker eval).
//
// install() routes every model call's usage here (lib/ai-calls.ts sink)
// INSTEAD of the ai_calls table, so these calls never count toward the
// app's per-learner or owner AI caps (which read ai_calls), and the job's
// database role needs no write access there.
//
// The cap holds before the fact, not after: a job asks canStart(upper) with
// the most the next call could cost (its prompt, estimated high, plus its
// whole max_tokens as output) and starts it only if spent + upper stays
// within the limit. So a run never passes its cap, even on its last call.

export class BudgetStop extends Error {
  constructor(readonly spentUsd: number, readonly limitUsd: number) {
    super(`Budget reached: $${spentUsd.toFixed(4)} spent of $${limitUsd.toFixed(2)}; the next call could pass it, so the run stops here.`);
    this.name = "BudgetStop";
  }
}

export class RunBudget {
  spentUsd = 0;
  calls = 0;
  readonly records: (AiCallRecord & { usd: number })[] = [];

  constructor(readonly limitUsd: number) {
    if (!(Number.isFinite(limitUsd) && limitUsd > 0)) throw new Error("budget must be a positive dollar amount");
  }

  add(r: AiCallRecord): void {
    const usd = callCostUsd(r.model, r);
    this.spentUsd += usd;
    this.calls++;
    this.records.push({ ...r, usd });
  }

  canStart(upperBoundUsd: number): boolean {
    return this.spentUsd + upperBoundUsd <= this.limitUsd;
  }

  // Throws BudgetStop when the next call could pass the limit.
  reserve(upperBoundUsd: number): void {
    if (!this.canStart(upperBoundUsd)) throw new BudgetStop(this.spentUsd, this.limitUsd);
  }

  install(): void {
    delete process.env.AI_CALL_LOG; // logging must be on for the sink to see calls
    setAiCallSink(async (r) => this.add(r));
  }
}

export interface CallEstimate {
  // the most this call can cost: prompt (estimated high) + all of max_tokens
  upperUsd: number;
  // a typical cost: prompt + the expected output
  typicalUsd: number;
}

// Thinking output on a fact-check runs well under the headroom; this is a
// planning figure for the printout, not the cap (the cap uses max_tokens).
export const TYPICAL_THINKING_TOKENS = 1500;
export const TYPICAL_ANSWER_TOKENS_PER_ITEM = 90;

export function estimateCall(opts: { model: string; promptText: string; maxTokens: number; thinking: ThinkingMode; items: number }): CallEstimate {
  const p = priceFor(opts.model);
  const input = estimateTokens(opts.promptText);
  const maxOut = effectiveMaxTokens(opts.model, opts.maxTokens, opts.thinking);
  const typicalOut = TYPICAL_ANSWER_TOKENS_PER_ITEM * opts.items + (opts.thinking === "default" ? TYPICAL_THINKING_TOKENS : 0);
  const mult = p.longContextTokens && input > p.longContextTokens ? p.longContextMultiplier ?? 1 : 1;
  return {
    upperUsd: ((input * p.input + maxOut * p.output) * mult) / 1_000_000,
    typicalUsd: ((input * p.input + Math.min(typicalOut, maxOut) * p.output) * mult) / 1_000_000,
  };
}
