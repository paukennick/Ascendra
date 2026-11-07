// REQ-100: the weighted cross-format mastery model (migration 031) and course
// readiness, against a real Postgres with every migration applied. Answers
// are written straight into attempts with chosen timestamps, then scored by
// mastery_detail / mastery_from_attempts -- the functions live grading uses.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { signAccessToken } from "./auth/tokens";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { GET as courseGet } from "../app/api/courses/[id]/route";

const SQL_031 = readFileSync(join(__dirname, "../supabase/migrations/031_weighted_mastery.sql"), "utf8");
const run = Date.now().toString(36);
const track = randomUUID();
const unitA = randomUUID(); // blueprint weight 70
const unitB = randomUUID(); // blueprint weight 30
const scenarioA = randomUUID();
const objsA: string[] = Array.from({ length: 10 }, () => randomUUID());
const objsB: string[] = Array.from({ length: 2 }, () => randomUUID());
const users: string[] = [];

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `mm-${run}-${users.length}@example.test`]);
  return u;
}

interface Ans {
  stage?: "fade" | "solo";
  format?: "mc" | "open";
  question?: string;
  verdict: "correct" | "partial" | "incorrect";
  ago: string;
  assist?: "hint" | "repeat" | "reveal";
  type?: string;
}
async function answer(u: string, o: string, a: Ans) {
  const unit = objsB.includes(o) ? unitB : unitA;
  await query(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict,
                           assisted, assist_reason, assessment_type, created_at)
     values ($1, $2, $3, 'lesson', $4, $5, $6, 'a', $7, $8, $9, $10, now() - $11::interval)`,
    [u, unit, o, a.stage ?? "solo", a.format ?? "open", a.question ?? `q-${randomUUID()}`, a.verdict,
     !!a.assist, a.assist ?? null, a.type ?? null, a.ago]
  );
}
async function pbq(u: string, verdict: Ans["verdict"], ago: string) {
  await query(
    `insert into attempts (user_id, unit_id, pbq_scenario_id, kind, format, question, answer, verdict, created_at)
     values ($1, $2, $3, 'pbq', 'pbq', 'PBQ', 'a', $4, now() - $5::interval)`,
    [u, unitA, scenarioA, verdict, ago]
  );
}
async function detail(u: string, o: string) {
  return queryOne<{ status: string; score: number; weighted_accuracy: number; readiness_score: number; formats: string[] }>(
    `select * from mastery_detail($1, $2)`,
    [u, o]
  );
}
const level = async (u: string, o: string) => (await detail(u, o))?.status;
const stored = async (u: string, o: string) =>
  (await queryOne<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = $2`, [u, o]))?.status;

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'MM', 'certification', null)`, [
    track,
    `MM-${run}`,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'A', 1, 70), ($3, $2, 'B', 2, 30)`, [
    unitA,
    track,
    unitB,
  ]);
  for (const [i, o] of [...objsA, ...objsB].entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [
      o,
      objsB.includes(o) ? unitB : unitA,
      `O${i}`,
      i,
    ]);
  }
  await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'S', 's', '[]', 't')`, [
    scenarioA,
    unitA,
  ]);
});

after(async () => {
  await query(`delete from mastery_backup_031 where user_id = any($1::uuid[])`, [users]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("weighted mastery model (031)", () => {
  test("one format only cannot reach Transfer-ready, however well spaced", async () => {
    const u = await newUser();
    for (const ago of ["9 days", "5 days", "1 day"]) await answer(u, objsA[0], { verdict: "correct", ago });
    const d = await detail(u, objsA[0]);
    assert.equal(d?.status, "Independent");
    assert.deepEqual(d?.formats, ["free_response"]);
  });

  test("two formats on separate days reach Transfer-ready; the same two in one sitting do not", async () => {
    const spaced = await newUser();
    await answer(spaced, objsA[1], { verdict: "correct", ago: "3 days" });
    await pbq(spaced, "correct", "1 hour");
    assert.equal(await level(spaced, objsA[1]), "Transfer-ready");

    const sitting = await newUser();
    await answer(sitting, objsA[1], { verdict: "correct", ago: "20 minutes" });
    await pbq(sitting, "correct", "10 minutes");
    assert.deepEqual((await detail(sitting, objsA[1]))?.formats, ["free_response", "performance"]);
    assert.equal(await level(sitting, objsA[1]), "Independent", "one sitting stays below the top");
  });

  test("assisted answers earn reduced credit and never count as a format", async () => {
    const plain = await newUser();
    const hinted = await newUser();
    for (const [u, assist] of [[plain, undefined], [hinted, "hint"]] as const) {
      await answer(u, objsA[2], { verdict: "incorrect", ago: "2 hours" });
      await answer(u, objsA[2], { verdict: "correct", ago: "1 hour", assist });
    }
    const p = await detail(plain, objsA[2]);
    const h = await detail(hinted, objsA[2]);
    assert.ok(h!.weighted_accuracy < p!.weighted_accuracy, `${h!.weighted_accuracy} < ${p!.weighted_accuracy}`);
    assert.equal(h?.status, "Guided");
    assert.deepEqual(h?.formats, []);
    // A repeat earns less than a hint.
    const rep = await newUser();
    await answer(rep, objsA[2], { verdict: "incorrect", ago: "2 hours", question: "same" });
    await answer(rep, objsA[2], { verdict: "correct", ago: "1 hour", question: "same", assist: "repeat" });
    assert.ok((await detail(rep, objsA[2]))!.weighted_accuracy < h!.weighted_accuracy);
  });

  test("a correct answer after a gap counts more than a same-session one", async () => {
    const massed = await newUser();
    const spaced = await newUser();
    await answer(massed, objsA[3], { verdict: "incorrect", ago: "3 hours" });
    await answer(massed, objsA[3], { verdict: "correct", ago: "2 hours" });
    await answer(spaced, objsA[3], { verdict: "incorrect", ago: "4 days 3 hours" });
    await answer(spaced, objsA[3], { verdict: "correct", ago: "4 days 2 hours" });
    await answer(spaced, objsA[3], { verdict: "correct", ago: "2 hours" });
    await answer(massed, objsA[3], { verdict: "correct", ago: "1 hour" });
    const m = await detail(massed, objsA[3]);
    const s = await detail(spaced, objsA[3]);
    assert.ok(s!.weighted_accuracy > m!.weighted_accuracy, `${s!.weighted_accuracy} > ${m!.weighted_accuracy}`);
  });

  test("old evidence decays: an old miss weighs less than a recent one, an old success less than a recent miss", async () => {
    const oldMiss = await newUser();
    const newMiss = await newUser();
    await answer(oldMiss, objsA[4], { verdict: "incorrect", ago: "180 days" });
    await answer(newMiss, objsA[4], { verdict: "incorrect", ago: "1 day" });
    for (const u of [oldMiss, newMiss]) await answer(u, objsA[4], { verdict: "correct", ago: "1 hour" });
    const a = await detail(oldMiss, objsA[4]);
    const b = await detail(newMiss, objsA[4]);
    assert.ok(a!.weighted_accuracy > b!.weighted_accuracy);
    assert.equal(a?.status, "Independent", "a learner who recovered is not held back by a six-month-old miss");

    const faded = await newUser();
    await answer(faded, objsA[5], { verdict: "correct", ago: "200 days" });
    await answer(faded, objsA[5], { verdict: "incorrect", ago: "2 days" });
    await answer(faded, objsA[5], { verdict: "incorrect", ago: "1 day" });
    const f = await detail(faded, objsA[5]);
    assert.ok(f!.weighted_accuracy < 0.1);
    assert.equal(f?.status, "Needs review");
  });

  test("the guided step and multiple choice alone never lift above Guided", async () => {
    const u = await newUser();
    await answer(u, objsA[6], { stage: "fade", verdict: "correct", ago: "3 days" });
    await answer(u, objsA[6], { stage: "fade", format: "mc", verdict: "correct", ago: "2 days" });
    await answer(u, objsA[6], { format: "mc", verdict: "correct", ago: "1 day", assist: "hint" });
    assert.equal(await level(u, objsA[6]), "Guided");
  });

  test("a new assessment type slots in by name; an unknown name is refused", async () => {
    const u = await newUser();
    await answer(u, objsA[7], { verdict: "correct", ago: "2 days", type: "explain_back" });
    await answer(u, objsA[7], { verdict: "correct", ago: "1 hour" });
    assert.deepEqual((await detail(u, objsA[7]))?.formats, ["explain_back", "free_response"]);
    assert.equal(await level(u, objsA[7]), "Transfer-ready");
    await assert.rejects(answer(u, objsA[7], { verdict: "correct", ago: "1 hour", type: "made_up_type" }), /foreign key/);
  });

  test("a PBQ alone gives no level; a graded PBQ updates the unit's studied objectives live", async () => {
    const u = await newUser();
    await pbq(u, "correct", "1 hour");
    assert.equal(await detail(u, objsA[8]), null);
    await answer(u, objsA[8], { verdict: "correct", ago: "3 days" });
    await query(`select recompute_mastery($1)`, [u]);
    assert.equal(await stored(u, objsA[8]), "Transfer-ready", "the earlier PBQ counts once there is direct evidence");

    const v = await newUser();
    await answer(v, objsA[9], { verdict: "correct", ago: "2 days" });
    await query(`select recompute_mastery($1)`, [v]);
    assert.equal(await stored(v, objsA[9]), "Independent");
    await recordAttemptAndUpdateMastery({
      userId: v,
      unitId: unitA,
      pbqScenarioId: scenarioA,
      kind: "pbq",
      format: "pbq",
      question: "PBQ",
      answer: "a",
      verdict: "correct",
    });
    assert.equal(await stored(v, objsA[9]), "Transfer-ready");
    assert.equal(await stored(v, objsA[8]), undefined, "an unstudied objective gets no row");
  });
});

describe("031 re-run", () => {
  test("is idempotent, keeps tuned values and the original 031 backup, and never touches the 029 backup", async () => {
    const u = await newUser();
    await answer(u, objsB[0], { verdict: "correct", ago: "2 days" });
    await query(`select recompute_mastery($1)`, [u]);
    // Runs on its own connection inside a transaction that is rolled back, so
    // the tuning below is never visible to tests running alongside.
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: sslOption() });
    await c.connect();
    try {
      await c.query("begin");
      const snap = async () => ({
        mastery: (await c.query(`select objective_id, status, score_0_4, evidence, updated_at from mastery where user_id = $1`, [u])).rows,
        b029: (await c.query(`select * from mastery_backup_029 order by mastery_id`)).rows,
        b031: (await c.query(`select * from mastery_backup_031 where user_id = $1 order by mastery_id`, [u])).rows,
      });
      await c.query(SQL_031);
      const first = await snap();
      assert.equal(first.b031.length, 1);
      assert.equal(first.b031[0].status, "Independent");
      // Tune a readiness value (no mastery level depends on it, so the file's
      // global recompute below rewrites nobody else's rows), and knock this
      // learner's stored level out of date.
      await c.query(`update mastery_model_params set value = 0.95 where name = 'readiness_ready_coverage'`);
      await c.query(`update mastery set status = 'Guided', score_0_4 = 2 where user_id = $1`, [u]);
      await c.query(SQL_031);
      const p = await c.query(`select value from mastery_model_params where name = 'readiness_ready_coverage'`);
      assert.equal(Number(p.rows[0].value), 0.95, "a re-run does not overwrite a tuned value");
      const second = await snap();
      assert.deepEqual(second.b029, first.b029, "029 backup untouched");
      assert.deepEqual(second.b031, first.b031, "031 backup keeps its first values");
      const level = (rows: Array<Record<string, unknown>>) => rows.map(({ updated_at: _ignored, ...r }) => r);
      assert.deepEqual(level(second.mastery), level(first.mastery), "the re-run recomputed the stale level back");
      const again = await snap();
      await c.query(SQL_031);
      assert.deepEqual(await snap(), again, "a third run changes nothing");
    } finally {
      await c.query("rollback");
      await c.end();
    }
  });
});

describe("course readiness (blueprint-weighted, coverage-gated)", () => {
  const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` });
  async function readiness(u: string) {
    const res = await courseGet(new Request("http://t/x", { headers: auth(u) }), { params: Promise.resolve({ id: track }) });
    assert.equal(res.status, 200);
    return ((await res.json()) as { readiness: Record<string, any> }).readiness;
  }

  test("no evidence reads as no evidence, not 0% ready", async () => {
    const r = await readiness(await newUser());
    assert.equal(r.status, "no_evidence");
    assert.equal(r.blueprintWeighted, true);
    assert.equal(r.objectives, 12);
  });

  test("high accuracy on a few objectives is not enough evidence; weights come from the blueprint", async () => {
    const u = await newUser();
    await answer(u, objsB[0], { verdict: "correct", ago: "1 day" });
    await answer(u, objsB[1], { verdict: "correct", ago: "1 day" });
    const r = await readiness(u);
    assert.equal(r.accuracyPercent, 100);
    assert.equal(r.coveragePercent, 30, "unit B is 30% of the blueprint");
    assert.equal(r.status, "not_enough_evidence");
    // Each objective has one free response (weight 1 of the 2 needed for full credit): 0.3 x 0.5.
    assert.equal(r.readinessPercent, 15);
    assert.equal(r.focusUnitId, unitA, "the heaviest gap is the suggested focus");
    const b = r.domains.find((d: { unitId: string }) => d.unitId === unitB);
    assert.deepEqual([b.practiced, b.objectives, b.coveragePercent], [2, 2, 100]);
  });
});
