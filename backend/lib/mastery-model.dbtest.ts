// REQ-100: the weighted cross-format mastery model (migration 031) and course
// readiness, against a real Postgres with every migration applied. Answers
// are written straight into attempts with chosen timestamps, then scored by
// mastery_detail / mastery_from_attempts -- the functions live grading uses.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { recordStudyNoticeAcceptance } from "./study-notice";
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
import { checkSchema, migrationsToApply } from "./schema-status";

const MIGRATIONS = join(__dirname, "../supabase/migrations");
const SQL_031 = readFileSync(join(MIGRATIONS, "031_weighted_mastery.sql"), "utf8");
const SQL_031B = readFileSync(join(MIGRATIONS, "031b_weighted_mastery_backfill.sql"), "utf8");
// 031 then 031b, as the runner applies them (here inside the caller's transaction).
async function migrate031(c: Client) {
  await c.query(SQL_031);
  await c.query(SQL_031B);
}
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
  await recordStudyNoticeAcceptance(u); // REQ-205: model routes need the notice
  return u;
}

interface Ans {
  stage?: "fade" | "solo";
  format?: "mc" | "open";
  question?: string;
  verdict: "correct" | "partial" | "incorrect";
  ago: string;
  assist?: "hint" | "repeat" | "reveal" | "retry";
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
    // REQ-117 (045): the second format is a spaced explain-back (a unit PBQ
    // no longer counts as a format, FAIL-340), 72 h+ after the first win.
    const spaced = await newUser();
    await answer(spaced, objsA[1], { verdict: "correct", ago: "4 days" });
    await answer(spaced, objsA[1], { verdict: "correct", ago: "1 hour", type: "explain_back" });
    assert.equal(await level(spaced, objsA[1]), "Transfer-ready");
    const withPbq = await newUser();
    await answer(withPbq, objsA[1], { verdict: "correct", ago: "4 days" });
    await answer(withPbq, objsA[1], { verdict: "correct", ago: "3 days" }); // REQ-218: the later-sitting confirmation
    await pbq(withPbq, "correct", "1 hour");
    assert.deepEqual((await detail(withPbq, objsA[1]))?.formats, ["free_response"], "a unit PBQ is accuracy only");
    assert.equal(await level(withPbq, objsA[1]), "Independent");

    const sitting = await newUser();
    await answer(sitting, objsA[1], { verdict: "correct", ago: "20 minutes" });
    await answer(sitting, objsA[1], { verdict: "correct", ago: "10 minutes", type: "explain_back" });
    assert.deepEqual((await detail(sitting, objsA[1]))?.formats, ["free_response"], "an explain-back straight after counts only when spaced");
    // REQ-218: one sitting is not confirmation -- Guided until a later day.
    assert.equal(await level(sitting, objsA[1]), "Guided", "one sitting stays below the top");
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
    // REQ-218: Independent needs the confirming answer from a later day.
    for (const u of [oldMiss, newMiss]) await answer(u, objsA[4], { verdict: "correct", ago: "2 days" });
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
    // REQ-117: explain-back counts when spaced, and the formats 72 h apart.
    await answer(u, objsA[7], { verdict: "correct", ago: "5 days" });
    await answer(u, objsA[7], { verdict: "correct", ago: "1 day", type: "explain_back" });
    assert.deepEqual((await detail(u, objsA[7]))?.formats, ["explain_back", "free_response"]);
    assert.equal(await level(u, objsA[7]), "Transfer-ready");
    await assert.rejects(answer(u, objsA[7], { verdict: "correct", ago: "1 hour", type: "made_up_type" }), /foreign key/);
  });

  test("a PBQ alone gives no level; a graded PBQ updates the unit's studied objectives live", async () => {
    const u = await newUser();
    await pbq(u, "correct", "1 hour");
    assert.equal(await detail(u, objsA[8]), null);
    await answer(u, objsA[8], { verdict: "correct", ago: "4 days" });
    await answer(u, objsA[8], { verdict: "correct", ago: "3 days" }); // REQ-218: confirmed on a later day
    await query(`select recompute_mastery($1)`, [u]);
    // REQ-117 (FAIL-340): it counts toward accuracy, not as a second format.
    assert.equal(await stored(u, objsA[8]), "Independent", "the earlier PBQ counts once there is direct evidence");
    assert.match((await queryOne<{ evidence: string }>(`select evidence from mastery where user_id = $1 and objective_id = $2`, [u, objsA[8]]))!.evidence, /1 unit-wide/);

    const v = await newUser();
    await answer(v, objsA[9], { verdict: "correct", ago: "3 days" });
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
    // Updated live (the evidence now names the PBQ); REQ-117: not a format.
    assert.equal(await stored(v, objsA[9]), "Independent");
    assert.match((await queryOne<{ evidence: string }>(`select evidence from mastery where user_id = $1 and objective_id = $2`, [v, objsA[9]]))!.evidence, /1 unit-wide/);
    assert.equal(await stored(v, objsA[8]), undefined, "an unstudied objective gets no row");
  });
});

describe("031 re-run", () => {
  test("is idempotent, keeps tuned values and the original 031 backup, and never touches the 029 backup", async () => {
    const u = await newUser();
    await answer(u, objsB[0], { verdict: "correct", ago: "4 days" });
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
      await migrate031(c);
      const first = await snap();
      assert.equal(first.b031.length, 1);
      assert.equal(first.b031[0].status, "Independent");
      // Tune a readiness value (no mastery level depends on it, so the file's
      // global recompute below rewrites nobody else's rows), and knock this
      // learner's stored level out of date.
      await c.query(`update mastery_model_params set value = 0.95 where name = 'readiness_ready_coverage'`);
      await c.query(`update mastery set status = 'Guided', score_0_4 = 2 where user_id = $1`, [u]);
      await migrate031(c);
      const p = await c.query(`select value from mastery_model_params where name = 'readiness_ready_coverage'`);
      assert.equal(Number(p.rows[0].value), 0.95, "a re-run does not overwrite a tuned value");
      const second = await snap();
      assert.deepEqual(second.b029, first.b029, "029 backup untouched");
      assert.deepEqual(second.b031, first.b031, "031 backup keeps its first values");
      const level = (rows: Array<Record<string, unknown>>) => rows.map(({ updated_at: _ignored, ...r }) => r);
      assert.deepEqual(level(second.mastery), level(first.mastery), "the re-run recomputed the stale level back");
      const again = await snap();
      await migrate031(c);
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

// The first version of 031 dropped guarantees 029 had just gained in review
// (PR #22): it trusted a stored assisted = false, returned no row for "no
// evidence", restored every backed-up row and kept backups after account
// deletion (FAIL-082, 083, 085, 086).
describe("031 keeps 029's guarantees", () => {
  const ruleRow = async (u: string, o: string) =>
    queryOne<{ status: string; score: number }>(`select status, score from mastery_from_attempts($1, $2)`, [u, o]);

  test("a repeat or a Solo multiple choice written with assisted = false scores as if flagged (FAIL-082)", async () => {
    const unflagged = await newUser();
    const flagged = await newUser();
    // As pre-029 code wrote them during the deploy gap: no flag.
    await answer(unflagged, objsA[0], { verdict: "incorrect", ago: "2 hours", question: "same" });
    await answer(unflagged, objsA[0], { verdict: "correct", ago: "1 hour", question: "same" });
    await answer(unflagged, objsA[1], { format: "mc", verdict: "correct", ago: "1 hour" });
    // As the current code writes them.
    await answer(flagged, objsA[0], { verdict: "incorrect", ago: "2 hours", question: "same" });
    await answer(flagged, objsA[0], { verdict: "correct", ago: "1 hour", question: "same", assist: "repeat" });
    await answer(flagged, objsA[1], { format: "mc", verdict: "correct", ago: "1 hour", assist: "hint" });
    for (const o of [objsA[0], objsA[1]]) {
      const a = await detail(unflagged, o);
      const b = await detail(flagged, o);
      assert.deepEqual(a, b);
      assert.equal(a?.status, "Guided");
      assert.deepEqual(a?.formats, []);
    }
  });

  test("a hint revealed before the answer counts even when the attempt says unassisted; one revealed after does not (FAIL-082)", async () => {
    const before = await newUser();
    const afterwards = await newUser();
    const reveal = (u: string, ago: string) =>
      query(
        `insert into lesson_hint_reveals (user_id, objective_id, item_key, revealed_at)
         values ($1, $2, lesson_item_key('solo', 'hinted q'), now() - $3::interval)`,
        [u, objsA[2], ago]
      );
    await reveal(before, "2 hours");
    await answer(before, objsA[2], { verdict: "correct", ago: "1 hour", question: "hinted q" });
    await answer(afterwards, objsA[2], { verdict: "correct", ago: "1 hour", question: "hinted q" });
    await answer(afterwards, objsA[2], { verdict: "correct", ago: "3 days" }); // REQ-218: confirmation
    await reveal(afterwards, "0 seconds");
    assert.equal(await level(before, objsA[2]), "Guided");
    assert.deepEqual((await detail(before, objsA[2]))?.formats, []);
    assert.equal(await level(afterwards, objsA[2]), "Independent");
  });

  // feat/rich-feedback (034) stores "revise my answer after seeing feedback"
  // as assist_reason = 'retry'. The learner saw the model answer, so a retry
  // is left out of the accuracy and never counts as a format.
  test("a retry earns no credit, has no weight and is never format evidence (REQ-100)", async () => {
    const params = await query<{ name: string; value: string }>(
      `select name, value from mastery_model_params where name in ('assist_credit_retry', 'assist_weight_retry') order by name`
    );
    assert.deepEqual(params.map((r) => [r.name, Number(r.value)]), [["assist_credit_retry", 0], ["assist_weight_retry", 0]]);

    const missOnly = await newUser();
    const retried = await newUser();
    for (const u of [missOnly, retried]) {
      await answer(u, objsA[4], { verdict: "correct", ago: "3 days" });
      await answer(u, objsA[4], { verdict: "incorrect", ago: "2 hours", question: "missed q" });
    }
    // Revised after feedback, correct this time -- stored both ways the
    // branch might write it: flagged, and (defensively) unflagged.
    await answer(retried, objsA[4], { verdict: "correct", ago: "1 hour", question: "missed q", assist: "retry" });
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assisted, assist_reason, created_at)
       values ($1, $2, $3, 'lesson', 'solo', 'open', 'other missed q', 'a', 'correct', false, 'retry', now() - interval '30 minutes')`,
      [retried, unitA, objsA[4]]
    );
    const a = await detail(missOnly, objsA[4]);
    const b = await detail(retried, objsA[4]);
    assert.equal(b?.weighted_accuracy, a?.weighted_accuracy, "retries leave the accuracy exactly as it was");
    assert.equal(b?.status, a?.status);
    assert.deepEqual(b?.formats, a?.formats, "no format from a retry");

    // A retry alone can't lift an objective out of Introduced, nor make one
    // miss read as two for Needs review.
    const fresh = await newUser();
    await answer(fresh, objsA[5], { verdict: "incorrect", ago: "2 hours", question: "q" });
    await answer(fresh, objsA[5], { verdict: "correct", ago: "1 hour", question: "q", assist: "retry" });
    assert.equal(await level(fresh, objsA[5]), "Introduced");
  });

  test("only lesson answers and PBQs are evidence; another kind counts only when its assessment type is named", async () => {
    const other = async (u: string, o: string, kind: string, verdict: string, type: string | null) =>
      query(
        `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assessment_type, created_at)
         values ($1, $2, $3, $4::attempt_kind, null, 'open', $5, 'a', $6, $7, now() - interval '2 hours')`,
        [u, unitA, o, kind, `${kind}-${randomUUID()}`, verdict, type]
      );
    const quizOnly = await newUser();
    await other(quizOnly, objsA[6], "quiz", "correct", null);
    await other(quizOnly, objsA[6], "unitcheck", "correct", null);
    assert.deepEqual(await ruleRow(quizOnly, objsA[6]), { status: "Not started", score: 0 });
    assert.equal(await detail(quizOnly, objsA[6]), null);

    // A missed quiz neither lowers the accuracy nor makes a later lesson
    // answer a review retest.
    const mixed = await newUser();
    const lessonOnly = await newUser();
    for (const u of [mixed, lessonOnly]) await answer(u, objsA[6], { verdict: "correct", ago: "1 hour" });
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, format, question, answer, verdict, created_at)
       values ($1, $2, $3, 'quiz', 'open', 'quiz q', 'a', 'incorrect', now() - interval '3 days')`,
      [mixed, unitA, objsA[6]]
    );
    assert.deepEqual(await detail(mixed, objsA[6]), await detail(lessonOnly, objsA[6]));

    // Named in the tuning table, it counts like that type.
    const named = await newUser();
    // FAIL-232: was kind 'lab', which migration 035 now refuses with an
    // objective_id (lab reports are never mastery evidence).
    await other(named, objsA[7], "unitcheck", "correct", "free_response");
    await query(
      `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, assessment_type, created_at)
       values ($1, $2, $3, 'unitcheck', null, 'open', 'earlier named', 'a', 'correct', 'free_response', now() - interval '3 days')`,
      [named, unitA, objsA[7]]
    ); // REQ-218: the confirming answer from a later day
    assert.equal(await level(named, objsA[7]), "Independent");
  });

  test("no direct evidence is Not started; mastery_detail still returns nothing (FAIL-083)", async () => {
    const u = await newUser();
    assert.deepEqual(await ruleRow(u, objsA[3]), { status: "Not started", score: 0 });
    await pbq(u, "correct", "1 hour");
    assert.deepEqual(await ruleRow(u, objsA[3]), { status: "Not started", score: 0 }, "a PBQ alone gives no level");
    assert.equal(await detail(u, objsA[3]), null, "readiness reads no row as not practiced");
  });

  test("031b: self-set and PBQ-only levels reset, the restore leaves later progress alone, backups go with the account (FAIL-083, 085, 086)", async () => {
    const u = await newUser();
    const o = { selfSet: objsA[0], pbqOnly: objsA[1], recomputed: objsA[2], later: objsA[3], noRow: objsA[4] };
    const old = (obj: string, status: string, score: number) =>
      query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, $3, $4, 'pre-031')`, [
        u,
        obj,
        status,
        score,
      ]);
    await old(o.selfSet, "Transfer-ready", 4);
    await pbq(u, "correct", "1 day");
    await old(o.pbqOnly, "Independent", 3);
    await answer(u, o.recomputed, { verdict: "correct", ago: "3 days" });
    await old(o.recomputed, "Guided", 2);
    await answer(u, o.later, { verdict: "correct", ago: "3 days" });
    await old(o.later, "Introduced", 1);
    await answer(u, o.noRow, { verdict: "correct", ago: "3 days" });
    // Each of the last three: a free response 3 days ago plus the unit's
    // correct PBQ a day ago -- Independent (REQ-117: a unit PBQ is accuracy
    // only, and the formats need 72 h; this test is about the restore).

    // 031b recomputes every learner, so it runs on its own connection inside a
    // transaction that is rolled back (FAIL-076).
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: sslOption() });
    await c.connect();
    try {
      await c.query("begin");
      const status = async (obj: string) =>
        (await c.query(`select status from mastery where user_id = $1 and objective_id = $2`, [u, obj])).rows[0]?.status;
      await migrate031(c);
      // now() does not move inside one transaction; model the migration having
      // committed a minute ago, so the writes below read as later than the backup.
      await c.query(`update mastery set updated_at = updated_at - interval '1 minute' where user_id = $1 and updated_at = now()`, [u]);
      await c.query(
        `update mastery_backup_031 set backed_up_at = backed_up_at - interval '1 minute',
                updated_at = case when created_by_031 then updated_at - interval '1 minute' else updated_at end
          where user_id = $1`,
        [u]
      );

      const backup = (await c.query(`select objective_id, status, created_by_031 from mastery_backup_031 where user_id = $1`, [u]))
        .rows as Array<{ objective_id: string; status: string | null; created_by_031: boolean }>;
      const byObj = Object.fromEntries(backup.map((b) => [b.objective_id, b]));
      assert.equal(backup.length, 5);
      assert.equal(byObj[o.selfSet].status, "Transfer-ready", "backup holds the pre-031 value");
      assert.equal(byObj[o.noRow].created_by_031, true, "the row the recompute created is marked");
      assert.equal(await status(o.selfSet), "Not started", "a self-set level with no evidence is dropped");
      assert.equal(await status(o.pbqOnly), "Not started", "a PBQ alone is not a level");
      assert.equal(await status(o.recomputed), "Independent");
      assert.equal(await status(o.later), "Independent");
      assert.equal(await status(o.noRow), "Independent", "a missing row is created from its attempts");

      // Real progress after the backup: a graded answer rewrote this row.
      await c.query(`update mastery set status = 'Guided', score_0_4 = 2, updated_at = now() where user_id = $1 and objective_id = $2`, [
        u,
        o.later,
      ]);
      const header = SQL_031B.split("\n").filter((l) => l.startsWith("--   ")).map((l) => l.slice(5));
      const block = header.slice(header.indexOf("begin;"), header.indexOf("commit;") + 1);
      assert.equal(block[0], "begin;");
      assert.equal(block[block.length - 1], "commit;");
      await c.query(block.slice(1, -1).join("\n")); // the body only: its commit would end this transaction
      assert.equal(await status(o.selfSet), "Transfer-ready");
      assert.equal(await status(o.pbqOnly), "Independent");
      assert.equal(await status(o.recomputed), "Guided");
      assert.equal(await status(o.later), "Guided", "progress after the backup is kept");
      assert.equal(await status(o.noRow), undefined, "the row the recompute created is gone, as before 031");

      await c.query(`delete from app_users where id = $1`, [u]); // what DELETE /api/account does
      const left = await c.query(`select count(*)::int as n from mastery_backup_031 where user_id = $1`, [u]);
      assert.equal(left.rows[0].n, 0, "backup rows go with the account");
    } finally {
      await c.query("rollback");
      await c.end();
    }
  });

  test("031 is schema only, under a lock timeout; the assessment_type key is added NOT VALID and 031b validates it (FAIL-084)", async () => {
    const r = await queryOne<{ convalidated: boolean }>(
      `select convalidated from pg_constraint where conname = 'attempts_assessment_type_fkey' and conrelid = 'attempts'::regclass`
    );
    assert.equal(r?.convalidated, true);
    assert.match(SQL_031, /^set local lock_timeout = '5s';$/m);
    assert.match(SQL_031, /not valid;/);
    assert.doesNotMatch(SQL_031, /^select recompute_mastery\(\);$/m, "031 is schema only");
    assert.doesNotMatch(SQL_031, /^insert into mastery_backup_031/m);
    assert.match(SQL_031B, /^select recompute_mastery\(\);$/m);
  });

  test("the schema probe tells the first version of 031 from the current one, and asks for 031 only (FAIL-089)", async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: sslOption() });
    await c.connect();
    try {
      await c.query("begin");
      const run = (sql: string) => c.query<{ ok: boolean }>(sql).then((r) => r.rows);
      assert.deepEqual((await checkSchema(run)).missing, []);
      // The first version's wrapper: no row for no evidence.
      await c.query(`create or replace function mastery_from_attempts(p_user uuid, p_objective uuid)
        returns table (status mastery_status, score int, evidence text) language sql stable as $$
          select d.status, d.score, d.evidence from mastery_detail(p_user, p_objective) d $$`);
      // CREATE OR REPLACE drops the function's search_path (071's probe notices:
      // a migration that restates a function ends with app_runtime_sync()).
      await c.query(`select app_runtime_sync()`);
      const s = await checkSchema(run);
      assert.deepEqual(migrationsToApply(s), ["031_weighted_mastery.sql"], JSON.stringify(s.missing));
    } finally {
      await c.query("rollback");
      await c.end();
    }
  });

  test("the schema probe reports a database that ran 031 but skipped 031b", async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: sslOption() });
    await c.connect();
    try {
      await c.query("begin");
      const run = (sql: string) => c.query<{ ok: boolean }>(sql).then((r) => r.rows);
      // The state 031 leaves behind: the key added NOT VALID, nothing validated yet.
      await c.query(`alter table attempts drop constraint attempts_assessment_type_fkey`);
      await c.query(`alter table attempts add constraint attempts_assessment_type_fkey
                       foreign key (assessment_type) references assessment_types(type_name) not valid`);
      const s = await checkSchema(run);
      assert.deepEqual(migrationsToApply(s), ["031b_weighted_mastery_backfill.sql"], JSON.stringify(s.missing));
    } finally {
      await c.query("rollback");
      await c.end();
    }
  });
});
