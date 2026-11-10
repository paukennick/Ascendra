import { PREGEN_PURPOSE_PREFIX, type AiCallRecord, type AiPurpose } from "@/lib/ai-calls";
import { query, withTransaction } from "@/lib/db";
import { isOwner, isUnrestricted, noteCeilingReached } from "@/lib/account-access";
import { CEILING_REACHED_MESSAGE, unrestrictedCeilingUsd } from "@/lib/account-access-config";
import { AiBudgetError, dailyBudgetUsd } from "@/lib/ai-budget";
import { AiSpendUnavailableError, poolOf, poolSpendUsd, type AiPool, type CallEstimate, type SqlRunner } from "@/lib/ai-spend-ledger";

// REQ-202 (F1, the AI spend gate). Nick's Anthropic credit is finite, so no
// account -- Free or paid, a learner or a script run by one -- may make the
// server spend model money outside a cap. The gate is ONE check inside the
// shared model-call layer (lib/ai-calls.ts loggedCall, reached by every
// callClaude and callClaudeStructured), not a check each route remembers to
// make: the audit found 13 model routes that had none. It does three things
// for every call that carries a userId:
//
//   1. Checks the learner's daily budget for the call's pool (coach or
//      grading, lib/ai-spend-ledger.ts). A grader has its own pool rather than
//      an exemption, so a heavy legitimate grader keeps the coach.
//   2. Reserves the call's worst-case cost BEFORE it is sent, under a
//      per-learner advisory lock, as an ai_calls row holding the estimate. The
//      old check only read the spend, so N parallel requests each saw "under
//      the cap" and all went through (audit finding 4). With the reservation
//      the second request sees the first one's estimate.
//   3. Settles the reservation with the real usage when the call ends, in the
//      same row. A process that dies between the two leaves the estimate in
//      place, which keeps counting for 24 hours (a call that may have been
//      billed and never recorded is charged to the learner's budget, not
//      forgotten).
//
// Failing closed (finding 6): if the database cannot answer, the call is
// refused with a 503 (AiSpendUnavailableError). A cap that holds only while
// the database is up is not a cap.
//
// Accounts with unrestricted access (owners) keep REQ-144's ceiling instead
// of the everyday budget: raised, never removed.
//
// ----- The global daily ceiling (REQ-201, batch 10) --------------------------
// `globalCeilingCheck` runs first for EVERY model call, with or without a
// userId, before any per-learner work. By default it is the REQ-201 ceiling
// (lib/ai-access.ts globalCeilingReached): once the day's summed spend reaches
// AI_GLOBAL_DAILY_CEILING_USD every call that writes or checks content -- chat
// and its guards, lesson text, exam items, review and unit-check writing,
// item re-checks, labs, shared generation -- is refused with the same 429
// "paused" answer, whichever route or script called it, and no model request is
// made. Three things stay open:
//   - owners (OWNER_EMAILS), as in REQ-201;
//   - the grading pool (typed answers, PBQ, lab steps, review and unit-check
//     grading, explain-back, guess feedback): REQ-201's acceptance rule, set by
//     Nick, is that the ceiling never stops grading. Those calls still count;
//   - purposes starting `pregen` (REQ-208): an operator-started script with its
//     own budget; its rows are left out of the ceiling's sum for the same reason.
// With no ceiling set it returns without a database read. A failed read of the
// spend counts as no spend (REQ-201), the per-learner budget still stands.

export interface SpendContext {
  userId: string | null;
  purpose: AiPurpose;
  model: string;
  estimate: CallEstimate;
}

export type GlobalCeilingCheck = (ctx: SpendContext, env?: NodeJS.ProcessEnv) => Promise<void>;

export interface CeilingDeps {
  reached(env: NodeJS.ProcessEnv): Promise<boolean>;
  isOwner(userId: string, env: NodeJS.ProcessEnv): Promise<boolean>;
  paused(env: NodeJS.ProcessEnv): Error;
}

export function makeGlobalCeilingCheck(deps: CeilingDeps): GlobalCeilingCheck {
  return async (ctx, env = process.env) => {
    if (ctx.purpose.startsWith(PREGEN_PURPOSE_PREFIX)) return;
    if (poolOf(ctx.purpose) === "grading") return;
    if (!(await deps.reached(env))) return;
    if (ctx.userId && (await deps.isOwner(ctx.userId, env).catch(() => false))) return;
    throw deps.paused(env);
  };
}

// ai-access imports the billing and entitlement modules, which import the
// model-call layer that imports this file: it is loaded on first use to keep
// the import graph acyclic.
const defaultGlobalCeilingCheck: GlobalCeilingCheck = async (ctx, env = process.env) => {
  const access = await import("@/lib/ai-access");
  return makeGlobalCeilingCheck({
    reached: (e) => access.globalCeilingReached(e),
    isOwner,
    paused: (e) => access.ceilingPausedError("coach", e),
  })(ctx, env);
};

let globalCeilingCheck: GlobalCeilingCheck = defaultGlobalCeilingCheck;

// null restores the REQ-201 ceiling.
export function setGlobalCeilingCheck(fn: GlobalCeilingCheck | null): void {
  globalCeilingCheck = fn ?? defaultGlobalCeilingCheck;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// A heavy learner's grading (a hundred and fifty typed answers, lab steps and
// review checks at well under a tenth of a cent each on the fast model) costs
// about $0.10; this is two to three times that. 0 or "off" disables it, like
// AI_DAILY_BUDGET_USD.
export const DEFAULT_DAILY_GRADING_BUDGET_USD = 0.25;

export function gradingDailyBudgetUsd(env: Record<string, string | undefined> = process.env): number | null {
  const raw = env.AI_DAILY_GRADING_BUDGET_USD?.trim().toLowerCase();
  if (raw === "off") return null;
  if (raw === undefined || raw === "") return DEFAULT_DAILY_GRADING_BUDGET_USD;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_DAILY_GRADING_BUDGET_USD;
  return n === 0 ? null : n;
}

export function poolBudgetUsd(pool: AiPool, env: Record<string, string | undefined> = process.env): number | null {
  return pool === "grading" ? gradingDailyBudgetUsd(env) : dailyBudgetUsd(env);
}

export const GRADING_BUDGET_REACHED_MESSAGE =
  "You've reached today's limit for AI grading of typed answers. It refills gradually over the next 24 hours. " +
  "Multiple-choice and other auto-checked questions keep working, so this is a good moment for those.";

function budgetReachedError(pool: AiPool): AiBudgetError {
  return pool === "grading" ? new AiBudgetError(GRADING_BUDGET_REACHED_MESSAGE) : new AiBudgetError();
}

// Float dust: costs are sums of tiny products.
const EPSILON_USD = 1e-9;

// ---------------------------------------------------------------------------
// Reserve and settle
// ---------------------------------------------------------------------------

export interface SpendReservation {
  // Replaces the estimate with what the call really used. Never throws; if it
  // cannot write, the estimate stays (the safe side).
  settle(record: AiCallRecord): Promise<void>;
}

export interface SpendGate {
  // null: nothing to settle (no learner, or the pool's cap is switched off).
  reserve(ctx: SpendContext, env?: NodeJS.ProcessEnv): Promise<SpendReservation | null>;
}

type Attempt = { reserved: true; id: string } | { reserved: false; spent: number };

// One pass: under the learner's lock, sum what is spent and reserved, and
// either insert this call's reservation or report the spend that stopped it.
async function tryReserve(ctx: SpendContext, userId: string, scope: AiPool | "all", capUsd: number): Promise<Attempt> {
  return withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`aispend:${userId}`]);
    const run: SqlRunner = (sql, params) => tx.query(sql, params) as never;
    const spent = await poolSpendUsd(run, userId, scope);
    if (spent + ctx.estimate.usd > capUsd + EPSILON_USD) return { reserved: false, spent };
    const row = await tx.queryOne<{ id: string }>(
      `insert into ai_calls (user_id, purpose, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, latency_ms, ok, error_code)
       values ($1, $2, $3, null, $4, null, $5, 0, false, 'reserved') returning id`,
      [userId, ctx.purpose.slice(0, 40), ctx.model.slice(0, 80), ctx.estimate.outputTokens, ctx.estimate.inputTokens]
    );
    return { reserved: true, id: row!.id };
  });
}

// A call that failed without an answer from the API (timeout, dropped
// connection) may still have been billed for the prompt it was sent. Those
// settle at the estimated input; a failure with an HTTP status or one of our
// own response checks was answered, so the usage on the record is the truth.
const NO_ANSWER_CODE = /timeout|connection|econn|etimedout|epipe|abort|socket|fetch failed/i;

function settledValues(record: AiCallRecord, estimate: CallEstimate) {
  const noUsage = record.inputTokens === null && record.outputTokens === null && record.cacheReadTokens === null && record.cacheWriteTokens === null;
  if (noUsage && !record.ok && record.errorCode && NO_ANSWER_CODE.test(record.errorCode)) {
    return { ...record, inputTokens: null, outputTokens: null, cacheWriteTokens: estimate.inputTokens };
  }
  return record;
}

function reservation(id: string, estimate: CallEstimate): SpendReservation {
  let done = false;
  return {
    async settle(record) {
      if (done) return;
      done = true;
      const r = settledValues(record, estimate);
      try {
        await query(
          `update ai_calls
              set input_tokens = $2, output_tokens = $3, cache_read_tokens = $4, cache_write_tokens = $5,
                  latency_ms = $6, ok = $7, error_code = $8
            where id = $1`,
          [id, r.inputTokens, r.outputTokens, r.cacheReadTokens, r.cacheWriteTokens, r.latencyMs, r.ok, r.errorCode]
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[ai-spend] could not settle a reservation (the estimate stays): ${msg.slice(0, 200)}`);
      }
    },
  };
}

const realGate: SpendGate = {
  async reserve(ctx, env = process.env) {
    await globalCeilingCheck(ctx, env);
    const userId = ctx.userId;
    if (!userId) return null;
    const pool = poolOf(ctx.purpose);
    const budget = poolBudgetUsd(pool, env);
    try {
      if (budget !== null) {
        const first = await tryReserve(ctx, userId, pool, budget);
        if (first.reserved) return reservation(first.id, ctx.estimate);
      }
      // Over the everyday budget (or it is switched off, which as before
      // leaves an owner's ceiling in place). Only now look the account up: an
      // owner or unrestricted account has the REQ-144 ceiling over all pools.
      const unrestricted = await isUnrestricted(userId, env).catch(() => false);
      if (!unrestricted) {
        if (budget === null) return null; // an operator switched this pool's cap off
        throw budgetReachedError(pool);
      }
      const ceiling = unrestrictedCeilingUsd(env);
      const second = await tryReserve(ctx, userId, "all", ceiling);
      if (second.reserved) return reservation(second.id, ctx.estimate);
      await noteCeilingReached(userId, second.spent, ceiling, env);
      throw new AiBudgetError(CEILING_REACHED_MESSAGE);
    } catch (err) {
      if (err instanceof AiBudgetError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ai-spend] spend check failed, refusing the call (fail closed): ${msg.slice(0, 200)}`);
      throw new AiSpendUnavailableError();
    }
  },
};

let gate: SpendGate = realGate;

// Test seam: null restores the real gate. Unit tests with no database install a
// stand-in; database tests use the real one.
export function setSpendGateForTest(g: SpendGate | null): void {
  gate = g ?? realGate;
}

export function reserveAiSpend(ctx: SpendContext, env: NodeJS.ProcessEnv = process.env): Promise<SpendReservation | null> {
  return gate.reserve(ctx, env);
}

// ---------------------------------------------------------------------------
// A look before a loop
// ---------------------------------------------------------------------------

// Can this learner afford at least one more call like this? Read-only, for a
// caller about to start MANY calls (a sprint's generation) that would rather
// not begin than begin and be refused on the first. It reserves nothing: each
// call still reserves for itself. Fails closed (false) on any error.
export async function canAffordAiSpend(
  userId: string,
  purpose: AiPurpose,
  estimateUsd: number,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  try {
    await globalCeilingCheck({ userId, purpose, model: "", estimate: { usd: estimateUsd, inputTokens: 0, outputTokens: 0 } }, env);
    const pool = poolOf(purpose);
    const budget = poolBudgetUsd(pool, env);
    if (budget === null) return true;
    const run: SqlRunner = (sql, params) => query(sql, params) as never;
    if ((await poolSpendUsd(run, userId, pool)) + estimateUsd <= budget + EPSILON_USD) return true;
    if (!(await isUnrestricted(userId, env).catch(() => false))) return false;
    return (await poolSpendUsd(run, userId, "all")) + estimateUsd <= unrestrictedCeilingUsd(env) + EPSILON_USD;
  } catch {
    return false;
  }
}
