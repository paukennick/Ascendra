// Audit 3 M5 (FAIL-303): a running cost tally for the live evals, from the usage the API
// returns on every call, with a hard stop.
//
// Every model call in this codebase goes through lib/anthropic.ts, which
// reports each call's token counts to the ai_calls sink (lib/ai-calls.ts).
// installCostTally() points that sink here instead of the database, so the
// eval needs no write access and cannot skip a call. Each record is priced
// with lib/ai-pricing.ts (the same table the per-learner daily budget uses).
//
// The stop: once the running total reaches the limit, `check()` throws
// BudgetExceededError. The runners call it before starting each case, so at
// most `concurrency` calls already in flight can finish past the limit
// (each well under a cent to a few cents), and nothing new starts.
import { setAiCallSink, type AiCallRecord } from "../../lib/ai-calls";
import { callCostUsd } from "../../lib/ai-pricing";

export class BudgetExceededError extends Error {
  constructor(readonly spentUsd: number, readonly limitUsd: number) {
    super(`Eval budget reached: $${spentUsd.toFixed(4)} of $${limitUsd.toFixed(limitUsd < 1 ? 4 : 2)}. Stopping before starting anything else.`);
    this.name = "BudgetExceededError";
  }
}

export interface PurposeTotals {
  calls: number;
  failed: number;
  usd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  callsWithCacheRead: number;
}

export class CostTally {
  readonly byPurpose = new Map<string, PurposeTotals>();
  readonly records: (AiCallRecord & { usd: number; at: number })[] = [];
  totalUsd = 0;

  constructor(readonly limitUsd: number, private readonly log: (msg: string) => void = () => {}) {}

  add(r: AiCallRecord): void {
    const usd = callCostUsd(r.model, r);
    this.totalUsd += usd;
    this.records.push({ ...r, usd, at: Date.now() });
    const t = this.byPurpose.get(r.purpose) ?? {
      calls: 0, failed: 0, usd: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, callsWithCacheRead: 0,
    };
    t.calls++;
    if (!r.ok) t.failed++;
    t.usd += usd;
    t.inputTokens += r.inputTokens ?? 0;
    t.outputTokens += r.outputTokens ?? 0;
    t.cacheReadTokens += r.cacheReadTokens ?? 0;
    t.cacheWriteTokens += r.cacheWriteTokens ?? 0;
    if ((r.cacheReadTokens ?? 0) > 0) t.callsWithCacheRead++;
    this.byPurpose.set(r.purpose, t);
    if (this.records.length % 25 === 0) this.log(`  [cost] ${this.records.length} calls, $${this.totalUsd.toFixed(4)} so far`);
  }

  get exceeded(): boolean {
    return this.totalUsd >= this.limitUsd;
  }

  // Throws once the limit is reached. Call before starting each case.
  check(): void {
    if (this.exceeded) throw new BudgetExceededError(this.totalUsd, this.limitUsd);
  }

  // Calls recorded since index `from` (for per-case usage such as cache reads).
  since(from: number) {
    return this.records.slice(from);
  }

  summary() {
    return {
      totalUsd: Number(this.totalUsd.toFixed(6)),
      limitUsd: this.limitUsd,
      calls: this.records.length,
      byPurpose: Object.fromEntries([...this.byPurpose].map(([k, v]) => [k, { ...v, usd: Number(v.usd.toFixed(6)) }])),
    };
  }
}

// Routes every model call's usage into `tally` (and nowhere else).
export function installCostTally(tally: CostTally): void {
  delete process.env.AI_CALL_LOG; // logging must be on for the sink to see calls
  setAiCallSink(async (r) => tally.add(r));
}
