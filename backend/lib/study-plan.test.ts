import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  buildStudyPlan,
  daysBetween,
  isDateOnly,
  isRoughSession,
  keptSummary,
  PLAN_MINUTES,
  sessionChoices,
  type PlanInput,
  type PlanObjective,
} from "./study-plan";
import { resolveToday, validateSettings } from "./study-plan-store";

const units = [
  { id: "u1", title: "Threats", weight: 22, sortOrder: 1 },
  { id: "u2", title: "Architecture", weight: 18, sortOrder: 2 },
  { id: "u3", title: "Operations", weight: 28, sortOrder: 3 },
];

function objs(spec: Array<Partial<PlanObjective> & { id: string; unitId: string }>): PlanObjective[] {
  return spec.map((s, i) => ({
    title: s.id.toUpperCase(),
    sortOrder: i,
    status: "Not started",
    testedOut: false,
    kept: null,
    lastAnsweredAt: null,
    ...s,
  }));
}

// 3 units x 4 objectives, all new.
const fresh = objs(
  units.flatMap((u) => [1, 2, 3, 4].map((n) => ({ id: `${u.id}o${n}`, unitId: u.id })))
);

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    today: "2026-11-07",
    examDate: null,
    weeklyHours: 5,
    units,
    objectives: fresh,
    dueReviews: 0,
    lastSession: null,
    examMinutes: 90,
    ...over,
  };
}

describe("dates", () => {
  test("addDays / daysBetween / isDateOnly", () => {
    assert.equal(addDays("2026-12-30", 3), "2027-01-02");
    assert.equal(daysBetween("2026-11-07", "2026-12-07"), 30);
    assert.ok(isDateOnly("2027-02-28"));
    assert.ok(!isDateOnly("2027-02-30"));
    assert.ok(!isDateOnly("2027-2-3"));
    assert.ok(!isDateOnly(20270101));
  });
});

describe("buildStudyPlan (REQ-110)", () => {
  test("no exam date: pace only, this week filled from the start of the course", () => {
    const p = buildStudyPlan(input());
    assert.equal(p.phase, "no_date");
    assert.equal(p.feasibility.status, "no_date");
    assert.equal(p.remaining.learn, 12);
    assert.equal(p.remaining.minutes, 12 * PLAN_MINUTES.learn);
    // 5 h/week, 25% kept for review -> 225 min of new work -> 9 lessons.
    assert.deepEqual(
      p.thisWeek.steps.map((s) => s.objectiveId),
      ["u1o1", "u1o2", "u1o3", "u1o4", "u2o1", "u2o2", "u2o3", "u2o4", "u3o1"]
    );
    assert.equal(p.feasibility.paceFinishDate, "2026-11-21");
    assert.equal(p.mockExamDate, null);
  });

  test("an exam date far enough out is on track, with a mock a week before and a light last day", () => {
    const p = buildStudyPlan(input({ examDate: "2027-01-30" }));
    assert.equal(p.phase, "building");
    assert.equal(p.mockExamDate, "2027-01-23");
    assert.equal(p.lightDay, "2027-01-29");
    assert.equal(p.feasibility.status, "on_track");
    assert.deepEqual(p.feasibility.options, []);
  });

  test("an unrealistic date says so with three options: more hours, a later date, the heaviest domains", () => {
    const p = buildStudyPlan(input({ examDate: "2026-11-24", weeklyHours: 2 }));
    assert.equal(p.feasibility.status, "unrealistic");
    const kinds = p.feasibility.options.map((o) => o.kind);
    assert.deepEqual(kinds, ["more_hours", "later_date", "focus"]);
    const more = p.feasibility.options[0] as { weeklyHours: number };
    // 300 min of lessons in 10 days before the mock, 25% for review.
    assert.equal(more.weeklyHours, 5);
    const later = p.feasibility.options[1] as { examDate: string };
    assert.ok(later.examDate > "2026-11-24");
    const focus = p.feasibility.options[2] as { unitTitles: string[]; coveredWeightPercent: number };
    assert.deepEqual(focus.unitTitles, ["Operations"]);
    assert.equal(focus.coveredWeightPercent, 41);
  });

  test("more hours is not offered when it would take an unreasonable week", () => {
    const p = buildStudyPlan(input({ examDate: "2026-11-12", weeklyHours: 1 }));
    assert.equal(p.feasibility.status, "unrealistic");
    assert.ok(!p.feasibility.options.some((o) => o.kind === "more_hours"));
  });

  test("final week: mock exam first, no new material", () => {
    const o = objs([
      { id: "a", unitId: "u1", status: "Guided" },
      { id: "b", unitId: "u1" },
      { id: "c", unitId: "u2", testedOut: true, status: "Guided" },
    ]);
    const p = buildStudyPlan(input({ objectives: o, examDate: "2026-11-13" }));
    assert.equal(p.phase, "final_week");
    assert.equal(p.thisWeek.steps[0].kind, "mock");
    assert.ok(!p.thisWeek.steps.some((s) => s.kind === "learn"));
    assert.deepEqual(p.thisWeek.steps.slice(1).map((s) => s.kind), ["practice", "confirm"]);
  });

  test("the day before is a light day, and exam day says so", () => {
    const last = buildStudyPlan(input({ examDate: "2026-11-08" }));
    assert.equal(last.phase, "last_day");
    assert.deepEqual(last.thisWeek.steps.map((s) => s.kind), ["light"]);
    assert.match(last.thisWeek.steps[0].reason, /No new material/);
    assert.equal(buildStudyPlan(input({ examDate: "2026-11-07" })).phase, "exam_day");
    assert.equal(buildStudyPlan(input({ examDate: "2026-11-01" })).phase, "past");
  });

  test("tested-out objectives are skipped ahead, then confirmed at the end", () => {
    const o = fresh.map((x) => (x.unitId === "u1" ? { ...x, testedOut: true, status: "Guided" } : x));
    const p = buildStudyPlan(input({ objectives: o, weeklyHours: 20 }));
    assert.equal(p.remaining.confirm, 4);
    assert.equal(p.thisWeek.steps[0].objectiveId, "u2o1");
    const kinds = p.thisWeek.steps.map((s) => s.kind);
    assert.equal(kinds.indexOf("confirm"), kinds.length - 4);
  });

  test("Needs review comes first normally; after a rough session a winnable step leads instead", () => {
    const o = objs([
      { id: "kept1", unitId: "u1", status: "Independent", kept: "kept", lastAnsweredAt: "2026-11-01T10:00:00Z" },
      { id: "nr", unitId: "u1", status: "Needs review" },
      { id: "new1", unitId: "u2" },
    ]);
    const calm = buildStudyPlan(input({ objectives: o }));
    assert.equal(calm.roughLastSession, false);
    assert.equal(calm.thisWeek.steps[0].objectiveId, "nr");

    const rough = buildStudyPlan(input({ objectives: o, lastSession: { day: "2026-11-06", answers: 6, correct: 1 } }));
    assert.equal(rough.roughLastSession, true);
    assert.equal(rough.thisWeek.steps[0].kind, "warmup");
    assert.equal(rough.thisWeek.steps[0].objectiveId, "kept1");
    assert.deepEqual(rough.thisWeek.steps.slice(1).map((s) => s.objectiveId), ["new1", "nr"]);
  });

  test("a rough session with nothing kept yet warms up on something new, not the miss", () => {
    const o = objs([{ id: "nr", unitId: "u1", status: "Needs review" }, { id: "new1", unitId: "u1" }]);
    const p = buildStudyPlan(input({ objectives: o, lastSession: { day: "2026-11-06", answers: 3, correct: 0 } }));
    assert.equal(p.thisWeek.steps[0].kind, "warmup");
    assert.equal(p.thisWeek.steps[0].objectiveId, "new1");
    assert.ok(!p.thisWeek.steps.some((s, i) => i > 0 && s.objectiveId === "new1"), "not listed twice");
  });

  test("isRoughSession needs a few answers", () => {
    assert.equal(isRoughSession({ day: "x", answers: 2, correct: 0 }), false);
    assert.equal(isRoughSession({ day: "x", answers: 4, correct: 2 }), false);
    assert.equal(isRoughSession({ day: "x", answers: 4, correct: 1 }), true);
    assert.equal(isRoughSession(null), false);
  });

  test("everything done", () => {
    const o = fresh.map((x) => ({ ...x, status: "Independent" }));
    const p = buildStudyPlan(input({ objectives: o, examDate: "2027-01-30" }));
    assert.equal(p.feasibility.status, "done");
    assert.equal(p.thisWeek.steps.length, 0);
  });

  test("deterministic: same input, same plan", () => {
    const i = input({ examDate: "2026-12-20", dueReviews: 4 });
    assert.deepEqual(buildStudyPlan(i), buildStudyPlan(i));
  });
});

describe("sessionChoices (REQ-110, research #15)", () => {
  test("a new learner defaults to a new lesson; review is not offered empty", () => {
    const i = input();
    const s = sessionChoices(buildStudyPlan(i), i);
    assert.equal(s.defaultKind, "lesson");
    assert.deepEqual(s.choices.map((c) => c.kind), ["review", "lesson", "scenario"]);
    assert.equal(s.choices[0].available, false);
    assert.deepEqual(s.choices[1].target, { type: "lesson", objectiveId: "u1o1", unitId: "u1", title: "U1O1" });
    assert.match(s.choices[2].detail, /Best after a lesson/);
  });

  test("three or more due reviews default to review", () => {
    const i = input({ dueReviews: 3 });
    const s = sessionChoices(buildStudyPlan(i), i);
    assert.equal(s.defaultKind, "review");
    assert.deepEqual(s.choices[0].target, { type: "review" });
    assert.equal(s.choices[0].detail, "3 items due for review");
  });

  test("after a rough session the default is a winnable review", () => {
    const o = objs([
      { id: "kept1", unitId: "u1", status: "Independent", kept: "kept", lastAnsweredAt: "2026-11-01T10:00:00Z" },
      { id: "nr", unitId: "u2", status: "Needs review", lastAnsweredAt: "2026-11-06T10:00:00Z" },
    ]);
    const i = input({ objectives: o, dueReviews: 1, lastSession: { day: "2026-11-06", answers: 5, correct: 1 } });
    const s = sessionChoices(buildStudyPlan(i), i);
    assert.equal(s.defaultKind, "review");
    assert.match(s.choices[0].detail, /quick win: KEPT1/);
    assert.equal(s.choices[2].target && "unitId" in s.choices[2].target ? s.choices[2].target.unitId : null, "u2");
  });

  test("with nothing due, review offers a spaced check of something not yet re-checked", () => {
    const o = objs([
      { id: "a", unitId: "u1", status: "Independent", kept: "unchecked", lastAnsweredAt: "2026-11-02T10:00:00Z" },
      { id: "b", unitId: "u1", status: "Guided", kept: "unchecked", lastAnsweredAt: "2026-11-07T08:00:00Z" },
    ]);
    const i = input({ objectives: o });
    const s = sessionChoices(buildStudyPlan(i), i);
    assert.equal(s.choices[0].available, true);
    assert.match(s.choices[0].detail, /kept: A$/);
  });
});

describe("keptSummary", () => {
  test("counts kept, slipped and unchecked among completed objectives", () => {
    assert.deepEqual(keptSummary([{ kept: "kept" }, { kept: "kept" }, { kept: "slipped" }, { kept: "unchecked" }, { kept: null }]), {
      completed: 4,
      kept: 2,
      slipped: 1,
      unchecked: 1,
    });
  });
});

describe("plan settings validation", () => {
  test("exam date must be a real date, today or later, within three years; hours 0.5-60", () => {
    assert.deepEqual(validateSettings({ examDate: "2027-01-30", weeklyHours: 6.3 }, "2026-11-07"), {
      ok: true,
      value: { examDate: "2027-01-30", weeklyHours: 6.5 },
    });
    assert.deepEqual(validateSettings({ examDate: "", weeklyHours: "4" }, "2026-11-07"), {
      ok: true,
      value: { examDate: null, weeklyHours: 4 },
    });
    assert.equal(validateSettings({ examDate: "2026-11-06", weeklyHours: 4 }, "2026-11-07").ok, false);
    assert.equal(validateSettings({ examDate: "2030-01-01", weeklyHours: 4 }, "2026-11-07").ok, false);
    assert.equal(validateSettings({ examDate: "soon", weeklyHours: 4 }, "2026-11-07").ok, false);
    assert.equal(validateSettings({ weeklyHours: 0 }, "2026-11-07").ok, false);
    assert.equal(validateSettings({ weeklyHours: 61 }, "2026-11-07").ok, false);
    assert.equal(validateSettings(null, "2026-11-07").ok, false);
  });

  test("resolveToday trusts the app's date only within a day of the server's", () => {
    const now = new Date("2026-11-07T23:30:00Z");
    assert.equal(resolveToday("2026-11-08", now), "2026-11-08");
    assert.equal(resolveToday("2026-11-06", now), "2026-11-06");
    assert.equal(resolveToday("2026-11-20", now), "2026-11-07");
    assert.equal(resolveToday(undefined, now), "2026-11-07");
  });
});
