import { query } from "@/lib/db";
import { callCostUsd } from "@/lib/ai-pricing";
import { UserFacingError } from "@/lib/http";
import { isUnrestricted, noteCeilingReached } from "@/lib/account-access";
import { CEILING_REACHED_MESSAGE, unrestrictedCeilingUsd } from "@/lib/account-access-config";

// Audit 3 H4 (FAIL-294, and adversary finding 8): a per-learner daily AI spend budget.
//
// Rate limits only bound a 10-minute window. Chat (up to ~$0.07 a call on a
// long thread before this audit) and lesson regeneration (two Sonnet calls,
// ~$0.024, up to ~720 a day under the window limit) had no daily ceiling, so
// one account could spend tens to hundreds of dollars a day. The spend is
// computed from ai_calls (every model call made for this learner in the last
// 24 hours, priced by lib/ai-pricing.ts), so it counts everything the
// learner caused -- grading, chat, the guard's judge, regenerations.
//
// What it gates: the open-ended spenders, coach chat and lesson regenerate.
// Grading is NOT blocked when the budget runs out: it is cheap (well under a
// tenth of a cent), already rate-limited, and the core of learning, and
// refusing to grade an answer the learner wrote would cost them more than it
// saves. It still counts toward the total.
//
// Defaults (env-configurable, read per call):
//   AI_DAILY_BUDGET_USD     0.50  -- about 3x a heavy learner's day (~$5/month,
//                                    report "Cost per active learner"); 0 or
//                                    "off" disables the check.
// A rolling 24 hours, not a calendar day, so there is no time zone to get
// wrong and no midnight burst. Migration 043 adds the (user_id, created_at)
// index this query uses.

export const DEFAULT_DAILY_BUDGET_USD = 0.5;

export function dailyBudgetUsd(env: Record<string, string | undefined> = process.env): number | null {
  const raw = env.AI_DAILY_BUDGET_USD?.trim().toLowerCase();
  if (raw === "off") return null;
  if (raw === undefined || raw === "") return DEFAULT_DAILY_BUDGET_USD;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_DAILY_BUDGET_USD;
  return n === 0 ? null : n;
}

// What this learner's model calls cost over the last 24 hours, in USD.
export async function spendLast24hUsd(userId: string): Promise<number> {
  return spendWhereUsd(`user_id = $1 and created_at > now() - interval '24 hours'`, [userId]);
}

// REQ-122: the same sum since a given time (the monthly per-tier AI cap,
// lib/entitlements.ts). Same (user_id, created_at) index.
export async function spendSinceUsd(userId: string, since: Date): Promise<number> {
  return spendWhereUsd(`user_id = $1 and created_at >= $2`, [userId, since.toISOString()]);
}

// REQ-201: every model call since a given time, whoever caused it (learners,
// shared lesson generation, re-checks, crons) -- the global daily AI ceiling
// (lib/ai-access.ts). Uses the ai_calls (created_at) index from migration 028.
export async function globalSpendSinceUsd(since: Date): Promise<number> {
  return spendWhereUsd(`created_at >= $1`, [since.toISOString()]);
}

async function spendWhereUsd(where: string, params: unknown[]): Promise<number> {
  const rows = await query<{ model: string; input: number; output: number; read: number; write: number; long_input: number; long_output: number; long_read: number; long_write: number }>(
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
              where ${where}) c
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

export const BUDGET_REACHED_MESSAGE =
  "You've reached today's limit for the AI coach and new lesson versions. It refills gradually over the next " +
  "24 hours. Everything else keeps working -- lessons, practice, grading and review -- so this is a good moment " +
  "to answer a few questions on your own.";

export class AiBudgetError extends UserFacingError {
  constructor(message = BUDGET_REACHED_MESSAGE) {
    super(message, 429);
    this.name = "AiBudgetError";
  }
}

// Throws AiBudgetError (a 429 with BUDGET_REACHED_MESSAGE through
// serverError) when this learner is at or over the budget. A missing
// ai_calls table (before migration 028) counts as no spend.
//
// REQ-144: an owner or unrestricted account (lib/account-access.ts) has the
// AI safety ceiling instead (AI_UNRESTRICTED_DAILY_CEILING_USD, $20 over
// the same 24 hours) -- raised, never removed. Its access is only looked up
// once the everyday budget is reached, so other learners pay no extra read.
// At the ceiling it is logged, recorded and the owners are emailed.
export async function requireAiBudget(userId: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const budget = dailyBudgetUsd(env);
  let spent: number | null = null;
  const spend = async () => (spent ??= await spendLast24hUsd(userId).catch(() => 0));
  if (budget !== null && (await spend()) < budget) return;
  const unrestricted = await isUnrestricted(userId, env).catch(() => false);
  if (!unrestricted) {
    if (budget === null) return;
    throw new AiBudgetError();
  }
  const ceiling = unrestrictedCeilingUsd(env);
  const total = await spend();
  if (total < ceiling) return;
  await noteCeilingReached(userId, total, ceiling, env);
  throw new AiBudgetError(CEILING_REACHED_MESSAGE);
}
