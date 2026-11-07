import { Pool, types, type QueryResultRow } from "pg";

// REQ-090: pg hands back count() (bigint) and numeric columns as strings.
// Every one in this schema is a small count or a weight/percentage (the
// only numeric columns are numeric(5,2) weights), so parse them to numbers
// once, here. The app compared them as strings before -- "9" >= "10" is
// true -- which marked a 9-of-10 unit complete and skipped it.
types.setTypeParser(types.builtins.INT8, (v) => Number(v));
types.setTypeParser(types.builtins.NUMERIC, (v) => Number(v));

// TLS is on for every hosted database (Supabase). CI's throwaway Postgres
// service has no TLS, so PGSSLMODE=disable turns it off there only.
export function sslOption(): false | { rejectUnauthorized: false } {
  return process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };
}

// Single shared pg Pool across warm serverless invocations. Vercel + Supabase's
// pooled ("Transaction mode", port 6543) connection string is the intended target,
// so we keep this pool small.
let pool: Pool | null = null;

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
      max: 5,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const res = await client.query<T>(text, params);
    return res.rows;
  } finally {
    client.release();
  }
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

// REQ-089: runs `fn` on one checked-out client inside BEGIN/COMMIT, rolling
// back if it throws. `query()` above takes a fresh pool client per call, so
// a multi-statement write built from it can half-succeed; anything that
// must land all-or-nothing goes through here instead. Works on Supabase's
// transaction-mode pooler, which pins one backend for the transaction.
export async function withTransaction<R>(fn: (tx: TxClient) => Promise<R>): Promise<R> {
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
  try {
    await client.query("begin");
    const result = await fn(tx);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
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
