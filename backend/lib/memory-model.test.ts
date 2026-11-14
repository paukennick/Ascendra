// REQ-291: the proposed memory model (design; REQ-301 stores its predictions in shadow mode, nothing decides from it yet).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  enrollState,
  examDayRecall,
  fitPersonalScale,
  FIT_LEARNING_BELOW,
  FIT_STARTING_BELOW,
  FSRS6_DEFAULT_W,
  gradeFor,
  intervalForRetention,
  initialDifficulty,
  lapseStability,
  needsRefresh,
  nextDifficulty,
  nextIntervalDays,
  priorFor,
  recallStability,
  retrievability,
  reviewState,
  EXAM_FINAL_REVIEW_LEAD_DAYS,
  MAX_INTERVAL_DAYS,
  type LoggedReview,
} from "./memory-model";

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

describe("FSRS-6 formulas (REQ-291)", () => {
  test("21 published default parameters; recall is 90% at t = S, and the interval inverts it", () => {
    assert.equal(FSRS6_DEFAULT_W.length, 21);
    assert.equal(FSRS6_DEFAULT_W[20], 0.1542);
    for (const S of [0.5, 2.3065, 30, 400]) {
      close(retrievability(S, S), 0.9);
      close(retrievability(intervalForRetention(S, 0.8), S), 0.8);
    }
    assert.equal(retrievability(0, 5), 1);
    assert.ok(retrievability(10, 5) < retrievability(5, 5));
  });

  test("grades: a miss is Again, help or a partial is Hard, an unaided correct answer is Good", () => {
    assert.equal(gradeFor("incorrect", false), 1);
    assert.equal(gradeFor("incorrect", true), 1);
    assert.equal(gradeFor("partial", false), 2);
    assert.equal(gradeFor("correct", true), 2);
    assert.equal(gradeFor("correct", false), 3);
  });

  test("difficulty stays in 1..10, rises on a miss and falls on Good", () => {
    const d = initialDifficulty(3);
    assert.ok(d >= 1 && d <= 10);
    assert.ok(nextDifficulty(d, 1) > d);
    assert.ok(nextDifficulty(d, 3) <= d + 1e-9);
    assert.ok(nextDifficulty(10, 1) <= 10 && nextDifficulty(1, 4) >= 1);
  });

  test("a successful review grows stability, more when recall was harder; Hard grows it less; a lapse never raises it", () => {
    const D = 5;
    const S = 10;
    const easyRecall = recallStability(D, S, 0.95, 3);
    const hardRecall = recallStability(D, S, 0.7, 3);
    assert.ok(easyRecall > S && hardRecall > easyRecall);
    assert.ok(recallStability(D, S, 0.8, 2) < recallStability(D, S, 0.8, 3));
    assert.ok(lapseStability(D, S, 0.5) <= S);
    assert.ok(lapseStability(D, 0.5, 0.1) <= 0.5);
  });

  test("the personal clock k stretches time: k = 2 at 2t recalls as k = 1 at t", () => {
    const st = enrollState();
    close(reviewState(st, 8, 3, 2).predicted, reviewState(st, 4, 3, 1).predicted);
  });
});

describe("starting prior from the goal and level, not job titles (REQ-291)", () => {
  test("work and experienced start slower-forgetting than career change and new; an exam date or a clinical course lifts the target", () => {
    const pro = priorFor({ goal: "work", level: "experienced", hasExamDate: false });
    const changer = priorFor({ goal: "career_change", level: "new", hasExamDate: false });
    assert.ok(pro.logKMean > changer.logKMean);
    assert.equal(priorFor({ goal: "interest", level: null, hasExamDate: false }).targetRetention, 0.8);
    assert.equal(priorFor({ goal: "interest", level: null, hasExamDate: true }).targetRetention, 0.9);
    assert.equal(priorFor({ goal: "interest", level: null, hasExamDate: false, clinical: true }).targetRetention, 0.9);
    // No goal answered: neutral prior.
    close(priorFor({ goal: null, level: null, hasExamDate: false }).logKMean, 0);
  });
});

describe("fitting k to the learner's own reviews (REQ-291)", () => {
  // A learner who misses everything after a week but recalls next-day items.
  function history(recalls: (gap: number) => boolean, objectives: number, assisted = false): LoggedReview[] {
    const log: LoggedReview[] = [];
    for (let o = 0; o < objectives; o++) {
      log.push({ objectiveId: `o${o}`, day: 0, kind: "enroll" });
      let day = 0;
      for (const gap of [1, 3, 7, 14]) {
        day += gap;
        log.push({ objectiveId: `o${o}`, day, kind: "review", verdict: recalls(gap) ? "correct" : "incorrect", assisted });
      }
    }
    return log;
  }
  const neutral = { logKMean: 0, logKSd: 0.5 };

  test("no reviews: the prior alone, stage starting", () => {
    const f = fitPersonalScale([], { logKMean: Math.log(1.5), logKSd: 0.5 });
    assert.equal(f.n, 0);
    assert.equal(f.stage, "starting");
    assert.ok(Math.abs(f.k - 1.5) / 1.5 < 0.1, String(f.k));
    assert.ok(f.kLow < f.k && f.k < f.kHigh);
  });

  test("a fast forgetter is fitted below the prior, a strong one above, and the band narrows with reviews", () => {
    const weak = fitPersonalScale(history((g) => g <= 1, 20), neutral);
    const strong = fitPersonalScale(history(() => true, 20), neutral);
    assert.ok(weak.k < 0.7, `weak ${weak.k}`);
    // All-correct is weak evidence when the default model already expects ~90%+.
    assert.ok(strong.k > 1.2, `strong ${strong.k}`);
    assert.equal(weak.n, 80);
    assert.equal(weak.stage, "fitted");
    const few = fitPersonalScale(history((g) => g <= 1, 2), neutral);
    assert.equal(few.stage, "learning");
    assert.ok(few.kHigh / few.kLow > weak.kHigh / weak.kLow);
    assert.ok(FIT_STARTING_BELOW < FIT_LEARNING_BELOW);
  });

  test("answers with help are not evidence: an all-hinted history leaves the prior where it was", () => {
    const f = fitPersonalScale(history(() => true, 20, true), { logKMean: Math.log(1.5), logKSd: 0.5 });
    assert.equal(f.n, 0);
    assert.ok(Math.abs(f.k - 1.5) / 1.5 < 0.1, String(f.k));
  });

  test("a wrong prior is overridden by enough history", () => {
    const f = fitPersonalScale(history((g) => g <= 1, 20), { logKMean: Math.log(2.5), logKSd: 0.5 });
    assert.ok(f.k < 1, String(f.k));
  });
});

describe("scheduling, refresh and exam day (REQ-291)", () => {
  test("the next review is at least a day away (REQ-218), at most the cap, and later for a slower clock", () => {
    const st = enrollState();
    assert.ok(nextIntervalDays({ s: 0.01, d: 5 }, 1, 0.9, 0, null) >= 1);
    assert.equal(nextIntervalDays({ s: 1e6, d: 5 }, 1, 0.9, 0, null), MAX_INTERVAL_DAYS);
    assert.ok(nextIntervalDays(st, 2, 0.9, 0, null) > nextIntervalDays(st, 1, 0.9, 0, null));
    assert.ok(nextIntervalDays(st, 1, 0.8, 0, null) > nextIntervalDays(st, 1, 0.9, 0, null));
  });

  test("a review that would land after the exam with recall below target is pulled before it", () => {
    // A target below the exam target (priorFor already lifts it when an exam
    // date is set, so this guards callers that pass their own target).
    const st = { s: 10, d: 5 };
    const free = nextIntervalDays(st, 1, 0.8, 0, null);
    assert.ok(free > 15);
    assert.equal(nextIntervalDays(st, 1, 0.8, 0, 15), 15 - EXAM_FINAL_REVIEW_LEAD_DAYS);
    // Inside the final lead the exam no longer pulls it (no daily loop before the exam).
    assert.equal(nextIntervalDays(st, 1, 0.8, 13, 15), free);
  });

  test("needs a refresh once predicted recall falls below 70%", () => {
    const st = { s: 10, d: 5 };
    assert.equal(needsRefresh(st, 5, 1), false);
    assert.equal(needsRefresh(st, 2000, 1), true);
  });

  test("exam-day recall is weighted and its band follows the k interval", () => {
    const items = [
      { st: { s: 5, d: 5 }, lastDay: 0, weight: 3 },
      { st: { s: 50, d: 5 }, lastDay: 0, weight: 1 },
    ];
    const r = examDayRecall(items, 30, { k: 1, kLow: 0.5, kHigh: 2 });
    assert.ok(r.low < r.mean && r.mean < r.high);
    const unweighted = examDayRecall(items.map(({ weight: _w, ...x }) => x), 30, { k: 1, kLow: 0.5, kHigh: 2 });
    assert.ok(r.mean < unweighted.mean, "weight on the weaker objective pulls the mean down");
    assert.deepEqual(examDayRecall([], 30, { k: 1, kLow: 1, kHigh: 1 }), { mean: 0, low: 0, high: 0, objectives: 0 });
  });
});
