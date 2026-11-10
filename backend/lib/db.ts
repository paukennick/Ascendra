import { Pool, types, type QueryResultRow } from "pg";
import { sslOption, startupStatementTimeoutMs } from "./db-connection";

// REQ-207: TLS and the startup statement_timeout live in db-connection.ts so
// the migration runner and the seed share them.
export { sslOption };

// REQ-128: pg hands back count() (bigint) and numeric columns as strings.
// Every one in this schema is a small count or a weight/percentage (the
// only numeric columns are numeric(5,2) weights), so parse them to numbers
// once, here. The app compared them as strings before -- "9" >= "10" is
// true -- which marked a 9-of-10 unit complete and skipped it.
types.setTypeParser(types.builtins.INT8, (v) => Number(v));
types.setTypeParser(types.builtins.NUMERIC, (v) => Number(v));

// Single shared pg Pool across warm serverless invocations. Vercel + Supabase's
// pooled ("Transaction mode", port 6543) connection string is the intended target,
// so we keep this pool small.
let pool: Pool | null = null;

export const POOL_CONNECT_TIMEOUT_MS = 10_000;
export const QUERY_TIMEOUT_MS = 30_000;
// Server-side limits for a transaction, set with SET LOCAL (scoped to the
// transaction, so safe on a transaction-mode pooler where a session-level
// SET would leak to the next client). statement_timeout stops the server
// running a statement the client has given up on; lock_timeout bounds a
// wait on a row lock; idle_in_transaction_session_timeout frees the backend
// if this process stalls mid-transaction. Advisory locks taken with
// pg_advisory_xact_lock wait under statement_timeout.
export const TX_STATEMENT_TIMEOUT_MS = 20_000;
export const TX_LOCK_TIMEOUT_MS = 10_000;
export const TX_IDLE_TIMEOUT_MS = 30_000;

// The statement that opens every withTransaction: BEGIN plus the SET LOCAL
// limits above, as one simple-protocol query (one round trip). Exported for
// lib/db.test.ts.
export function txBeginSql(readOnlySnapshot: boolean): string {
  return [
    readOnlySnapshot ? "begin isolation level repeatable read read only" : "begin",
    `set local statement_timeout = '${TX_STATEMENT_TIMEOUT_MS}ms'`,
    `set local lock_timeout = '${TX_LOCK_TIMEOUT_MS}ms'`,
    `set local idle_in_transaction_session_timeout = '${TX_IDLE_TIMEOUT_MS}ms'`,
  ].join("; ");
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Add it in Vercel project env vars (or .env.local for local dev) — see backend/.env.example."
      );
    }
    pool = new Pool({
      connectionString,
      ssl: sslOption(),
      // FAIL-943: a server-side limit for plain query() (see db-connection.ts
      // for when it is sent and what covers a transaction-mode pooler).
      statement_timeout: startupStatementTimeoutMs(connectionString),
      max: 5,
      idleTimeoutMillis: 10_000,
      // REQ-135: none of these were set, so a stalled database or a full
      // pool made requests hang until the platform killed them, holding
      // the other four connections meanwhile.
      // - waiting for a free pool connection (or a new one) gives up here;
      connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
      // - the driver gives up on any one query after this (client side, so
      //   it works through Supabase's transaction-mode pooler, which is not
      //   guaranteed to accept server settings in the startup packet).
      query_timeout: QUERY_TIMEOUT_MS,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getPool().connect();
  let timedOut: Error | undefined;
  try {
    const res = await client.query<T>(text, params);
    return res.rows;
  } catch (err) {
    // The driver's query_timeout does not cancel the statement on the
    // server, so that connection may still be busy: discard it.
    if (isQueryTimeout(err)) timedOut = err as Error;
    throw err;
  } finally {
    client.release(timedOut);
  }
}

export function isQueryTimeout(err: unknown): boolean {
  return err instanceof Error && /query read timeout/i.test(err.message);
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export interface TxClient {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<T[]>;
  queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<T | null>;
}

// REQ-127: runs `fn` on one checked-out client inside BEGIN/COMMIT, rolling
// back if it throws. `query()` above takes a fresh pool client per call, so
// a multi-statement write built from it can half-succeed; anything that
// must land all-or-nothing goes through here instead. Works on Supabase's
// transaction-mode pooler, which pins one backend for the transaction.
export async function withTransaction<R>(
  fn: (tx: TxClient) => Promise<R>,
  opts: { readOnlySnapshot?: boolean } = {}
): Promise<R> {
  const client = await getPool().connect();
  const tx: TxClient = {
    async query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
      return (await client.query<T>(text, params)).rows;
    },
    async queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
      const rows = (await client.query<T>(text, params)).rows;
      return rows.length ? rows[0] : null;
    },
  };
  // REQ-135: a connection whose rollback failed is in an unknown state;
  // release(err) destroys it instead of returning it to the pool.
  let broken: Error | undefined;
  try {
    // readOnlySnapshot: every statement sees one snapshot (account export).
    // REQ-118 (Audit 3 MEDIUM-8): BEGIN and the SET LOCALs go in one round
    // trip (a parameterless multi-statement simple query; the values are
    // constants from this file, never caller input). Every transaction paid
    // two round trips for this before -- about 15 ms each to Supabase.
    await client.query(txBeginSql(opts.readOnlySnapshot === true));
    const result = await fn(tx);
    await client.query("commit");
    return result;
  } catch (err) {
    if (isQueryTimeout(err)) {
      // Still busy on the server; destroying the connection rolls it back.
      broken = err as Error;
    } else {
      await client.query("rollback").catch((rollbackErr: Error) => {
        broken = rollbackErr;
      });
    }
    throw err;
  } finally {
    client.release(broken);
  }
}

// For scripts and integration tests that need the process to exit promptly.
export async function closePool(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}
