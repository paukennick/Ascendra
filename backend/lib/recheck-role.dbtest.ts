// REQ-196: the re-check and sandbox jobs, run as a real LOGIN member of the
// content_recheck role (migration 064) against a Postgres with every
// migration applied and the seed loaded. The model and the sandbox are fakes.
//
// Setup and assertions about serving use the owner connection (a separate
// pool); the code under test uses lib/db, pointed at the restricted login
// before it is imported -- exactly how the workflows run it.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { Pool } from "pg";

const OWNER_URL = process.env.DATABASE_URL!;
const run = Date.now().toString(36);
const LOGIN = `recheck_ci_${run}`;
const PASSWORD = randomBytes(12).toString("hex");
const owner = new Pool({ connectionString: OWNER_URL, ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false } });

function restrictedUrl(): string {
  const u = new URL(OWNER_URL);
  u.username = LOGIN;
  u.password = PASSWORD;
  return u.toString();
}

const track = randomUUID();
const unit = randomUUID();
const obj = randomUUID();
const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");
const CHOICES = ["Port 80", "Port 443", "Port 8080", "Port 22"];

type Lib = {
  db: typeof import("./db");
  recheck: typeof import("./recheck-stored");
  exec: typeof import("./exec-checks");
  guard: typeof import("./recheck-guard");
  budget: typeof import("./run-budget");
  iq: typeof import("./item-quality");
};
let L: Lib;

before(async () => {
  await owner.query(`create role ${LOGIN} login password '${PASSWORD}' in role content_recheck`);
  await owner.query(`insert into subject_tracks (id, code, title, track_type) values ($1, $2, 'Role test', 'certification')`, [track, `RT${run}`.slice(0, 20)]);
  await owner.query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  await owner.query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Role objective', 1)`, [obj, unit]);
  await owner.query(
    `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, model, generated_at)
     values ($1, 'g', 't', $2, $3, 1, 'w', $4, $3, 1, 'w', 'claude-sonnet-5', '2026-10-01')`,
    [obj, `Role fade ${run}`, JSON.stringify(CHOICES), `Role solo ${run}`]
  );
  await owner.query(
    `insert into exec_checks (item_kind, item_id, objective_id, question, language, code, expected) values
       ('lesson', $1, $2, $3, 'python', 'print(443)', '443'),
       ('lesson', $4, $2, $5, 'python', 'print(8080)', '443')`,
    [`${obj}:solo:${md5(`Role solo ${run}`)}`, obj, `Role solo ${run}`, `${obj}:x:${run}`, `Other ${run}`]
  );
  process.env.DATABASE_URL = restrictedUrl();
  L = {
    db: await import("./db"),
    recheck: await import("./recheck-stored"),
    exec: await import("./exec-checks"),
    guard: await import("./recheck-guard"),
    budget: await import("./run-budget"),
    iq: await import("./item-quality"),
  };
});

after(async () => {
  await L?.db.closePool();
  process.env.DATABASE_URL = OWNER_URL;
  await owner.query(`delete from item_holdbacks where objective_id = $1`, [obj]);
  await owner.query(`delete from subject_tracks where id = $1`, [track]);
  await owner.query(`drop role if exists ${LOGIN}`);
  await owner.end();
});

describe("REQ-196: the jobs' database role", () => {
  test("the guard accepts the staging-only login and refuses the owner", async () => {
    const p = await L.guard.assertStagingOnlyRole({});
    assert.equal(p.role, LOGIN);
    assert.deepEqual(p.writable, []);
    assert.equal(p.canStage, true);
    const o = await owner.query(`select current_user as role, rolsuper, rolbypassrls from pg_roles where rolname = current_user`);
    assert.notEqual(
      L.guard.privilegeProblem({ role: o.rows[0].role, superuser: o.rows[0].rolsuper, bypassRls: o.rows[0].rolbypassrls, writable: ["item_status"], canStage: true }, {}),
      null
    );
  });

  test("it can read content and stage; it cannot pull, void, clear, edit content or read learners", async () => {
    const q = (sql: string, params: unknown[] = []) => L.db.query(sql, params);
    assert.equal((await q(`select fade_problem from lesson_content where objective_id = $1`, [obj])).length, 1);
    assert.equal((await q(`select objective_id, solo_check from lesson_content_overrides limit 1`)).length >= 0, true);
    const denied = async (sql: string, params: unknown[] = []) => assert.rejects(q(sql, params), /permission denied/, sql);
    await denied(`insert into item_status (item_kind, item_id, question, status, reason) values ('lesson', 'x', 'q', 'quarantined', 'x')`);
    await denied(`update item_status set status = 'cleared'`);
    await denied(`delete from item_status`);
    await denied(`update attempts set voided_at = now()`);
    await denied(`update lesson_content set fade_problem = 'x' where objective_id = $1`, [obj]);
    await denied(`delete from lesson_content where objective_id = $1`, [obj]);
    await denied(`update item_holdbacks set claims = '[]'`);
    await denied(`delete from item_holdbacks`);
    await denied(`delete from exec_checks`);
    await denied(`insert into exec_checks (item_kind, item_id, question, language, code, expected) values ('lesson', 'y', 'q', 'python', 'print(1)', '1')`);
    await denied(`select email from app_users limit 1`);
    await denied(`select user_id from lesson_content_overrides limit 1`);
    await denied(`select * from attempts limit 1`);
    await denied(`select * from ai_calls limit 1`);
    // Only catalog tracks are visible.
    const own = await owner.query(`select count(*)::int as n from subject_tracks where user_id is not null`);
    const seen = await q(`select count(*)::int as n from subject_tracks where user_id is not null`);
    assert.equal(seen[0].n, 0);
    assert.ok(own.rows[0].n >= 0);
  });

  test("the re-check stages as this role, and the item stays served", async () => {
    const checker = async (items: { key: string; question: string; expected: number[] }[]) =>
      items.map((it) => ({ key: it.key, publish: !it.question.startsWith("Role fade"), answer: [0], unsupportedClaims: [], outcome: it.question.startsWith("Role fade") ? ("disagree" as const) : ("agree" as const) }));
    const r = await L.recheck.recheckStored({ before: "2026-10-15", mode: "apply", kinds: ["lesson"], checker, budget: new L.budget.RunBudget(5) });
    assert.ok(r.staged.some((s) => s.ref.objectiveId === obj));
    const fadeId = `${obj}:fade:${md5(`Role fade ${run}`)}`;
    const st = await owner.query(`select 1 from item_status where item_id = $1`, [fadeId]);
    assert.equal(st.rowCount, 0, "not pulled");
    const staged = await owner.query(`select content from item_holdbacks where content->>'itemId' = $1`, [fadeId]);
    assert.equal(staged.rows[0].content.staged, "recheck");
    // Still served: the lesson's serving predicate is unchanged.
    const servable = await owner.query(`select 1 from lesson_content lc where lc.objective_id = $1 and ${L.iq.lessonServableSql("lc")}`, [obj]);
    assert.equal(servable.rowCount, 1);
  });

  test("the sandbox job records results and stages a disagreement as this role; nothing is pulled", async () => {
    const runner = async (s: { code: string }) => ({ status: "ok" as const, stdout: s.code === "print(443)" ? "443\n" : "8080\n" });
    const mine = (await L.exec.pendingExecChecks(1000)).filter((p) => p.ref.objectiveId === obj);
    assert.equal(mine.length, 2);
    const r = await L.exec.runExecChecks({ runner, runnerName: "fake", limit: 1000 });
    assert.ok(r.passed >= 1 && r.failed >= 1);
    const runs = await owner.query(`select item_id, outcome from exec_check_runs where item_id in ($1, $2) order by outcome`, [mine[0].ref.itemId, mine[1].ref.itemId]);
    assert.deepEqual(runs.rows.map((x) => x.outcome).sort(), ["failed", "passed"]);
    const staged = await owner.query(`select claims from item_holdbacks where content->>'staged' = 'exec' and content->>'itemId' = $1`, [`${obj}:x:${run}`]);
    assert.equal(staged.rowCount, 1);
    assert.equal(staged.rows[0].claims[0], L.exec.EXEC_STAGE_MARK);
    assert.equal((await owner.query(`select 1 from item_status where item_id like $1`, [`${obj}%`])).rowCount, 0);
    assert.equal((await L.exec.pendingExecChecks(1000)).filter((p) => p.ref.objectiveId === obj).length, 0, "decided runs are not repeated");
  });

  test("fail closed: an unavailable sandbox records nothing and leaves the item exec_unverified", async () => {
    await owner.query(`insert into exec_checks (item_kind, item_id, objective_id, question, language, code, expected) values ('lesson', $1, $2, 'q', 'python', 'print(1)', '1')`, [`${obj}:u:${run}`, obj]);
    const r = await L.exec.runExecChecks({ runner: async () => ({ status: "unavailable" }), runnerName: "none", limit: 1000 });
    assert.equal(r.unavailable, true);
    assert.equal(r.passed, 0);
    assert.equal((await owner.query(`select 1 from exec_check_runs where item_id = $1`, [`${obj}:u:${run}`])).rowCount, 0);
    assert.ok((await L.exec.pendingExecChecks(1000)).some((p) => p.ref.itemId === `${obj}:u:${run}`));
  });

  test("the time budget: past the deadline no program starts, nothing is recorded, the item waits for the next run", async () => {
    let started = 0;
    const runner = async () => {
      started++;
      return { status: "ok" as const, stdout: "1\n" };
    };
    const r = await L.exec.runExecChecks({ runner, runnerName: "fake", limit: 1000, deadline: Date.now() - 1 });
    assert.equal(r.stoppedAtDeadline, true);
    assert.equal(started, 0);
    assert.equal((await owner.query(`select 1 from exec_check_runs where item_id = $1`, [`${obj}:u:${run}`])).rowCount, 0);
    assert.ok((await L.exec.pendingExecChecks(1000)).some((p) => p.ref.itemId === `${obj}:u:${run}`));
  });
});
