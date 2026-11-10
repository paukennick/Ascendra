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
import { checkSchema, migrationsToApply, type SchemaStatus } from "./schema-status";
import { formatEnvProblems, requiredEnvProblems } from "./required-env";

export const HEALTH_CACHE_MS = 30_000;
export const HEALTH_ERROR_CACHE_MS = 5_000;

export type HealthResult =
  | { kind: "ok"; warnings?: string[] }
  | { kind: "schema_incomplete"; applyMigrations: string[]; missing: SchemaStatus["missing"] }
  // REQ-118: production is missing a required setting (names only).
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

export async function computeHealth(
  run: QueryFn,
  env: Record<string, string | undefined> = process.env
): Promise<HealthResult> {
  try {
    // REQ-118: required settings first (no database needed). Fatal in
    // production; elsewhere (local dev, tests) only a warning.
    const envProblems = formatEnvProblems(requiredEnvProblems(env));
    if (envProblems.length && env.NODE_ENV === "production") return { kind: "misconfigured", env: envProblems };
    await run("select 1 as ok");
    const schema = await checkSchema(run);
    if (!schema.current) {
      return { kind: "schema_incomplete", applyMigrations: migrationsToApply(schema), missing: schema.missing };
    }
    // REQ-201: an AI_ACCESS_MODE or global ceiling that isn't doing what it
    // looks like it does.
    const warnings = [...envProblems, ...aiAccessWarnings(env)];
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
  get(run: QueryFn, now?: number): Promise<HealthResult>;
}

export function createHealthCache(ttlMs = HEALTH_CACHE_MS, errorTtlMs = HEALTH_ERROR_CACHE_MS): HealthCache {
  let entry: { at: number; result: HealthResult } | null = null;
  let inFlight: Promise<HealthResult> | null = null;
  return {
    async get(run, now = Date.now()) {
      if (entry) {
        const ttl = entry.result.kind === "error" ? errorTtlMs : ttlMs;
        if (now - entry.at < ttl) return entry.result;
      }
      if (inFlight) return inFlight;
      inFlight = computeHealth(run).then((result) => {
        entry = { at: Date.now(), result };
        inFlight = null;
        return result;
      });
      return inFlight;
    },
  };
}

export const healthCache = createHealthCache();
