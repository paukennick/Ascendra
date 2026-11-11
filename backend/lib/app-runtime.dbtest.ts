// REQ-207 (FAIL-940, 941, 954): migration 071's least-privilege runtime role,
// the function hygiene, and the narrowed content_recheck read policies, run
// against a real Postgres with every migration applied.
//
// Setup and catalog questions use the owner connection; the role under test
// is a throwaway LOGIN member of app_runtime (or content_recheck), created
// here and dropped afterwards, so nothing needs app_runtime's own password.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { checkSchema } from "./schema-status";

const OWNER_URL = process.env.OWNER_DATABASE_URL ?? process.env.DATABASE_URL!;
const ssl = process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };
const run = Date.now().toString(36);
const RC_LOGIN = `app_rc_ci_${run}`;
const PASSWORD = randomBytes(12).toString("hex");

const owner = new Pool({ connectionString: OWNER_URL, ssl, max: 2 });
let rt: Pool;
let rc: Pool;
let wasLogin = false;

function urlFor(login: string): string {
  const u = new URL(OWNER_URL);
  u.username = login;
  u.password = PASSWORD;
  return u.toString();
}

const ownerRows = async (sql: string, params: unknown[] = []) => (await owner.query(sql, params)).rows;

before(async () => {
  await owner.query(`create role ${RC_LOGIN} login password '${PASSWORD}' in role content_recheck`);
  // Role settings (statement_timeout ...) are not inherited by members, so the
  // test connects as app_runtime ITSELF, exactly as production will after
  // Nick gives it a password. The migration leaves it NOLOGIN; this test
  // turns login on for its own duration and back off afterwards. When the
  // whole suite is already running as app_runtime (DATABASE_URL), that
  // connection is used instead.
  wasLogin = (await ownerRows(`select rolcanlogin from pg_roles where rolname = 'app_runtime'`))[0].rolcanlogin;
  if (wasLogin) {
    rt = new Pool({ connectionString: process.env.DATABASE_URL!, ssl, max: 2 });
  } else {
    await owner.query(`alter role app_runtime login password '${PASSWORD}'`);
    rt = new Pool({ connectionString: urlFor("app_runtime"), ssl, max: 2 });
  }
  rc = new Pool({ connectionString: urlFor(RC_LOGIN), ssl, max: 2 });
});

after(async () => {
  await rt?.end();
  await rc?.end();
  if (!wasLogin) await owner.query(`alter role app_runtime nologin password null`);
  await owner.query(`drop role if exists ${RC_LOGIN}`);
  await owner.end();
});

describe("FAIL-940: app_runtime is a least-privilege role", () => {
  test("it cannot log in itself, is no superuser, cannot create roles or databases, and does not bypass RLS", async () => {
    const [r] = await ownerRows(
      `select rolcanlogin, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls, rolreplication, rolconfig
         from pg_roles where rolname = 'app_runtime'`
    );
    // Read before this file turned login on for its own connection. (When the
    // suite runs as app_runtime, Nick's step 5 has been simulated and it can.)
    if (!process.env.OWNER_DATABASE_URL) assert.equal(wasLogin, false, "the migration leaves it NOLOGIN; Nick sets the password");
    assert.equal(typeof r.rolcanlogin, "boolean");
    assert.equal(r.rolsuper, false);
    assert.equal(r.rolcreaterole, false);
    assert.equal(r.rolcreatedb, false);
    assert.equal(r.rolbypassrls, false);
    assert.equal(r.rolreplication, false);
    const cfg = (r.rolconfig as string[]).join(" ");
    assert.match(cfg, /statement_timeout=25s/);
    assert.match(cfg, /idle_in_transaction_session_timeout=60s/);
    assert.match(cfg, /jit=off/);
  });

  test("a connection as the role gets the server-side statement_timeout without any SET (works through a transaction pooler)", async () => {
    const r = await rt.query(`show statement_timeout`);
    assert.equal(r.rows[0].statement_timeout, "25s");
  });

  test("DDL is refused: create, alter, drop, truncate, and writing the migration ledger", async () => {
    const denied = (sql: string) => assert.rejects(rt.query(sql), /permission denied|must be owner/, sql);
    await denied(`create table app_rt_probe (id int)`);
    await denied(`alter table attempts add column app_rt_probe int`);
    await denied(`drop table error_log`);
    await denied(`truncate attempts`);
    await denied(`create function public.app_rt_probe() returns int language sql as 'select 1'`);
    await denied(`insert into schema_migrations (filename) values ('999_probe.sql')`);
    await denied(`delete from schema_migrations`);
    await denied(`create role app_rt_probe`);
    assert.equal(
      (await rt.query(`select count(*)::int as n from schema_migrations`)).rows[0].n > 0,
      true,
      "the ledger is readable (the health check compares it with the code)"
    );
  });

  test("rollback copies are not reachable", async () => {
    for (const t of ["mastery_backup_029", "error_log_backup_029"]) {
      if ((await ownerRows(`select to_regclass('public.${t}') as r`))[0].r) {
        await assert.rejects(rt.query(`select 1 from ${t} limit 1`), /permission denied/, t);
      }
    }
  });

  test("it can do what the app does: write and read rows across users through RLS, and delete them", async () => {
    const email = `rt-${run}@example.test`;
    const ins = await rt.query(
      `insert into app_users (email, password_hash, display_name) values ($1, 'x', 'RT') returning id`,
      [email]
    );
    const id = ins.rows[0].id;
    try {
      assert.equal((await rt.query(`select count(*)::int as n from app_users where id = $1`, [id])).rows[0].n, 1);
      await rt.query(`update app_users set display_name = 'RT2' where id = $1`, [id]);
      assert.equal((await rt.query(`select display_name from app_users where id = $1`, [id])).rows[0].display_name, "RT2");
      // Functions the app calls, plus a view.
      await rt.query(`select * from mastery_from_attempts($1, $2)`, [id, randomUUID()]);
      await rt.query(`select grade_lock_key($1, $2)`, [id, randomUUID()]);
      await rt.query(`select * from view_track_progress limit 1`);
    } finally {
      await rt.query(`delete from app_users where id = $1`, [id]);
    }
    assert.equal((await rt.query(`select count(*)::int as n from app_users where id = $1`, [id])).rows[0].n, 0);
  });

  test("every schema probe passes as app_runtime (information_schema hides tables a role cannot touch)", async () => {
    const status = await checkSchema(async (sql) => (await rt.query<{ ok: boolean }>(sql)).rows);
    assert.deepEqual(status.missing, []);
  });

  test("coverage: every app table, view and sequence is granted, and every RLS table has the app policy", async () => {
    const tables = await ownerRows(
      `select c.relname, c.relkind::text as kind, c.relrowsecurity as rls,
              has_table_privilege('app_runtime', c.oid, 'SELECT') as sel,
              has_table_privilege('app_runtime', c.oid, 'INSERT') as ins,
              has_table_privilege('app_runtime', c.oid, 'DELETE') as del,
              exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
                        and p.policyname = 'app_runtime_all' and 'app_runtime' = any (p.roles)) as pol
         from pg_class c
        where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
          and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
          and c.relname !~ '_backup_[0-9]'
        order by 1`
    );
    assert.ok(tables.length > 90, "found the app tables");
    const problems: string[] = [];
    for (const t of tables) {
      if (!t.sel) problems.push(`${t.relname}: no SELECT for app_runtime`);
      if (t.kind === "r" && t.relname !== "schema_migrations" && !(t.ins && t.del)) problems.push(`${t.relname}: no DML for app_runtime`);
      if (t.kind === "r" && t.relname === "schema_migrations" && t.ins) problems.push(`${t.relname}: app_runtime can write the ledger`);
      if (t.kind === "r" && t.rls && t.relname !== "schema_migrations" && !t.pol) problems.push(`${t.relname}: RLS on, no app_runtime_all policy`);
    }
    assert.deepEqual(problems, [], "a migration that adds a table must end with `select app_runtime_sync();`");
    const seqs = await ownerRows(
      `select c.relname from pg_class c
        where c.relnamespace = 'public'::regnamespace and c.relkind = 'S' and c.relname !~ '_backup_'
          and case when c.relkind = 'S' then not has_sequence_privilege('app_runtime', c.oid, 'USAGE') else false end`
    );
    assert.deepEqual(seqs, []);
  });

  test("app_runtime_sync() is repeatable and picks up a table added later", async () => {
    const c = await owner.connect();
    try {
      await c.query("begin");
      await c.query(`create table app_rt_later (id int primary key, note text)`);
      await c.query(`alter table app_rt_later enable row level security`);
      assert.equal((await c.query(`select has_table_privilege('app_runtime', 'app_rt_later', 'SELECT') as g`)).rows[0].g, false);
      await c.query(`select app_runtime_sync()`);
      await c.query(`select app_runtime_sync()`);
      const g = await c.query(
        `select has_table_privilege('app_runtime', 'app_rt_later', 'INSERT') as ins,
                exists (select 1 from pg_policies where tablename = 'app_rt_later' and policyname = 'app_runtime_all') as pol`
      );
      assert.deepEqual(g.rows[0], { ins: true, pol: true });
    } finally {
      await c.query("rollback");
      c.release();
    }
  });
});

describe("FAIL-941: functions", () => {
  const projectFunctions = `
    select p.oid, p.proname, p.prokind::text as kind, p.prorettype = 'trigger'::regtype as is_trigger,
           p.proconfig, p.proacl
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')`;

  test("nothing is executable by PUBLIC, anon or authenticated", async () => {
    const rows = await ownerRows(`${projectFunctions} order by 2`);
    assert.ok(rows.length >= 20, "found the project's functions");
    const exposed = await ownerRows(
      `select proname from (${projectFunctions}) f
        where exists (select 1 from aclexplode(coalesce(f.proacl, acldefault('f', (select proowner from pg_proc where oid = f.oid)))) a
                       where a.privilege_type = 'EXECUTE'
                         and (a.grantee = 0 or a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated'))))`
    );
    assert.deepEqual(exposed, []);
  });

  test("every function has a fixed search_path (the procedure cannot: a SET clause forbids COMMIT)", async () => {
    const rows = await ownerRows(`${projectFunctions}`);
    const loose = rows.filter((r) => r.kind === "f" && !/search_path=/.test(String(r.proconfig)));
    assert.deepEqual(loose.map((r) => r.proname), [], "a migration that restates a function must end with `select app_runtime_sync();`");
    assert.ok(rows.some((r) => r.kind === "p" && r.proname === "recompute_mastery_batched"));
  });

  test("app_runtime runs the functions it needs, not the owner-only ones", async () => {
    const e = await ownerRows(
      `select p.proname, has_function_privilege('app_runtime', p.oid, 'EXECUTE') as x
         from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any ($1)`,
      [["mastery_from_attempts", "mastery_detail", "review_state", "recompute_mastery_pair", "attempt_spaced", "lesson_item_key", "learner_events_on_attempt", "recompute_mastery_batched", "app_runtime_sync"]]
    );
    const by = Object.fromEntries(e.map((r) => [r.proname, r.x]));
    assert.deepEqual(by, {
      mastery_from_attempts: true,
      mastery_detail: true,
      review_state: true,
      recompute_mastery_pair: true,
      attempt_spaced: true,
      lesson_item_key: true,
      learner_events_on_attempt: false,
      recompute_mastery_batched: false,
      app_runtime_sync: false,
    });
    await assert.rejects(rt.query(`select app_runtime_sync()`), /permission denied/);
  });

  test("the owner can still run the migration-time functions and the batched recompute", async () => {
    await owner.query(`select recompute_mastery('00000000-0000-0000-0000-000000000000')`);
    const c = await owner.connect();
    try {
      await c.query(`call recompute_mastery_batched(500, '00000000-0000-0000-0000-000000000000')`);
    } finally {
      c.release();
    }
  });
});

describe("FAIL-954: content_recheck reads catalog structure only", () => {
  test("a learner's private course units and objectives are invisible to content_recheck", async () => {
    const uid = randomUUID();
    const privTrack = randomUUID(), privUnit = randomUUID(), privObj = randomUUID();
    const pubTrack = randomUUID(), pubUnit = randomUUID(), pubObj = randomUUID();
    await owner.query(`insert into app_users (id, email, password_hash, display_name) values ($1, $2, 'x', 'P')`, [uid, `rc-${run}@example.test`]);
    try {
      await owner.query(`insert into subject_tracks (id, user_id, code, title, track_type) values ($1, $2, $3, 'Private', 'certification')`, [privTrack, uid, `PV${run}`.slice(0, 20)]);
      await owner.query(`insert into subject_tracks (id, code, title, track_type) values ($1, $2, 'Public', 'certification')`, [pubTrack, `PB${run}`.slice(0, 20)]);
      await owner.query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1), ($3, $4, 'U', 1)`, [privUnit, privTrack, pubUnit, pubTrack]);
      await owner.query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1), ($3, $4, 'O', 1)`, [privObj, privUnit, pubObj, pubUnit]);
      const seenUnits = (await rc.query(`select id from course_units where id = any ($1)`, [[privUnit, pubUnit]])).rows.map((r) => r.id);
      const seenObjs = (await rc.query(`select id from objectives where id = any ($1)`, [[privObj, pubObj]])).rows.map((r) => r.id);
      assert.deepEqual(seenUnits, [pubUnit]);
      assert.deepEqual(seenObjs, [pubObj]);
    } finally {
      await owner.query(`delete from subject_tracks where id = any ($1)`, [[privTrack, pubTrack]]);
      await owner.query(`delete from app_users where id = $1`, [uid]);
    }
  });
});
