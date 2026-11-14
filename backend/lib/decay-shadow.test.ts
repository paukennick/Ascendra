// REQ-301: shadow mode for the mastery decay model. The pure prediction, the
// switch, the pin between the model's constants and its version label, and
// the rule that matters most: a failure in the shadow work never fails the
// review (FAIL-2060). The database side is in decay-shadow.dbtest.ts.
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { TxClient } from "./db";
import {
  MEMORY_MODEL_VERSION,
  SHADOW_STATEMENT_TIMEOUT_MS,
  modelFingerprint,
  predictShadow,
  recordShadowPrediction,
  shadowEnabled,
  type ShadowReview,
} from "./decay-shadow";
import { FIT_LEARNING_BELOW, FIT_STARTING_BELOW, enrollState, gradeFor, recallAt, reviewState } from "./memory-model";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 1, 9, 0, 0);
const at = (days: number) => T0 + days * DAY;
const OBJ = "obj-1";

const close = (a: number, b: number, eps = 1e-5) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

function review(objectiveId: string, days: number, verdict: ShadowReview["verdict"] = "correct", assisted = false): ShadowReview {
  return { objectiveId, atMs: at(days), verdict, assisted };
}

describe("predictShadow (REQ-301)", () => {
  test("first review after enrolment: the fresh state's recall after the gap at the prior's k, stage starting", () => {
    const p = predictShadow({
      history: [],
      enrolledAtMs: new Map([[OBJ, at(0)]]),
      target: { objectiveId: OBJ, atMs: at(1) },
      goal: "work",
      level: "experienced",
    })!;
    assert.ok(p);
    assert.equal(p.fitStage, "starting");
    assert.equal(p.goal, "work");
    assert.equal(p.level, "experienced");
    // No reviews: the posterior is the prior, so k is near 1.5 x 1.2 = 1.8 (the grid is 61 points over 0.05..8).
    assert.ok(p.k > 1.5 && p.k < 2.2, `k ${p.k}`);
    const fresh = enrollState(3);
    close(p.stability, fresh.s);
    close(p.difficulty, fresh.d);
    close(p.predictedRecall, recallAt(fresh, 1, p.k));
  });

  test("goal and level null are stored as 'none' and 'some', and the goal moves the starting k", () => {
    const base = { history: [], enrolledAtMs: new Map([[OBJ, at(0)]]), target: { objectiveId: OBJ, atMs: at(2) }, level: null };
    const none = predictShadow({ ...base, goal: null })!;
    assert.equal(none.goal, "none");
    assert.equal(none.level, "some");
    const work = predictShadow({ ...base, goal: "work" })!;
    const change = predictShadow({ ...base, goal: "career_change" })!;
    assert.ok(work.k > none.k && none.k > change.k, `${work.k} ${none.k} ${change.k}`);
    // A longer-holding learner is predicted to recall more.
    assert.ok(work.predictedRecall > change.predictedRecall);
  });

  test("the state is the replay of this objective's earlier reviews at the fitted k, and the gap is from the last one", () => {
    const history = [review(OBJ, 1), review(OBJ, 4, "partial"), review(OBJ, 9, "correct", true)];
    const p = predictShadow({
      history,
      enrolledAtMs: new Map([[OBJ, at(0)]]),
      target: { objectiveId: OBJ, atMs: at(15) },
      goal: "program",
      level: "some",
    })!;
    let st = enrollState(3);
    let last = 0;
    for (const r of history) {
      const d = (r.atMs - T0) / DAY;
      st = reviewState(st, d - last, gradeFor(r.verdict, r.assisted), p.k, undefined, r.assisted).next;
      last = d;
    }
    close(p.stability, st.s);
    close(p.difficulty, st.d);
    close(p.predictedRecall, recallAt(st, 15 - last, p.k));
  });

  test("history order does not matter, and other objectives in the course feed the fit but not the state", () => {
    const own = [review(OBJ, 1), review(OBJ, 5)];
    const other = [review("obj-2", 2, "incorrect"), review("obj-2", 4), review("obj-3", 3, "incorrect")];
    const enrolled = new Map([[OBJ, at(0)], ["obj-2", at(0)], ["obj-3", at(1)]]);
    const mk = (history: ShadowReview[]) =>
      predictShadow({ history, enrolledAtMs: enrolled, target: { objectiveId: OBJ, atMs: at(9) }, goal: "program", level: "some" })!;
    const a = mk([...own, ...other]);
    const b = mk([...other].reverse().concat([...own].reverse()));
    assert.deepEqual(a, b);
    // Other objectives' misses pull k down (they are evidence of faster forgetting), so the state of OBJ is the
    // same replay at a different k, never a function of their own stability.
    const alone = mk(own);
    assert.ok(a.k <= alone.k, `${a.k} vs ${alone.k}`);
  });

  test("answers with help do not count toward the fit stage; unaided ones do", () => {
    const enrolled = new Map([[OBJ, at(0)]]);
    const many = (n: number, assisted: boolean) => Array.from({ length: n }, (_, i) => review(OBJ, 1 + i * 2, "correct", assisted));
    const run = (history: ShadowReview[]) =>
      predictShadow({ history, enrolledAtMs: enrolled, target: { objectiveId: OBJ, atMs: at(400) }, goal: null, level: null })!;
    assert.equal(run(many(FIT_LEARNING_BELOW + 6, true)).fitStage, "starting");
    assert.equal(run(many(FIT_STARTING_BELOW - 1, false)).fitStage, "starting");
    assert.equal(run(many(FIT_STARTING_BELOW, false)).fitStage, "learning");
    assert.equal(run(many(FIT_LEARNING_BELOW, false)).fitStage, "fitted");
  });

  test("a target that was never enrolled, or a bad time, gives no prediction", () => {
    const base = { history: [], goal: null, level: null };
    assert.equal(predictShadow({ ...base, enrolledAtMs: new Map(), target: { objectiveId: OBJ, atMs: at(1) } }), null);
    assert.equal(predictShadow({ ...base, enrolledAtMs: new Map([[OBJ, at(0)]]), target: { objectiveId: OBJ, atMs: NaN } }), null);
    assert.equal(predictShadow({ ...base, enrolledAtMs: new Map([[OBJ, NaN]]), target: { objectiveId: OBJ, atMs: at(1) } }), null);
  });

  test("a history row for an objective with no schedule is left out of the fit instead of failing", () => {
    const p = predictShadow({
      history: [review("ghost", 1, "incorrect"), review(OBJ, 2)],
      enrolledAtMs: new Map([[OBJ, at(0)]]),
      target: { objectiveId: OBJ, atMs: at(6) },
      goal: null,
      level: null,
    });
    assert.ok(p);
  });

  test("an enrolment stamped after the first review (bad data) does not give a negative gap", () => {
    const p = predictShadow({
      history: [review(OBJ, 1)],
      enrolledAtMs: new Map([[OBJ, at(3)]]),
      target: { objectiveId: OBJ, atMs: at(5) },
      goal: null,
      level: null,
    })!;
    assert.ok(p.predictedRecall > 0 && p.predictedRecall <= 1);
  });

  test("every stored number is inside the table's check, whatever the history", () => {
    const enrolled = new Map([[OBJ, at(0)]]);
    for (const [verdict, assisted] of [["incorrect", false], ["partial", false], ["correct", true], ["correct", false]] as const) {
      const history = Array.from({ length: 30 }, (_, i) => review(OBJ, 1 + i * 0.01 * (i + 1), verdict, assisted));
      for (const gap of [0, 0.5, 3, 400]) {
        const p = predictShadow({ history, enrolledAtMs: enrolled, target: { objectiveId: OBJ, atMs: at(40 + gap) }, goal: "interest", level: "new" })!;
        assert.ok(p.predictedRecall >= 0 && p.predictedRecall <= 1);
        assert.ok(p.stability > 0 && p.difficulty >= 1 && p.difficulty <= 10 && p.k > 0);
      }
    }
  });
});

describe("the model version label (REQ-301)", () => {
  // Changing any constant below moves predictions. When this test fails, bump
  // MEMORY_MODEL_VERSION in lib/decay-shadow.ts (calibration must never mix two
  // parameter sets under one label) and put the new pair here.
  test("MEMORY_MODEL_VERSION is pinned to the model's constants", () => {
    assert.equal(`${MEMORY_MODEL_VERSION}:${modelFingerprint()}`, "fsrs6-k-v1:2275f93d422f");
  });
  test("it fits the column (varchar(24))", () => {
    assert.ok(MEMORY_MODEL_VERSION.length <= 24);
  });
});

describe("DECAY_SHADOW (REQ-301)", () => {
  test("on unless off, 0, false or no", () => {
    assert.equal(shadowEnabled({}), true);
    assert.equal(shadowEnabled({ DECAY_SHADOW: "on" }), true);
    assert.equal(shadowEnabled({ DECAY_SHADOW: "" }), true);
    for (const v of ["off", "OFF", " 0 ", "false", "No"]) assert.equal(shadowEnabled({ DECAY_SHADOW: v }), false, v);
  });
});

// A fake transaction that records every statement and fails on demand.
function fakeTx(failOn?: RegExp, answers: Record<string, unknown[]> = {}) {
  const seen: string[] = [];
  const run = async (text: string) => {
    seen.push(text.replace(/\s+/g, " ").trim());
    if (failOn && failOn.test(text)) throw Object.assign(new Error("boom for someone@example.com"), { code: "XX000" });
    for (const [needle, rows] of Object.entries(answers)) if (text.includes(needle)) return rows;
    return [];
  };
  const tx = {
    query: async (text: string) => run(text),
    queryOne: async (text: string) => (await run(text))[0] ?? null,
  } as unknown as TxClient;
  return { tx, seen };
}

const ARGS = { logId: "log-1", userId: "u-1", objectiveId: OBJ, enrolledAt: new Date(at(0)), at: new Date(at(2)) };
const COURSE = { "from objectives o": [{ track_id: "t-1", goal: "work", level: "some" }], "update review_log": [{ id: "log-1" }] };

const warn = console.warn;
afterEach(() => {
  console.warn = warn;
  delete process.env.DECAY_SHADOW;
});

describe("recordShadowPrediction never fails the review (FAIL-2060)", () => {
  test("stores the prediction between a savepoint and its release, and restores the transaction's timeout first", async () => {
    const { tx, seen } = fakeTx(undefined, COURSE);
    assert.equal(await recordShadowPrediction(tx, ARGS), true);
    assert.equal(seen[0], "savepoint decay_shadow");
    assert.match(seen[1], /set_config\('statement_timeout'/);
    assert.ok(seen.some((s) => s.startsWith("update review_log set predicted_recall")));
    const rel = seen.indexOf("release savepoint decay_shadow");
    assert.equal(rel, seen.length - 1);
    assert.match(seen[rel - 1], /set_config\('statement_timeout'/, "the timeout is put back before the release");
    assert.ok(SHADOW_STATEMENT_TIMEOUT_MS < 20_000);
  });

  for (const stage of ["from objectives o", "from review_log l", "update review_log"]) {
    test(`a failing statement (${stage}) rolls back to the savepoint, logs one masked line and returns false`, async () => {
      const lines: string[] = [];
      console.warn = (m: string) => void lines.push(String(m));
      const { tx, seen } = fakeTx(new RegExp(stage), { ...COURSE, "from review_log l": [] });
      assert.equal(await recordShadowPrediction(tx, ARGS), false);
      assert.equal(seen[seen.length - 1], "rollback to savepoint decay_shadow");
      assert.equal(lines.length, 1);
      assert.match(lines[0], /\[decay-shadow\] prediction skipped/);
      assert.ok(!lines[0].includes("someone@example.com"), "an address never reaches the log");
    });
  }

  test("a failing savepoint statement is swallowed too, with no rollback attempted", async () => {
    console.warn = () => undefined;
    const { tx, seen } = fakeTx(/^savepoint/);
    assert.equal(await recordShadowPrediction(tx, ARGS), false);
    assert.ok(!seen.some((s) => s.startsWith("rollback")));
  });

  test("a rollback that itself fails does not throw", async () => {
    console.warn = () => undefined;
    const { tx } = fakeTx(/from objectives o|^rollback/);
    assert.equal(await recordShadowPrediction(tx, ARGS), false);
  });

  test("an objective with no course, or an unpredictable history, stores nothing and still releases the savepoint", async () => {
    const { tx, seen } = fakeTx(undefined, {});
    assert.equal(await recordShadowPrediction(tx, ARGS), false);
    assert.equal(seen[seen.length - 1], "release savepoint decay_shadow");
    assert.ok(!seen.some((s) => s.startsWith("update review_log")));
  });

  test("switched off: not one statement", async () => {
    process.env.DECAY_SHADOW = "off";
    const { tx, seen } = fakeTx(undefined, COURSE);
    assert.equal(await recordShadowPrediction(tx, ARGS), false);
    assert.deepEqual(seen, []);
  });
});
