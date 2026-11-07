import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  allocateByWeight,
  compareWithReadiness,
  domainBreakdown,
  marginOfError,
  mockTimer,
  pacingSummary,
  spreadOverObjectives,
  sprintTimer,
  type GradedItemSummary,
} from "./exam-plan";

describe("allocateByWeight", () => {
  test("follows the domain weights and adds up exactly (Security+ 12/22/18/28/20 over 90)", () => {
    const d = [12, 22, 18, 28, 20].map((w, i) => ({ unitId: `u${i}`, weight: w, objectives: 5 }));
    const a = allocateByWeight(d, 90);
    assert.deepEqual([...a.values()], [11, 20, 16, 25, 18]);
    assert.equal([...a.values()].reduce((s, x) => s + x, 0), 90);
  });
  test("an unweighted unit in a weighted course gets no questions; units with no objectives are skipped", () => {
    const a = allocateByWeight(
      [
        { unitId: "a", weight: 50, objectives: 3 },
        { unitId: "b", weight: 50, objectives: 3 },
        { unitId: "c", weight: null, objectives: 3 },
        { unitId: "d", weight: 40, objectives: 0 },
      ],
      10
    );
    assert.deepEqual(Object.fromEntries(a), { a: 5, b: 5 });
  });
  test("no blueprint: by objective count", () => {
    const a = allocateByWeight(
      [
        { unitId: "a", weight: null, objectives: 1 },
        { unitId: "b", weight: null, objectives: 3 },
      ],
      8
    );
    assert.deepEqual(Object.fromEntries(a), { a: 2, b: 6 });
  });
});

test("spreadOverObjectives cycles evenly", () => {
  const out = spreadOverObjectives(["x", "y", "z"], 7, (xs) => [...xs]);
  assert.deepEqual(out, ["x", "y", "z", "x", "y", "z", "x"]);
  assert.deepEqual(spreadOverObjectives([], 3, (xs) => xs), []);
});

describe("timers", () => {
  test("sprint: ten questions at the exam's pace, else an estimate, or untimed", () => {
    assert.deepEqual(sprintTimer({ timed: true, durationMinutes: 130, questionCount: 65 }), {
      timeLimitSeconds: 1200,
      secondsPerQuestion: 120,
      basis: "exam",
    });
    assert.equal(sprintTimer({ timed: true, durationMinutes: null, questionCount: null }).basis, "estimate");
    assert.deepEqual(sprintTimer({ timed: false, durationMinutes: 130, questionCount: 65 }), {
      timeLimitSeconds: null,
      secondsPerQuestion: null,
      basis: "untimed",
    });
  });
  test("mock: the full duration at full length, scaled when shorter", () => {
    assert.equal(mockTimer({ timed: true, durationMinutes: 90, examQuestions: 90, mockQuestions: 90 }).timeLimitSeconds, 5400);
    assert.equal(mockTimer({ timed: true, durationMinutes: 90, examQuestions: 90, mockQuestions: 45 }).timeLimitSeconds, 2700);
    assert.equal(mockTimer({ timed: false, durationMinutes: 90, examQuestions: 90, mockQuestions: 90 }).timeLimitSeconds, null);
    assert.equal(mockTimer({ timed: true, durationMinutes: null, examQuestions: null, mockQuestions: 50 }).basis, "estimate");
  });
});

const g = (over: Partial<GradedItemSummary>): GradedItemSummary => ({
  unitId: "u1",
  unitTitle: "Unit 1",
  unitWeight: 30,
  credited: true,
  partial: 1,
  answered: true,
  flagged: false,
  timeSpentMs: 60000,
  ...over,
});

test("domainBreakdown flags small samples", () => {
  const d = domainBreakdown([g({}), g({ credited: false }), g({ unitId: "u2", unitTitle: "U2" })]);
  assert.equal(d.length, 2);
  assert.deepEqual(
    { q: d[0].questions, c: d[0].correct, p: d[0].percent, small: d[0].smallSample, s: d[0].averageSeconds },
    { q: 2, c: 1, p: 50, small: true, s: 60 }
  );
});

test("pacingSummary names slow questions and blanks", () => {
  const p = pacingSummary([g({}), g({ timeSpentMs: 300000 }), g({ answered: false, timeSpentMs: 0 })], {
    usedSeconds: 360,
    timeLimitSeconds: 600,
    targetSeconds: 90,
  });
  assert.deepEqual(p.slowQuestions, [2]);
  assert.equal(p.unanswered, 1);
  assert.match(p.lines.join(" "), /You used 6:00 of 10:00/);
  assert.match(p.lines.join(" "), /always pick something/);
});

describe("compareWithReadiness", () => {
  test("margin shrinks with more questions", () => {
    assert.ok(marginOfError(5, 10) > marginOfError(50, 100));
    assert.ok(marginOfError(5, 10) >= 25);
  });
  test("agree within the margin", () => {
    const c = compareWithReadiness(45, 65, { status: "building", readinessPercent: 66, coveragePercent: 92, accuracyPercent: 70 });
    assert.equal(c.agreement, "agree");
    assert.equal(c.mockPercent, 69);
  });
  test("mock lower and higher are explained, not judged", () => {
    const lower = compareWithReadiness(26, 65, { status: "ready", readinessPercent: 80, coveragePercent: 95, accuracyPercent: 82 });
    assert.equal(lower.agreement, "mock_lower");
    const higher = compareWithReadiness(58, 65, { status: "building", readinessPercent: 40, coveragePercent: 60, accuracyPercent: 70 });
    assert.equal(higher.agreement, "mock_higher");
    assert.match(higher.lines.join(" "), /only counts what you've practiced/);
  });
  test("not comparable when readiness had too little evidence; never claims an exam score", () => {
    const c = compareWithReadiness(30, 50, { status: "not_enough_evidence", readinessPercent: 12, coveragePercent: 20, accuracyPercent: 80 });
    assert.equal(c.agreement, "not_comparable");
    assert.match(c.lines.join(" "), /not a predicted exam score/);
    assert.equal(compareWithReadiness(3, 10, null).agreement, "not_comparable");
  });
});
