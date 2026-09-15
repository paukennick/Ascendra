import { Pool, type QueryResultRow } from "pg";

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
      ssl: { rejectUnauthorized: false },
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

// Single-user app today: every request resolves the same seeded app_users row.
// Kept as a lookup (rather than a hardcoded id) so a real multi-user setup only
// needs a real auth layer added on top, not a schema change.
let cachedUserId: string | null = null;

export async function getDefaultUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const email = process.env.DEFAULT_USER_EMAIL || "pak@example.com";
  const row = await queryOne<{ id: string }>(
    "select id from app_users where email = $1",
    [email]
  );
  if (!row) {
    throw new Error(
      `No app_users row found for ${email}. Run the seed script (npm run seed) after applying the migration.`
    );
  }
  cachedUserId = row.id;
  return cachedUserId;
}
