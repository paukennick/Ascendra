// REQ-135: what GET /api/health reports, cached.
//
// /api/health is unauthenticated and each check runs `select 1` plus one
// query per schema probe, each on its own pooled connection. Uncached, a
// loop of requests turns into a steady load on a 5-connection pool (and on
// Supabase's pooler). The result is now computed at most once per
// HEALTH_CACHE_MS, and concurrent requests during a check share that one
// check instead of each starting their own. A failed check is cached for a
// shorter time so a dead database is not hammered either, but recovery
// still shows up within seconds.
//
// The daily keepalive pings are hours apart, so each still reaches the
// database, which is what keeps the Supabase project awake.

import { aiAccessWarnings } from "@/lib/ai-access-config";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { checkSchema, migrationsToApply, type SchemaStatus } from "./schema-status";
import { formatEnvProblems, requiredEnvProblems } from "./required-env";
import { emailSenderStatus, EMAIL_UNCONFIGURED_WARNING } from "./email-errors";

export const HEALTH_CACHE_MS = 30_000;
export const HEALTH_ERROR_CACHE_MS = 5_000;

export type HealthResult =
  | { kind: "ok"; warnings?: string[] }
  | { kind: "schema_incomplete"; applyMigrations: string[]; missing: SchemaStatus["missing"] }
  // REQ-207 (FAIL-949): the probes pass but the schema_migrations ledger does
  // not list every migration file this build ships (a migration applied by hand
  // and never recorded, or one the runner has not applied).
  | { kind: "ledger_incomplete"; unrecorded: string[] }
  // REQ-118: production is missing a required setting (names only). REQ-207:
  // also production sending mail from an unset or resend.dev EMAIL_FROM.
  | { kind: "misconfigured"; env: string[] }
  | { kind: "error"; error: unknown };

// REQ-118 (Audit 3 HIGH-1): with Postgres JIT on (the stock default), the
// course view's readiness query JIT-compiled ~155 functions on every request:
// 10-100x slower (e.g. 2.6 s vs 28 ms). Supabase may already turn it off;
// this makes it visible either way. Fix: docs/operations-runbook.md
// ("Postgres settings"), `alter role <app role> set jit = off`.
export const JIT_SQL = `select current_setting('jit') = 'on' as ok`;
export const JIT_WARNING =
  "Postgres jit is on: course readiness is 10-100x slower. Run `alter role <app role> set jit = off` (docs/operations-runbook.md).";

type QueryFn = (sql: string) => Promise<Array<{ ok: boolean }>>;

// REQ-207: what the ledger check needs. `expected` is the migration files
// this build ships (null when they cannot be listed: the check is then
// skipped with a warning rather than failing a healthy deploy); `recorded`
// reads schema_migrations.
export interface LedgerCheck {
  expected: string[] | null;
  recorded: () => Promise<string[]>;
}

// The migration files in this build. next.config.js traces them into the
// /api/health function (outputFileTracingIncludes); a deploy that lacks them
// returns null here.
export function expectedMigrations(dir = join(process.cwd(), "supabase", "migrations")): string[] | null {
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    return files.length ? files : null;
  } catch {
    return null;
  }
}

export const LEDGER_UNREADABLE_WARNING =
  "The migration files are not in this deployment, so the schema_migrations ledger was not compared with the code.";

export async function computeHealth(
  run: QueryFn,
  env: Record<string, string | undefined> = process.env,
  ledger?: LedgerCheck
): Promise<HealthResult> {
  try {
    // REQ-118: required settings first (no database needed). Fatal in
    // production; elsewhere (local dev, tests) only a warning.
    const envProblems = formatEnvProblems(requiredEnvProblems(env));
    // REQ-207: in production an unset or resend.dev EMAIL_FROM is fatal too:
    // sign-in codes, verification and reset mail reach nobody but the Resend
    // account owner (REQ-191 made this a warning on a 200; that let a launch
    // go out silently unable to send mail).
    if (env.NODE_ENV === "production" && emailSenderStatus(env) === "unconfigured") {
      envProblems.push(EMAIL_UNCONFIGURED_WARNING);
    }
    if (envProblems.length && env.NODE_ENV === "production") return { kind: "misconfigured", env: envProblems };
    await run("select 1 as ok");
    const schema = await checkSchema(run);
    if (!schema.current) {
      return { kind: "schema_incomplete", applyMigrations: migrationsToApply(schema), missing: schema.missing };
    }
    const ledgerWarnings: string[] = [];
    if (ledger) {
      if (!ledger.expected) {
        ledgerWarnings.push(LEDGER_UNREADABLE_WARNING);
      } else {
        const recorded = new Set(await ledger.recorded());
        const unrecorded = ledger.expected.filter((f) => !recorded.has(f));
        if (unrecorded.length) return { kind: "ledger_incomplete", unrecorded };
      }
    }
    // REQ-201: an AI_ACCESS_MODE or global ceiling that isn't doing what it
    // looks like it does.
    const warnings = [...envProblems, ...ledgerWarnings, ...aiAccessWarnings(env)];
    try {
      if ((await run(JIT_SQL))[0]?.ok === true) warnings.push(JIT_WARNING);
    } catch {
      // informational only
    }
    return warnings.length ? { kind: "ok", warnings } : { kind: "ok" };
  } catch (error) {
    return { kind: "error", error };
  }
}

export interface HealthCache {
  get(run: QueryFn, now?: number, ledger?: LedgerCheck): Promise<HealthResult>;
}

export function createHealthCache(ttlMs = HEALTH_CACHE_MS, errorTtlMs = HEALTH_ERROR_CACHE_MS): HealthCache {
  let entry: { at: number; result: HealthResult } | null = null;
  let inFlight: Promise<HealthResult> | null = null;
  return {
    async get(run, now = Date.now(), ledger) {
      if (entry) {
        const ttl = entry.result.kind === "error" ? errorTtlMs : ttlMs;
        if (now - entry.at < ttl) return entry.result;
      }
      if (inFlight) return inFlight;
      inFlight = computeHealth(run, process.env, ledger).then((result) => {
        entry = { at: Date.now(), result };
        inFlight = null;
        return result;
      });
      return inFlight;
    },
  };
}

export const healthCache = createHealthCache();
