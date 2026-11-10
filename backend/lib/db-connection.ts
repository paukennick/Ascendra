// REQ-207: how this project connects to Postgres, in one pure module that the
// app (lib/db.ts), the migration runner and the seed share. No pg import, so
// scripts can use it without lib/db.ts's global type-parser side effects.

import { readFileSync } from "node:fs";

// TLS (FAIL-942). Every hosted database is reached over TLS. Until now the
// certificate was never checked (rejectUnauthorized: false), so anyone on the
// path could present their own and read the traffic, DATABASE_URL's password
// included. Pinning is opt-in so nothing breaks before the CA is configured:
//
//   DATABASE_CA_CERT   the CA certificate itself (PEM text; a literal "\n"
//                      is accepted so it fits a one-line env var), or a
//                      path to a PEM file; or
//   PGSSLROOTCERT      libpq's name: a path to a PEM file (PEM text also
//                      accepted).
//
// Set: the server's certificate must chain to that CA and match the host
// name. Unset: unchanged behaviour (encrypted, not verified). PGSSLMODE=disable
// still turns TLS off, for CI's throwaway Postgres only. A CA that is set but
// cannot be read is an error, never a silent fall back to "not verified".
// Where Nick downloads Supabase's CA: docs/ops/2026-11-10-lockdown-and-db-rotation.md.
export type SslOption = false | { rejectUnauthorized: false } | { ca: string; rejectUnauthorized: true };

type Env = Record<string, string | undefined>;

const PEM_MARK = "-----BEGIN CERTIFICATE-----";

function readCa(value: string, name: string): string {
  const trimmed = value.trim();
  const pem = trimmed.includes(PEM_MARK) ? trimmed.replace(/\\n/g, "\n") : readFileOrThrow(trimmed, name);
  if (!pem.includes(PEM_MARK)) throw new Error(`${name} does not contain a PEM certificate (expected "${PEM_MARK}").`);
  return pem;
}

function readFileOrThrow(path: string, name: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    // Not the path itself in the message: it can be a pasted value that is not a path at all.
    throw new Error(`${name} is set but is neither a PEM certificate nor a readable file path.`);
  }
}

export function sslOption(env: Env = process.env): SslOption {
  if (env.PGSSLMODE === "disable") return false;
  const fromCert = env.DATABASE_CA_CERT?.trim();
  if (fromCert) return { ca: readCa(fromCert, "DATABASE_CA_CERT"), rejectUnauthorized: true };
  const fromRoot = env.PGSSLROOTCERT?.trim();
  if (fromRoot) return { ca: readCa(fromRoot, "PGSSLROOTCERT"), rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

// Server-side statement_timeout for plain query() (FAIL-943). withTransaction
// already sets one per transaction with SET LOCAL; a plain query() had only
// the driver's client-side query_timeout, which gives up waiting but leaves
// the statement running on the server, holding a connection and its locks.
//
// Two layers, because a session-level SET does not survive a transaction-mode
// pooler (the next client gets the connection with it still set, or a
// different backend without it):
//   1. the app_runtime role carries statement_timeout itself (migration 071,
//      `alter role ... set`), which every pooler honours; and
//   2. for any other role, the value goes in the connection's startup
//      packet (pg's statement_timeout option). A direct or local Postgres
//      accepts that. Supabase's poolers are not documented to, so on a pooler
//      host (or port 6543) it is sent only when DB_STATEMENT_TIMEOUT_MS is
//      set explicitly; DB_STATEMENT_TIMEOUT_MS=0 turns it off anywhere.
export const DEFAULT_STATEMENT_TIMEOUT_MS = 25_000;

export function isPoolerUrl(connectionString: string): boolean {
  try {
    const u = new URL(connectionString);
    return u.port === "6543" || /(^|\.)pooler\./i.test(u.hostname);
  } catch {
    return true; // cannot tell: do not send anything a pooler might refuse
  }
}

export function startupStatementTimeoutMs(connectionString: string, env: Env = process.env): number | undefined {
  const raw = env.DB_STATEMENT_TIMEOUT_MS?.trim();
  if (raw) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 600_000) {
      throw new Error("DB_STATEMENT_TIMEOUT_MS must be a whole number of milliseconds from 0 (off) to 600000.");
    }
    return n === 0 ? undefined : n;
  }
  return isPoolerUrl(connectionString) ? undefined : DEFAULT_STATEMENT_TIMEOUT_MS;
}

// Migration runner (FAIL-944). Every migration file sets `set local
// lock_timeout = '5s'` itself, but only inside its own transaction and only
// if the author remembered. The runner also sets a SESSION lock_timeout on the
// connection before it opens the transaction, so a migration that waits on a
// lock held by live traffic fails (and rolls back) instead of queueing
// behind it and blocking every request that arrives after. It runs on the
// session pooler (port 5432) where a session SET is the connection's own.
// MIGRATION_LOCK_TIMEOUT overrides it ("10s", "500ms"); "0" turns it off.
export function lockTimeoutSql(env: Env = process.env): string | null {
  const raw = (env.MIGRATION_LOCK_TIMEOUT?.trim() || "5s");
  if (raw === "0") return null;
  if (!/^\d{1,6}(ms|s|min)$/.test(raw)) throw new Error('MIGRATION_LOCK_TIMEOUT must look like "5s", "500ms" or "1min" (or 0 to turn off).');
  return `set lock_timeout = '${raw}'`;
}
