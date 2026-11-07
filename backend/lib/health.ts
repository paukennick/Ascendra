// REQ-098: what GET /api/health reports, cached.
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

import { checkSchema, migrationsToApply, type SchemaStatus } from "./schema-status";

export const HEALTH_CACHE_MS = 30_000;
export const HEALTH_ERROR_CACHE_MS = 5_000;

export type HealthResult =
  | { kind: "ok" }
  | { kind: "schema_incomplete"; applyMigrations: string[]; missing: SchemaStatus["missing"] }
  | { kind: "error"; error: unknown };

type QueryFn = (sql: string) => Promise<Array<{ ok: boolean }>>;

export async function computeHealth(run: QueryFn): Promise<HealthResult> {
  try {
    await run("select 1 as ok");
    const schema = await checkSchema(run);
    if (!schema.current) {
      return { kind: "schema_incomplete", applyMigrations: migrationsToApply(schema), missing: schema.missing };
    }
    return { kind: "ok" };
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
