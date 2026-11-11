// REQ-207: test support. The integration suite normally connects as the
// database owner. `scripts/ci/db-tests-as-runtime.sh` runs it as the
// least-privilege app_runtime role instead (migration 071); the few things a
// test does that the app never may -- DDL, replaying a migration, creating
// roles, touching rollback copies -- go through this owner connection, which
// is DATABASE_URL unless OWNER_DATABASE_URL names a different one.
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { sslOption } from "./db-connection";

let pool: Pool | null = null;

export function ownerUrl(): string {
  return (process.env.OWNER_DATABASE_URL || process.env.DATABASE_URL)!;
}

export function ownerPool(): Pool {
  return (pool ??= new Pool({ connectionString: ownerUrl(), ssl: sslOption(), max: 2 }));
}

export async function ownerQuery<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await ownerPool().query<T>(text, params)).rows;
}

export async function ownerClient(): Promise<PoolClient> {
  return ownerPool().connect();
}

export async function closeOwner(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}
