// REQ-207 (FAIL-956): the rollback scripts for 064 and 071 are real SQL that
// runs on a migrated database (the 064 one used to be a header comment with a
// literal `drop policy ...` placeholder). Each runs inside a transaction that
// is rolled back, so the shared test database is not changed.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ownerClient, closeOwner } from "./test-owner";

const script = (n: string) => readFileSync(join(__dirname, "..", "scripts", n), "utf8");
after(closeOwner);

async function inRolledBackTx<T>(fn: (c: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const c = await ownerClient();
  try {
    await c.query("begin");
    return await fn(c);
  } finally {
    await c.query("rollback");
    c.release();
  }
}

describe("rollback scripts", () => {
  test("no placeholder text: no '...' in any statement", () => {
    for (const n of ["rollback-064.sql", "rollback-071.sql"]) {
      const code = script(n).split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
      assert.doesNotMatch(code, /\.\.\./, n);
    }
  });

  test("rollback-071 removes app_runtime, its policies and app_runtime_sync(), and reopens the 064 policies", async () => {
    await inRolledBackTx(async (c) => {
      await c.query(script("rollback-071.sql"));
      assert.equal((await c.query(`select 1 from pg_roles where rolname = 'app_runtime'`)).rowCount, 0);
      assert.equal((await c.query(`select 1 from pg_policies where policyname = 'app_runtime_all'`)).rowCount, 0);
      assert.equal((await c.query(`select to_regprocedure('public.app_runtime_sync()') as p`)).rows[0].p, null);
      const q = await c.query(`select qual from pg_policies where tablename = 'objectives' and policyname = 'recheck_read'`);
      assert.equal(q.rows[0].qual, "true");
      assert.equal((await c.query(`select 1 from schema_migrations where filename = '071_app_runtime_role.sql'`)).rowCount, 0);
    });
    // and the rollback itself rolled back
    const c = await ownerClient();
    try {
      assert.equal((await c.query(`select 1 from pg_roles where rolname = 'app_runtime'`)).rowCount, 1);
    } finally {
      c.release();
    }
  });

  test("rollback-064 removes content_recheck, the exec tables and their policies; refuses while a member exists", async () => {
    await inRolledBackTx(async (c) => {
      await c.query(`create role rb064_member login in role content_recheck`);
      await assert.rejects(c.query(script("rollback-064.sql")), /still has member role/);
    });
    await inRolledBackTx(async (c) => {
      // Roles are cluster-wide. A developer cluster that holds other databases
      // with 064 applied cannot drop content_recheck from this one (Postgres:
      // "objects in database X depend on it"); production and CI have one
      // database. Then the script's last role statement is skipped here and the
      // role is only emptied.
      const other = await c.query(
        `select count(*)::int as n from pg_shdepend d
          where d.refclassid = 'pg_authid'::regclass and d.refobjid = (select oid from pg_roles where rolname = 'content_recheck')
            and d.dbid <> 0 and d.dbid <> (select oid from pg_database where datname = current_database())`
      );
      const shared = other.rows[0].n > 0;
      const sql = script("rollback-064.sql");
      await c.query(shared ? sql.replace("execute 'drop role content_recheck';", "null;") : sql);
      assert.equal((await c.query(`select 1 from pg_roles where rolname = 'content_recheck'`)).rowCount, shared ? 1 : 0);
      assert.equal((await c.query(`select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and has_table_privilege('content_recheck', c.oid, 'SELECT') and c.relkind = 'r'`)).rowCount, 0, "no privileges left");
      assert.equal((await c.query(`select to_regclass('public.exec_checks') as r`)).rows[0].r, null);
      assert.equal((await c.query(`select 1 from pg_policies where 'content_recheck' = any (roles)`)).rowCount, 0);
      assert.equal((await c.query(`select 1 from schema_migrations where filename = '064_recheck_role.sql'`)).rowCount, 0);
    });
  });
});
