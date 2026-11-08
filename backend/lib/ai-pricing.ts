// Audit 3 H4 / M5: what a model call costs, from the token counts the API
// returns (the same counts lib/ai-calls.ts stores in ai_calls).
//
// Prices are USD per million tokens, from
// https://platform.claude.com/docs/en/about-claude/pricing (read 2026-11-07):
//
//   model       input   5m cache write  cache hit  output
//   Haiku 5.5   0.10    0.125           0.01       0.50   (x5 on every line when the prompt is over 100K tokens)
//   Sonnet 5.5  2       2.50            0.10       10
//   Opus 5.5    4       5               0.20       20
//
// Haiku 5.5 is the only one with a long-context price: a request whose
// prompt (input + cache reads + cache writes) is over 100,000 tokens pays 5x
// on every line. An unknown or 4.5 model id is priced as Sonnet 5.5, the
// dearest model the app uses, so a budget never under-counts.
// If the pricing page changes, change this table: the daily budget and the
// live-eval cost tally both read it.

import { modelFamily } from "@/lib/anthropic";

export interface ModelPrice {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
  // Prompt size above which every line is multiplied, and by how much.
  longContextTokens?: number;
  longContextMultiplier?: number;
}

export const MODEL_PRICES: Record<"haiku-5-5" | "sonnet-5-5" | "opus-5-5", ModelPrice> = {
  "haiku-5-5": { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5, longContextTokens: 100_000, longContextMultiplier: 5 },
  "sonnet-5-5": { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 },
  "opus-5-5": { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 },
};

export function priceFor(model: string): ModelPrice {
  const f = modelFamily(model);
  if (f === "haiku-5-5" || f === "sonnet-5-5" || f === "opus-5-5") return MODEL_PRICES[f];
  return MODEL_PRICES["sonnet-5-5"];
}

export interface TokenCounts {
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheWriteTokens?: number | null;
}

// USD for one call. input_tokens from the API excludes cache reads and
// writes, so the prompt size is the sum of the three.
// `longContext` prices summed tokens of calls already known to be over the
// threshold (the daily budget sums many calls per model).
export function callCostUsd(model: string, t: TokenCounts, opts: { longContext?: boolean } = {}): number {
  const p = priceFor(model);
  const input = t.inputTokens ?? 0;
  const read = t.cacheReadTokens ?? 0;
  const write = t.cacheWriteTokens ?? 0;
  const output = t.outputTokens ?? 0;
  const prompt = input + read + write;
  const long = opts.longContext ?? (!!p.longContextTokens && prompt > p.longContextTokens);
  const mult = long ? p.longContextMultiplier ?? 1 : 1;
  return ((input * p.input + write * p.cacheWrite + read * p.cacheRead + output * p.output) * mult) / 1_000_000;
}

// A rough token count for text we are about to send, for budgeting a
// prompt's size before the call (the API's own count comes back after it).
// English prose runs about 4 characters a token on Claude's tokenizers; 3.5
// is used so the estimate errs high (a cap stays a cap). Not for billing.
export const CHARS_PER_TOKEN_ESTIMATE = 3.5;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}
