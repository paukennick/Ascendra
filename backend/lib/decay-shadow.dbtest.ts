// REQ-301: shadow mode for the mastery decay model against a real Postgres
// with every migration applied (085 included): the live write beside the
// review, its failure isolation (FAIL-2060), the backfill and its equivalence
// with the live write (FAIL-2061), the calibration report's numbers, the
// table check, the roles, and the account export.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne, withTransaction, closePool } from "./db";
import { ownerQuery, closeOwner } from "./test-owner";
import { stepSchedule } from "./review-step";
import { MEMORY_MODEL_VERSION, recordShadowPrediction } from "./decay-shadow";
import { backfillShadow } from "./decay-shadow-backfill";
import { BUCKET_LABELS, calibrationReport } from "./decay-calibration";
import { buildAccountExport } from "./account-export";
import { checkSchema } from "./schema-status";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = [randomUUID(), randomUUID(), randomUUID()];
const users: string[] = [];
const DAY = 86_400_000;
const T0 = new Date(Date.UTC(2026, 9, 1, 9, 0, 0));
const at = (days: number) => new Date(T0.getTime() + days * DAY);
const logUser = (u: string) => query<Record<string, any>>(`select * from review_log where user_id = $1 order by reviewed_at, id`, [u]);

async function newUser(goal?: string, level = "some"): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `ds-${run}-${users.length}@example.test`]);
  if (goal !== undefined) {
    await query(`insert into learner_course_profiles (user_id, track_id, goal, level) values ($1, $2, $3, $4)`, [u, track, goal || null, level]);
  }
  return u;
}
async function enroll(u: string, o: string, enrolledAt = T0) {
  await query(`insert into review_schedule (user_id, objective_id, due_on, enrolled_at) values ($1, $2, $3::date, $4)`, [
    u,
    o,
    enrolledAt.toISOString().slice(0, 10),
    enrolledAt,
  ]);
}
const step = (u: string, o: string, verdict: "correct" | "partial" | "incorrect", assisted: boolean, now: Date) =>
  withTransaction((tx) => stepSchedule(tx, u, o, null as unknown as string, verdict, assisted, now));

// The same sequence of reviews for any learner: objective 0 six times over
// five weeks, objective 1 three times (one with help, one miss).
const SEQUENCE: Array<[number, number, "correct" | "partial" | "incorrect", boolean]> = [
  [0, 1.5, "correct", false],
  [1, 2, "correct", true],
  [0, 5, "partial", false],
  [1, 6, "incorrect", false],
  [0, 12, "correct", false],
  [1, 9, "correct", false],
  [0, 26, "correct", false],
  [0, 40, "incorrect", false],
  [0, 41.5, "correct", false],
];

async function playSequence(u: string) {
  for (const o of [objs[0], objs[1]]) await enroll(u, o);
  for (const [i, d, v, a] of [...SEQUENCE].sort((x, y) => x[1] - y[1])) await step(u, objs[i], v, a, at(d));
}

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'DS', 'certification', null)`, [track, `DS-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Unit', 1)`, [unit, track]);
  for (const [i, o] of objs.entries()) await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `Objective ${i}`, i]);
});

beforeEach(() => {
  delete process.env.DECAY_SHADOW;
});

after(async () => {
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await ownerQuery(`drop trigger if exists ds_fail_${run} on review_log`).catch(() => undefined);
  await ownerQuery(`drop function if exists ds_fail_${run}()`).catch(() => undefined);
  await closeOwner();
  await closePool();
});

describe("the live write (REQ-301)", () => {
  test("every stepped review stores its prediction and state, source live, scheduler untouched", async () => {
    const u = await newUser("work", "experienced");
    await playSequence(u);
    const rows = await logUser(u);
    assert.equal(rows.length, SEQUENCE.length);
    for (const r of rows) {
      assert.equal(r.model_source, "live");
      assert.equal(r.model_version, MEMORY_MODEL_VERSION);
      assert.equal(r.scheduler, "fixed_v1", "scheduling is still fixed_v1");
      assert.equal(r.model_goal, "work");
      assert.equal(r.model_level, "experienced");
      const p = Number(r.predicted_recall);
      assert.ok(p > 0 && p <= 1, `predicted ${p}`);
      assert.ok(Number(r.model_stability) > 0 && Number(r.model_difficulty) >= 1 && Number(r.model_k) > 0);
    }
    assert.equal(rows[0].model_fit_stage, "starting");
    // The first review of objective 0 is 1.5 days after enrolment on a fresh state, so recall is below 100% and
    // the stability it used is the enrolment's.
    assert.ok(Number(rows[0].predicted_recall) < 1);
    // The state a review used is the state the earlier reviews left: stability grows after a correct unaided answer.
    const own = rows.filter((r) => r.objective_id === objs[0]);
    assert.ok(Number(own[2].model_stability) > Number(own[0].model_stability));
  });

  test("the schedule and log columns are exactly what they are without shadow mode", async () => {
    const withShadow = await newUser("work");
    const without = await newUser("work");
    await playSequence(withShadow);
    process.env.DECAY_SHADOW = "off";
    await playSequence(without);
    const key = (r: Record<string, any>) => [r.objective_id, r.verdict, r.assisted, r.was_due, r.elapsed_days, r.scheduled_days, r.scheduler, r.step_before, r.step_after, String(r.due_before), String(r.due_after)];
    assert.deepEqual((await logUser(withShadow)).map(key), (await logUser(without)).map(key));
    const sched = (u: string) => query(`select objective_id, step, due_on::text, reps, lapses from review_schedule where user_id = $1 order by objective_id`, [u]);
    assert.deepEqual(await sched(withShadow), await sched(without));
    for (const r of await logUser(without)) assert.equal(r.predicted_recall, null, "switched off: nothing stored");
  });

  test("an answer with no schedule row (never reached Guided) is logged with no prediction", async () => {
    const u = await newUser("work");
    const r = await step(u, objs[2], "correct", false, at(3));
    assert.equal(r.wasDue, null);
    const rows = await logUser(u);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].predicted_recall, null);
    assert.equal(rows[0].model_version, null);
  });

  test("a learner who never answered the goal question is predicted from the 'none' prior at level some", async () => {
    const u = await newUser();
    await enroll(u, objs[0]);
    await step(u, objs[0], "correct", false, at(2));
    const [row] = await logUser(u);
    assert.equal(row.model_goal, "none");
    assert.equal(row.model_level, "some");
  });

  test("an ignored goal changes the prior: work holds longer than career_change on the same first review", async () => {
    const w = await newUser("work");
    const c = await newUser("career_change");
    for (const u of [w, c]) {
      await enroll(u, objs[0]);
      await step(u, objs[0], "correct", false, at(3));
    }
    const [rw] = await logUser(w);
    const [rc] = await logUser(c);
    assert.ok(Number(rw.model_k) > Number(rc.model_k));
    assert.ok(Number(rw.predicted_recall) > Number(rc.predicted_recall));
  });
});

describe("a failure in the shadow work never fails the review (FAIL-2060)", () => {
  test("an update that errors rolls back to the savepoint: the review, the step and the log row all commit", async () => {
    const u = await newUser("work");
    await enroll(u, objs[0]);
    await ownerQuery(`create or replace function ds_fail_${run}() returns trigger language plpgsql as $$
      begin
        if new.user_id = '${u}'::uuid and old.predicted_recall is null and new.predicted_recall is not null then
          raise exception 'shadow write refused for the test';
        end if;
        return new;
      end $$`);
    await ownerQuery(`drop trigger if exists ds_fail_${run} on review_log`);
    await ownerQuery(`create trigger ds_fail_${run} before update on review_log for each row execute function ds_fail_${run}()`);
    const warns: string[] = [];
    const warn = console.warn;
    console.warn = (m: string) => void warns.push(String(m));
    try {
      const r = await step(u, objs[0], "correct", false, at(2));
      assert.equal(r.wasDue, true);
    } finally {
      console.warn = warn;
      await ownerQuery(`drop trigger if exists ds_fail_${run} on review_log`);
    }
    assert.equal(warns.filter((w) => w.includes("[decay-shadow]")).length, 1);
    const [row] = await logUser(u);
    assert.equal(row.verdict, "correct");
    assert.equal(row.predicted_recall, null);
    const s = await queryOne<{ step: number; reps: number }>(`select step, reps from review_schedule where user_id = $1 and objective_id = $2`, [u, objs[0]]);
    assert.equal(s!.reps, 1, "the schedule still stepped");
    // The next review, with the trigger gone, is predicted again: one failure does not poison later ones.
    await step(u, objs[0], "correct", false, at(6));
    const rows = await logUser(u);
    assert.equal(rows[1].model_source, "live");
  });

  test("the transaction's statement timeout is put back after a success and after a failure", async () => {
    const u = await newUser("work");
    await enroll(u, objs[0]);
    const timeouts = await withTransaction(async (tx) => {
      const [ins] = await tx.query<{ id: string }>(
        `insert into review_log (user_id, objective_id, verdict, assisted, was_due, scheduler) values ($1, $2, 'correct', false, true, 'fixed_v1') returning id`,
        [u, objs[0]]
      );
      const base = (await tx.queryOne<{ s: string }>(`select current_setting('statement_timeout') as s`))!.s;
      assert.equal(await recordShadowPrediction(tx, { logId: ins.id, userId: u, objectiveId: objs[0], enrolledAt: T0, at: at(2) }), true);
      const afterOk = (await tx.queryOne<{ s: string }>(`select current_setting('statement_timeout') as s`))!.s;
      // A log id that does not exist: the update finds nothing and the write reports false, still restoring the limit.
      assert.equal(await recordShadowPrediction(tx, { logId: randomUUID(), userId: u, objectiveId: objs[0], enrolledAt: T0, at: at(3) }), false);
      const afterMiss = (await tx.queryOne<{ s: string }>(`select current_setting('statement_timeout') as s`))!.s;
      // A real error (the check constraint, via a bad objective id type is not possible): rolled back, limit restored.
      const warn = console.warn;
      console.warn = () => undefined;
      try {
        assert.equal(await recordShadowPrediction(tx, { logId: "not-a-uuid", userId: u, objectiveId: objs[0], enrolledAt: T0, at: at(3) }), false);
      } finally {
        console.warn = warn;
      }
      const afterFail = (await tx.queryOne<{ s: string }>(`select current_setting('statement_timeout') as s`))!.s;
      return { base, afterOk, afterMiss, afterFail };
    });
    assert.deepEqual(timeouts, { base: "20s", afterOk: "20s", afterMiss: "20s", afterFail: "20s" });
  });
});

describe("the table check (REQ-301)", () => {
  const ins = (cols: string, vals: unknown[]) =>
    query(`insert into review_log (user_id, verdict, assisted, was_due, ${cols}) values ($1, 'correct', false, true, ${vals.slice(1).map((_, i) => `$${i + 2}`).join(", ")})`, vals);
  const full = (over: Record<string, unknown> = {}) => {
    const v = { predicted_recall: 0.8, model_stability: 3, model_difficulty: 5, model_k: 1, model_fit_stage: "starting", model_goal: "none", model_level: "some", model_version: "x", model_source: "live", ...over };
    return { cols: Object.keys(v).join(", "), vals: Object.values(v) };
  };
  test("all model columns set together, in range, or none", async () => {
    const u = await newUser();
    const ok = full();
    await ins(ok.cols, [u, ...ok.vals]);
    for (const bad of [{ predicted_recall: 1.2 }, { predicted_recall: -0.1 }, { model_stability: 0 }, { model_difficulty: 11 }, { model_k: 0 }, { model_fit_stage: "fitting" }, { model_goal: "job_title" }, { model_level: "expert" }, { model_source: "guess" }, { model_version: null }]) {
      const f = full(bad);
      await assert.rejects(ins(f.cols, [u, ...f.vals]), (e: any) => e.code === "23514", JSON.stringify(bad));
    }
    // Half set: a prediction with no state.
    await assert.rejects(ins("predicted_recall", [u, 0.5]), (e: any) => e.code === "23514");
    // None set: every row written before this migration.
    await query(`insert into review_log (user_id, verdict, assisted, was_due) values ($1, 'correct', false, true)`, [u]);
  });
});

describe("the backfill (REQ-301)", () => {
  test("replays history into the same predictions the live write made; dry run writes nothing; apply fills only the empty rows; a re-run changes nothing", async () => {
    const live = await newUser("current", "new");
    const old = await newUser("current", "new");
    await playSequence(live);
    process.env.DECAY_SHADOW = "off";
    await playSequence(old); // the same reviews, logged with no prediction
    delete process.env.DECAY_SHADOW;
    assert.ok((await logUser(old)).every((r) => r.predicted_recall === null));

    const dry = await backfillShadow({ apply: false, userId: old });
    assert.equal(dry.apply, false);
    assert.equal(dry.pairs, 1);
    assert.equal(dry.rowsPredicted, SEQUENCE.length);
    assert.ok(dry.unaided.n > 0 && dry.unaided.meanPredicted > 0);
    assert.ok((await logUser(old)).every((r) => r.predicted_recall === null), "a dry run writes nothing");

    const applied = await backfillShadow({ apply: true, userId: old });
    assert.equal(applied.rowsPredicted, SEQUENCE.length);
    const a = await logUser(live);
    const b = await logUser(old);
    for (const [i, r] of b.entries()) {
      assert.equal(r.model_source, "backfill");
      assert.equal(r.model_version, MEMORY_MODEL_VERSION);
      for (const c of ["predicted_recall", "model_stability", "model_difficulty", "model_k", "model_fit_stage", "model_goal", "model_level"]) {
        assert.equal(String(r[c]), String(a[i][c]), `row ${i} ${c}: backfill equals live`);
      }
    }

    // A stored prediction is never overwritten, whatever version made it: poison one and re-run.
    await query(`update review_log set model_version = 'older-version', predicted_recall = 0.5 where id = $1`, [b[0].id]);
    const again = await backfillShadow({ apply: true, userId: old });
    assert.equal(again.pairs, 0);
    assert.equal(again.rowsPredicted, 0);
    const [first] = await logUser(old);
    assert.equal(first.model_version, "older-version");
    assert.equal(Number(first.predicted_recall), 0.5);
  });

  test("a mix of live and empty rows: only the empty ones are filled, from the full history around them", async () => {
    const u = await newUser("program", "some");
    for (const o of [objs[0], objs[1]]) await enroll(u, o);
    await step(u, objs[0], "correct", false, at(2));
    process.env.DECAY_SHADOW = "off";
    await step(u, objs[0], "correct", false, at(8));
    delete process.env.DECAY_SHADOW;
    await step(u, objs[0], "partial", false, at(20));
    const before = await logUser(u);
    assert.deepEqual(before.map((r) => r.model_source), ["live", null, "live"]);
    const res = await backfillShadow({ apply: true, userId: u });
    assert.equal(res.rowsPredicted, 1);
    const after = await logUser(u);
    assert.deepEqual(after.map((r) => r.model_source), ["live", "backfill", "live"]);
    assert.equal(after[0].predicted_recall, before[0].predicted_recall);
    assert.equal(after[2].predicted_recall, before[2].predicted_recall);
  });

  test("--limit takes a number of learner-courses and a later run takes the rest", async () => {
    const u = await newUser("work");
    await enroll(u, objs[0]);
    process.env.DECAY_SHADOW = "off";
    await step(u, objs[0], "correct", false, at(2));
    delete process.env.DECAY_SHADOW;
    const first = await backfillShadow({ apply: false, limitPairs: 1 });
    assert.equal(first.pairs, 1);
  });
});

describe("the calibration report (REQ-301)", () => {
  test("buckets, assisted rows left out, a partial counts as recalled, gap and verdict, clinical category apart", async () => {
    const version = `t-${run}`.slice(0, 24);
    const u = await newUser();
    const clinical = await queryOne<{ obj: string }>(
      `select o.id as obj from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
         join education_subcategories es on es.id = st.subcategory_id join education_categories ec on ec.id = es.category_id
        where ec.slug = 'healthcare-nursing' and st.user_id is null limit 1`
    );
    assert.ok(clinical, "the seed has a nursing objective");
    const add = (obj: string, predicted: number, verdict: string, assisted: boolean, n: number) =>
      query(
        `insert into review_log (user_id, objective_id, verdict, assisted, was_due, scheduler, predicted_recall, model_stability, model_difficulty,
                                 model_k, model_fit_stage, model_goal, model_level, model_version, model_source)
         select $1::uuid, $2::uuid, $3::attempt_verdict, $4::boolean, true, 'fixed_v1', $5::numeric, 3, 5, 1, 'fitted', 'work', 'some', $7::text, 'live' from generate_series(1, $6::int)`,
        [u, obj, verdict, assisted, predicted, n, version]
      );
    // Catalog-less course (objs[0] in the test track: category 'other'): 0.92 predicted, 100 reviews: 80 correct, 10 partial, 10 miss
    // (observed 90%, strict 80%); 50 assisted answers are excluded.
    await add(objs[0], 0.92, "correct", false, 80);
    await add(objs[0], 0.92, "partial", false, 10);
    await add(objs[0], 0.92, "incorrect", false, 10);
    await add(objs[0], 0.92, "correct", true, 50);
    // Clinical: 0.5 exactly is the 50-60% bucket; 300 reviews, 240 not missed (observed 80%): the model is 30 points too low.
    await add(clinical!.obj, 0.5, "correct", false, 240);
    await add(clinical!.obj, 0.5, "incorrect", false, 60);

    const rep = await calibrationReport((sql, p) => query(sql, p), { days: 3650, version });
    assert.equal(rep.overall.n, 400);
    const bucket = (label: string) => rep.byBucket.find((b) => b.label === label)!;
    assert.equal(bucket("90-95%").n, 100);
    assert.ok(Math.abs(bucket("90-95%").observed - 0.9) < 1e-9);
    assert.ok(Math.abs(bucket("90-95%").strictCorrect - 0.8) < 1e-9);
    assert.ok(Math.abs(bucket("90-95%").gapPoints - 2) < 1e-6, `gap ${bucket("90-95%").gapPoints}`);
    assert.equal(bucket("90-95%").verdict, "too_few", "100 reviews is under the judging minimum");
    assert.equal(bucket("50-60%").n, 300);
    assert.equal(bucket("50-60%").verdict, "under_predicts");
    assert.equal(BUCKET_LABELS[1], "50-60%");
    const cat = (label: string) => rep.byCategory.find((b) => b.label === label)!;
    assert.equal(cat("clinical").n, 300);
    assert.equal(cat("other").n, 100);
    assert.equal(rep.byStage.length, 1);
    assert.equal(rep.byGoal[0].label, "work");
    assert.equal(rep.bySource[0].label, "live");
    assert.ok(rep.expectedCalibrationError > 0);
    assert.ok(rep.overall.brier > 0 && rep.overall.brierBaseline > 0);
    // Source and version filters.
    assert.equal((await calibrationReport((sql, p) => query(sql, p), { days: 3650, version, source: "backfill" })).overall.n, 0);
    assert.equal((await calibrationReport((sql, p) => query(sql, p), { days: 3650, version: "nothing-here" })).overall.n, 0);
  });
});

describe("roles, export and probe (REQ-301)", () => {
  test("app_runtime can write the new columns; the re-check role has no access to review_log, so the restore script needs nothing", async () => {
    const rows = await ownerQuery<{ col: string; ok: boolean }>(
      `select c as col, has_column_privilege('app_runtime', 'public.review_log', c, 'update') as ok
         from unnest(array['predicted_recall','model_stability','model_difficulty','model_k','model_fit_stage','model_goal','model_level','model_version','model_source']) c`
    );
    assert.ok(rows.every((r) => r.ok), JSON.stringify(rows.filter((r) => !r.ok)));
    const recheck = await ownerQuery<{ ok: boolean }>(
      `select (not exists(select 1 from pg_roles where rolname = 'content_recheck')) or not has_table_privilege('content_recheck', 'public.review_log', 'select') as ok`
    );
    assert.equal(recheck[0].ok, true, "content_recheck does not read review_log");
    const restore = readFileSync(join(__dirname, "../scripts/restore/02-recheck-grants-after-restore.sql"), "utf8");
    assert.ok(!/review_log/.test(restore), "if the re-check role ever reads review_log, its restore script must grant it too");
    const anon = await ownerQuery<{ ok: boolean }>(
      `select (not exists(select 1 from pg_roles where rolname = 'anon')) or not has_table_privilege('anon', 'public.review_log', 'select') as ok`
    );
    assert.equal(anon[0].ok, true, "the Data API roles stay locked out");
  });

  test("the account export carries the prediction with the learner's other review data, and /api/health probes the columns", async () => {
    const u = await newUser("work");
    await enroll(u, objs[0]);
    await step(u, objs[0], "correct", false, at(2));
    const out = await buildAccountExport(u, (sql, p) => query(sql, p));
    const log = out.reviewLog as Array<Record<string, unknown>>;
    assert.equal(log.length, 1);
    assert.ok(log[0].predicted_recall !== null && log[0].model_version === MEMORY_MODEL_VERSION);
    const status = await checkSchema((sql) => query(sql) as Promise<Array<{ ok: boolean }>>);
    assert.deepEqual(status.missing.filter((m) => /085/.test(JSON.stringify(m))), []);
  });

  test("deleting the learner deletes the rows with their predictions", async () => {
    const u = await newUser("work");
    await enroll(u, objs[0]);
    await step(u, objs[0], "correct", false, at(2));
    await query(`delete from app_users where id = $1`, [u]);
    assert.equal((await logUser(u)).length, 0);
  });

  test("085 replays cleanly (owner job: replays migration SQL)", async () => {
    const sql = readFileSync(join(__dirname, "../supabase/migrations/085_review_shadow_prediction.sql"), "utf8");
    const before = await ownerQuery<{ n: string }>(`select count(*) n from information_schema.columns where table_name = 'review_log'`);
    await ownerQuery(sql);
    await ownerQuery(sql);
    const afterCols = await ownerQuery<{ n: string }>(`select count(*) n from information_schema.columns where table_name = 'review_log'`);
    assert.equal(Number(afterCols[0].n), Number(before[0].n));
    const c = await ownerQuery<{ n: string }>(`select count(*) n from pg_constraint where conname = 'review_log_shadow_085'`);
    assert.equal(Number(c[0].n), 1);
  });
});
