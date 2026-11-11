// REQ-207 (FAIL-943): a plain query() is stopped by the SERVER at the
// statement_timeout, not just abandoned by the driver. Runs against the
// suite's Postgres (owner or app_runtime: a startup value beats the role's).
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.DB_STATEMENT_TIMEOUT_MS = "700";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { query, closePool } from "./db";

after(closePool);

test("the pool's connections carry the statement_timeout", async () => {
  const [r] = await query<{ statement_timeout: string }>(`show statement_timeout`);
  assert.equal(r.statement_timeout, "700ms");
});

test("a slow plain query is canceled on the server and its backend is idle again", async () => {
  const marker = `f943_${Date.now()}`;
  await assert.rejects(query(`select pg_sleep(5), '${marker}'`), /statement timeout/);
  const rows = await query<{ n: number }>(
    `select count(*)::int as n from pg_stat_activity where query like $1 and state = 'active' and pid <> pg_backend_pid()`,
    [`%${marker}%`]
  );
  assert.equal(rows[0].n, 0, "nothing is still running the canceled statement");
});
