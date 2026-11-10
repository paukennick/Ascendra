// REQ-128: integration tests against a real Postgres with every migration
// applied (CI's "Database" job; locally: DATABASE_URL=... PGSSLMODE=disable
// npm run test:db). Pure-logic tests stay in lib/*.test.ts and need no DB.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { ownerQuery, closeOwner } from "./test-owner";
import { checkSchema, migrationsToApply } from "./schema-status";
import { trackProgressLateral, unitMasteryLateral } from "./progress-sql";
import { buildAccountExport, EXPORT_SECTIONS } from "./account-export";
import { recordAttemptAndUpdateMastery, isDuplicateClientAttempt, findClientAttempt } from "./grading-service";

const user = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const objectives = Array.from({ length: 10 }, () => randomUUID());
const run = Date.now().toString(36);

before(async () => {
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `it-${run}@example.test`]);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'IT track', 'certification', $3)`,
    [track, `IT-${run}`, user]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'IT unit', 1)`, [unit, track]);
  for (const [i, o] of objectives.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `O${i}`, i]);
  }
});

after(async () => {
  await query(`delete from app_users where id = $1`, [user]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
  await closeOwner();
});

describe("schema status", () => {
  test("a database with every migration applied is current", async () => {
    const s = await checkSchema((sql) => query<{ ok: boolean }>(sql));
    assert.deepEqual(s.missing, []);
    assert.equal(s.current, true);
    assert.deepEqual(migrationsToApply(s), []);
  });
});

describe("progress counts", () => {
  test("arrive as numbers, so 9 of 10 mastered is not 'complete'", async () => {
    for (const o of objectives.slice(0, 9)) {
      await query(
        `insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Independent', 3)`,
        [user, o]
      );
    }
    const t = await queryOne<Record<string, unknown>>(
      `select vp.* from subject_tracks st ${trackProgressLateral("$1")} where st.id = $2`,
      [user, track]
    );
    const u = await queryOne<Record<string, unknown>>(
      `select vm.* from course_units cu ${unitMasteryLateral("$1")} where cu.id = $2`,
      [user, unit]
    );
    for (const [k, v] of Object.entries({ ...t, ...u })) assert.equal(typeof v, "number", `${k} is ${typeof v}`);
    assert.equal(u!.total_objectives, 10);
    assert.equal(u!.mastered_objectives, 9);
    assert.ok((u!.mastered_objectives as number) < (u!.total_objectives as number));
    assert.equal(t!.percent_complete, 90);
  });
});

describe("account export", () => {
  test("every section holds rows from its own table", async () => {
    await query(`insert into course_favorites (user_id, track_id) values ($1, $2)`, [user, track]);
    const out = await buildAccountExport(user, (sql, params) => query(sql, params));
    for (const k of Object.keys(EXPORT_SECTIONS)) assert.ok(k in out, `missing section ${k}`);
    const fav = out.favorites as Record<string, unknown>[];
    const mastery = out.mastery as Record<string, unknown>[];
    assert.equal(fav.length, 1);
    assert.equal(fav[0].track_id, track);
    assert.equal("status" in fav[0], false);
    assert.ok(mastery.length >= 9 && mastery.every((m) => "status" in m && m.user_id === user));
    assert.equal((out.profile as { id: string }).id, user);
  });

  // FAIL-187: hint reveals (migration 029) are the learner's data too.
  test("includes the learner's Solo hint reveals", async () => {
    await query(`insert into lesson_hint_reveals (user_id, objective_id, item_key) values ($1, $2, $3)`, [
      user,
      objectives[0],
      "0".repeat(32),
    ]);
    const out = await buildAccountExport(user, (sql, params) => query(sql, params));
    const reveals = out.lessonHintReveals as Record<string, unknown>[];
    assert.equal(reveals.length, 1);
    assert.equal(reveals[0].objective_id, objectives[0]);
    assert.equal(reveals[0].user_id, user);
  });
});

describe("grading writes", () => {
  const o = objectives[9];
  const base = { userId: user, objectiveId: o, unitId: unit, kind: "lesson" as const, stage: "solo", question: "Q", answer: "A" };

  test("a wrong answer records attempt, mastery and a review entry together", async () => {
    await recordAttemptAndUpdateMastery({ ...base, format: "mc", verdict: "incorrect", clientAttemptId: `it-${run}-1` });
    assert.ok(await findClientAttempt(user, `it-${run}-1`));
    assert.ok(await queryOne(`select 1 from mastery where user_id = $1 and objective_id = $2`, [user, o]));
    assert.ok(await queryOne(`select 1 from error_log where user_id = $1 and objective_id = $2`, [user, o]));
  });

  test("a failure after the attempt insert rolls the attempt back", async () => {
    const fn = `it_boom_${run}`;
    await ownerQuery(`create function ${fn}() returns trigger language plpgsql as $$ begin raise exception 'forced'; end $$`);
    await ownerQuery(`create trigger ${fn} before update on mastery for each row execute function ${fn}()`);
    try {
      await assert.rejects(
        recordAttemptAndUpdateMastery({ ...base, format: "mc", verdict: "correct", clientAttemptId: `it-${run}-2` })
      );
      assert.equal(await findClientAttempt(user, `it-${run}-2`), null, "half-written attempt left behind");
    } finally {
      await ownerQuery(`drop trigger ${fn} on mastery`);
      await ownerQuery(`drop function ${fn}()`);
    }
  });

  test("the same client id twice is a duplicate, not a second attempt", async () => {
    await recordAttemptAndUpdateMastery({ ...base, format: "mc", verdict: "correct", clientAttemptId: `it-${run}-3` });
    await assert.rejects(
      recordAttemptAndUpdateMastery({ ...base, format: "mc", verdict: "correct", clientAttemptId: `it-${run}-3` }),
      (e) => isDuplicateClientAttempt(e)
    );
  });

  test("concurrent grades on one objective all land", async () => {
    const before = (await queryOne<{ n: number }>(
      `select count(*) as n from attempts where user_id = $1 and objective_id = $2`, [user, o]))!.n;
    await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        recordAttemptAndUpdateMastery({ ...base, format: "open", verdict: "correct", clientAttemptId: `it-${run}-c${i}` })
      )
    );
    const after = (await queryOne<{ n: number }>(
      `select count(*) as n from attempts where user_id = $1 and objective_id = $2`, [user, o]))!.n;
    assert.equal(after - before, 6);
  });
});
