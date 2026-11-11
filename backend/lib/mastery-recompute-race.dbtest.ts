// REQ-134, PR #22 second review. The recompute against live grading, the
// deploy-gap evidence rule, and the 029b status checks -- each against a real
// Postgres with every migration applied.
//
// FAIL-118: recompute_mastery() computed every pair from one snapshot and
//   upserted without the grader's lock, so a grade committed during the run
//   was overwritten with the level from before it.
// FAIL-180: it also row-locked every existing mastery row (ON CONFLICT DO
//   UPDATE locks the row even when its WHERE skips the update).
// FAIL-182: attempts of any kind counted as evidence.
// FAIL-119: skipping 029b passed every status check.
import { recordStudyNoticeAcceptance } from "./study-notice";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { gradeLockName } from "./grading-service";
import { checkSchema, masteryDrift, migrationsToApply } from "./schema-status";

const run = Date.now().toString(36);
const user = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const objs = Array.from({ length: 6 }, () => randomUUID());
const clients: Client[] = [];

async function client() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: sslOption() });
  await c.connect();
  clients.push(c);
  return c;
}

async function attempt(objectiveId: string, kind: string, question: string, ago: string) {
  await query(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, created_at)
     values ($1, $2, $3, $4, 'solo', 'open', $5, 'a', 'correct', now() - $6::interval)`,
    [user, unit, objectiveId, kind, question, ago]
  );
}
const stored = async (objectiveId: string) =>
  (await queryOne<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = $2`, [user, objectiveId]))
    ?.status;

// What recordAttemptTx() in grading-service.ts does, split so the test can
// hold the transaction open: same lock name, same mastery statement.
async function openGrade(c: Client, objectiveId: string, question: string) {
  await c.query("begin");
  await c.query(`select pg_advisory_xact_lock(hashtext($1))`, [gradeLockName(user, objectiveId)]);
  await c.query(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict)
     values ($1, $2, $3, 'lesson', 'solo', 'open', $4, 'a', 'correct')`,
    [user, unit, objectiveId, question]
  );
  await c.query(
    `insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
     select $1, $2, m.status, m.score, m.evidence, now() from mastery_from_attempts($1, $2) m
     on conflict (user_id, objective_id) do update set
       status = excluded.status, score_0_4 = excluded.score_0_4, evidence = excluded.evidence, updated_at = now()`,
    [user, objectiveId]
  );
}

// Until `pid` is waiting on a lock (any kind), or 5 s.
async function waitUntilBlocked(pid: number) {
  for (let i = 0; i < 100; i++) {
    const w = await queryOne(`select 1 from pg_locks where pid = $1 and not granted`, [pid]);
    if (w) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("the recompute never waited on the grade's lock");
}

async function setStale(objectiveId: string) {
  await query(
    `insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Guided', 2, 'old rule')
     on conflict (user_id, objective_id) do update set status = 'Guided', score_0_4 = 2, evidence = 'old rule'`,
    [user, objectiveId]
  );
}

before(async () => {
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `rr-${run}@example.test`]);
  await recordStudyNoticeAcceptance(user); // REQ-205: model routes need the notice
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'RR', 'certification', $3)`, [
    track,
    `RR-${run}`,
    user,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  for (const [i, id] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [id, unit, `O${i}`, i]);
  }
});

after(async () => {
  for (const c of clients) await c.end().catch(() => undefined);
  await query(`delete from mastery_backup_029 where user_id = $1`, [user]);
  await query(`delete from app_users where id = $1`, [user]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("recompute under live grading (FAIL-118)", () => {
  for (const [name, sql] of [
    ["recompute_mastery()", `select recompute_mastery($1)`],
    ["call recompute_mastery_batched()", `call recompute_mastery_batched(2, $1)`],
  ] as const) {
    test(`a grade committed while ${name} runs keeps its level`, async () => {
      const o = name.startsWith("call") ? objs[1] : objs[0];
      await attempt(o, "lesson", `first ${name}`, "2 days"); // Independent on its own
      await setStale(o); // so the recompute has this pair to write
      const g = await client();
      const r = await client();
      const rPid = (await r.query<{ pid: number }>(`select pg_backend_pid() as pid`)).rows[0].pid;

      // The grade is in flight: a second Solo success, 2 days after the first.
      await openGrade(g, o, `second ${name}`);
      const recompute = r.query(sql, [user]);
      recompute.catch(() => undefined); // awaited below; don't crash on early failure
      try {
        await Promise.race([waitUntilBlocked(rPid), recompute]);
      } finally {
        await g.query("commit");
      }
      await recompute;

      // REQ-100: under 031's weighted rule two Solo answers in one format give
      // Independent, not Transfer-ready, so the check is rule-relative: what's
      // stored must be what the rule gives with the fresh grade counted, and
      // not the stale value the recompute started from.
      const f = await queryOne<{ status: string }>(`select status from mastery_from_attempts($1, $2)`, [user, o]);
      assert.notEqual(f?.status, "Guided", "the fresh grade raises the level above the stale value");
      assert.equal(await stored(o), f?.status, "the fresh grade's level survives the recompute");
    });
  }

  test("the lock key matches the grader's, including upper-case ids", async () => {
    const o = objs[0];
    const r = await queryOne<{ ok: boolean }>(`select grade_lock_key($1::uuid, $2::uuid) = hashtext($3) as ok`, [
      user.toUpperCase(),
      o.toUpperCase(),
      gradeLockName(user.toUpperCase(), o.toUpperCase()),
    ]);
    assert.equal(r?.ok, true);
    assert.equal(gradeLockName(user.toUpperCase(), o.toUpperCase()), `grade:${user}:${o}`);
  });
});

describe("unchanged rows are neither rewritten nor locked (FAIL-180)", () => {
  test("a recompute with nothing to change finishes while every row is locked elsewhere", async () => {
    await query(`select recompute_mastery($1)`, [user]); // all current
    const before = await query(`select objective_id, updated_at from mastery where user_id = $1 order by objective_id`, [user]);
    assert.ok(before.length >= 2);
    const holder = await client();
    await holder.query("begin");
    await holder.query(`select 1 from mastery where user_id = $1 for update`, [user]);
    const r = await client();
    await r.query(`set lock_timeout = '2s'`);
    try {
      const n = (await r.query<{ n: number }>(`select recompute_mastery($1) as n`, [user])).rows[0].n;
      assert.equal(n, 0);
      await r.query(`call recompute_mastery_batched(500, $1)`, [user]);
    } finally {
      await holder.query("rollback");
    }
    assert.deepEqual(await query(`select objective_id, updated_at from mastery where user_id = $1 order by objective_id`, [user]), before);
  });
});

describe("deploy gap: only lesson attempts are evidence (FAIL-182)", () => {
  // The review's gap.sql: a forged 'quiz' Solo success two days ago plus one
  // lesson Solo success written by the old code in the gap.
  test("a forged other-kind row does not make Transfer-ready", async () => {
    const o = objs[2];
    await attempt(o, "quiz", "What is 1+1?", "2 days");
    await attempt(o, "lesson", "What is 2+2?", "0 seconds");
    await query(`select recompute_mastery($1)`, [user]);
    // REQ-218: one lesson success is Guided until a later sitting confirms it;
    // the forged quiz row is not that confirmation (nor a second format).
    assert.equal(await stored(o), "Guided");
  });

  test("an objective with only other-kind attempts has no evidence", async () => {
    const o = objs[3];
    await attempt(o, "quiz", "q", "1 hour");
    const r = await queryOne<{ status: string }>(`select status from mastery_from_attempts($1, $2)`, [user, o]);
    assert.equal(r?.status, "Not started");
  });
});

describe("029b status checks (FAIL-119)", () => {
  test("a database without 029b's backup table is reported as missing 029b", async () => {
    const c = await client();
    await c.query("begin");
    try {
      await c.query(`drop table mastery_backup_029`);
      const s = await checkSchema(async (sql) => {
        await c.query("savepoint p");
        try {
          const rows = (await c.query<{ ok: boolean }>(sql)).rows;
          await c.query("release savepoint p");
          return rows;
        } catch (e) {
          await c.query("rollback to savepoint p");
          throw e;
        }
      });
      assert.equal(s.current, false);
      assert.deepEqual(migrationsToApply(s), ["029b_mastery_backfill.sql"]);
    } finally {
      await c.query("rollback");
    }
  });

  test("--status counts stored levels that differ from the rule", async () => {
    const runSql = async (sql: string) => query(sql);
    await query(`select recompute_mastery($1)`, [user]);
    const base = await masteryDrift(runSql);
    assert.ok(base);
    await setStale(objs[0]);
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict)
       values ($1, $2, $3, 'lesson', 'fade', 'open', 'q', 'a', 'correct')`,
      [user, unit, objs[4]]
    );
    const after = await masteryDrift(runSql);
    assert.equal(after!.differing, base!.differing + 1);
    assert.equal(after!.missing, base!.missing + 1);
    await query(`select recompute_mastery($1)`, [user]);
    assert.deepEqual(await masteryDrift(runSql), base);
  });
});
