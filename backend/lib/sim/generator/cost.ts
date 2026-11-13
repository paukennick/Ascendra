// REQ-230: what each draft cost, so the first 20 give a real per-sim number
// before Nick sets a monthly sim budget. Prices are lib/ai-pricing.ts (list
// prices, read 2026-11-07); an unknown model is priced as Sonnet 5.5.
import { callCostUsd, estimateTokens } from "../../ai-pricing.ts";
import type { Usage } from "./model.ts";

export interface CallCost {
  purpose: "write" | "fact_check";
  attempt: number; // writer attempt this call belongs to (1 or 2)
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  usd: number;
}

export function costOf(purpose: CallCost["purpose"], attempt: number, model: string, u: Usage): CallCost {
  return { purpose, attempt, model, ...u, usd: callCostUsd(model, u) };
}

// The most a call can cost: the prompt (estimated high) plus every output
// token it may write. The budget check uses this before the call.
export function upperBoundUsd(model: string, promptText: string, maxTokens: number): number {
  return callCostUsd(model, { inputTokens: estimateTokens(promptText), outputTokens: maxTokens });
}

export interface CostTotals {
  calls: number;
  writerAttempts: number;
  retries: number; // writer attempts after the first
  factChecks: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  usd: number;
  usdWrite: number;
  usdFactCheck: number;
}

export function totals(calls: CallCost[]): CostTotals {
  const sum = (f: (c: CallCost) => number, only?: CallCost["purpose"]) => calls.filter((c) => !only || c.purpose === only).reduce((a, c) => a + f(c), 0);
  const writerAttempts = new Set(calls.filter((c) => c.purpose === "write").map((c) => c.attempt)).size;
  return {
    calls: calls.length,
    writerAttempts,
    retries: Math.max(0, writerAttempts - 1),
    factChecks: calls.filter((c) => c.purpose === "fact_check").length,
    inputTokens: sum((c) => c.inputTokens),
    outputTokens: sum((c) => c.outputTokens),
    cacheReadTokens: sum((c) => c.cacheReadTokens),
    cacheWriteTokens: sum((c) => c.cacheWriteTokens),
    usd: sum((c) => c.usd),
    usdWrite: sum((c) => c.usd, "write"),
    usdFactCheck: sum((c) => c.usd, "fact_check"),
  };
}

// One line of reports/costs.jsonl.
export interface LedgerLine {
  at: string;
  course: string;
  objective: string;
  screen: string;
  slug: string | null;
  outcome: "ready" | "held";
  usd: number;
  inputTokens: number;
  outputTokens: number;
  retries: number;
  factChecks: number;
}

export interface CostSummary {
  drafts: number;
  ready: number;
  held: number;
  totalUsd: number;
  meanUsdPerDraft: number | null;
  medianUsdPerDraft: number | null;
  maxUsdPerDraft: number | null;
  usdPerReadySim: number | null; // all spend / ready drafts: what a usable sim really costs
  retriedDrafts: number;
}

export function summarize(lines: LedgerLine[]): CostSummary {
  const usd = lines.map((l) => l.usd).sort((a, b) => a - b);
  const total = usd.reduce((a, b) => a + b, 0);
  const ready = lines.filter((l) => l.outcome === "ready").length;
  const mid = usd.length ? (usd.length % 2 ? usd[(usd.length - 1) / 2] : (usd[usd.length / 2 - 1] + usd[usd.length / 2]) / 2) : null;
  return {
    drafts: lines.length,
    ready,
    held: lines.length - ready,
    totalUsd: total,
    meanUsdPerDraft: lines.length ? total / lines.length : null,
    medianUsdPerDraft: mid,
    maxUsdPerDraft: usd.length ? usd[usd.length - 1] : null,
    usdPerReadySim: ready ? total / ready : null,
    retriedDrafts: lines.filter((l) => l.retries > 0).length,
  };
}

export function parseLedger(text: string): LedgerLine[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as LedgerLine);
}

export function formatSummary(s: CostSummary): string[] {
  const m = (n: number | null) => (n == null ? "n/a" : `$${n.toFixed(4)}`);
  return [
    `${s.drafts} draft(s): ${s.ready} ready, ${s.held} held; ${s.retriedDrafts} needed a retry.`,
    `Total ${m(s.totalUsd)}. Per draft: mean ${m(s.meanUsdPerDraft)}, median ${m(s.medianUsdPerDraft)}, highest ${m(s.maxUsdPerDraft)}.`,
    `Per ready sim (all spend / ready drafts): ${m(s.usdPerReadySim)}.${s.drafts < 20 ? ` ${20 - s.drafts} more draft(s) before the first-20 measurement is complete.` : ""}`,
  ];
}
