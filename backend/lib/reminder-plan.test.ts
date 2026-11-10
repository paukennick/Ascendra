// REQ-197: the reminder plan -- which ONE objective a day's reminder names,
// how many questions and minutes it promises, and the days it says nothing.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  clampPlanDays,
  fixedV1Priority,
  planReminders,
  rankDue,
  secondsPerQuestion,
  shortCourseName,
  shortTopic,
  type CourseInfo,
  type DueObjective,
  type DuePriority,
} from "./reminder-plan";

const obj = (over: Partial<DueObjective>): DueObjective => ({
  objectiveId: over.objectiveId ?? "o",
  title: "Incident response: preparation, detection, containment",
  trackId: "t1",
  dueOn: "2026-11-09",
  step: 1,
  lapses: 0,
  status: "Guided",
  examWeight: 1,
  ...over,
});
const courses = new Map<string, CourseInfo>([
  ["t1", { trackId: "t1", shortName: "Security+", examDate: "2026-11-20" }],
  ["t2", { trackId: "t2", shortName: "SAP-C03", examDate: null }],
]);

describe("ranking (fixed_v1)", () => {
  test("Needs review first, then days overdue x exam weight, then lapses", () => {
    const due = [
      obj({ objectiveId: "a", dueOn: "2026-11-01", examWeight: 5 }),
      obj({ objectiveId: "b", dueOn: "2026-11-09", status: "Needs review" }),
      obj({ objectiveId: "c", dueOn: "2026-11-05", examWeight: 1, lapses: 9 }),
      obj({ objectiveId: "d", dueOn: "2026-11-05", examWeight: 1, lapses: 2 }),
    ];
    assert.deepEqual(
      rankDue(due, "2026-11-09").map((o) => o.objectiveId),
      ["b", "a", "c", "d"]
    );
  });

  test("due today still ranks by exam weight", () => {
    const due = [obj({ objectiveId: "light", examWeight: 1 }), obj({ objectiveId: "heavy", examWeight: 3 })];
    assert.equal(rankDue(due, "2026-11-09")[0].objectiveId, "heavy");
  });

  test("another priority (FSRS later) plugs in without touching the plan", () => {
    const byLapses: DuePriority = { name: "test", key: (o) => [o.lapses] };
    const due = [obj({ objectiveId: "x", status: "Needs review" }), obj({ objectiveId: "y", lapses: 4 })];
    assert.equal(rankDue(due, "2026-11-09", byLapses)[0].objectiveId, "y");
    assert.equal(fixedV1Priority.name, "fixed_v1");
  });
});

describe("planReminders", () => {
  test("one payload per day with something due; nothing on empty days", () => {
    const due = [obj({ objectiveId: "a", dueOn: "2026-11-09" }), obj({ objectiveId: "b", dueOn: "2026-11-12" })];
    const plan = planReminders({ today: "2026-11-09", days: 7, due, courses, secondsPerQuestion: 50, roughLastSession: false });
    // 2026-11-09..11 has one due, from the 12th two.
    assert.deepEqual(plan.map((p) => [p.date, p.questionCount]), [
      ["2026-11-09", 1],
      ["2026-11-10", 1],
      ["2026-11-11", 1],
      ["2026-11-12", 2],
      ["2026-11-13", 2],
      ["2026-11-14", 2],
      ["2026-11-15", 2],
    ]);
    assert.equal(planReminders({ today: "2026-11-09", days: 7, due: [], courses, secondsPerQuestion: 50, roughLastSession: false }).length, 0);
    const later = planReminders({
      today: "2026-11-09",
      days: 3,
      due: [obj({ dueOn: "2026-11-20" })],
      courses,
      secondsPerQuestion: 50,
      roughLastSession: false,
    });
    assert.equal(later.length, 0, "days before anything is due are skipped");
  });

  test("names one topic, counts only that course, caps at a session, honest minutes and exam days", () => {
    const due = [
      ...Array.from({ length: 15 }, (_, i) => obj({ objectiveId: `s${i}`, dueOn: "2026-11-01", examWeight: 2 })),
      obj({ objectiveId: "other", trackId: "t2", dueOn: "2026-11-09", examWeight: 1 }),
    ];
    const [p] = planReminders({ today: "2026-11-09", days: 1, due, courses, secondsPerQuestion: 45, roughLastSession: false });
    assert.equal(p.trackId, "t1");
    assert.equal(p.course, "Security+");
    assert.equal(p.topic, "Incident response");
    assert.equal(p.questionCount, 12);
    assert.equal(p.minutes, 9); // 12 x 45 s
    assert.equal(p.examInDays, 11);
    const [g] = planReminders({ today: "2026-11-09", days: 1, due, courses, secondsPerQuestion: null, roughLastSession: true });
    assert.equal(g.questionCount, 8, "after a rough session the gentle cap");
    assert.equal(g.minutes, null, "no timing data, no time claim");
  });

  test("no exam days once the exam has passed or without a date", () => {
    const [p] = planReminders({
      today: "2026-11-21",
      days: 1,
      due: [obj({})],
      courses,
      secondsPerQuestion: null,
      roughLastSession: false,
    });
    assert.equal(p.examInDays, null);
    const [q] = planReminders({
      today: "2026-11-09",
      days: 1,
      due: [obj({ trackId: "t2" })],
      courses,
      secondsPerQuestion: null,
      roughLastSession: false,
    });
    assert.equal(q.examInDays, null);
  });

  test("objectives of a course with no course info (not visible) are ignored", () => {
    const plan = planReminders({ today: "2026-11-09", days: 1, due: [obj({ trackId: "gone" })], courses, secondsPerQuestion: 30, roughLastSession: false });
    assert.equal(plan.length, 0);
  });
});

describe("time estimate", () => {
  test("median of plausible gaps, and nothing with too few", () => {
    assert.equal(secondsPerQuestion([30, 40, 50, 60]), null);
    assert.equal(secondsPerQuestion([30, 40, 50, 60, 70]), 50);
    assert.equal(secondsPerQuestion([1, 2, 30, 40, 50, 60, 3000, 70]), 50, "double taps and breaks are not answering time");
    assert.equal(secondsPerQuestion([30, 40, 50, 60, 70, 80]), 55);
  });
});

describe("short names", () => {
  test("course", () => {
    assert.equal(shortCourseName({ credentialName: "CompTIA Security+", providerName: "CompTIA", examCode: "SY0-701", trackTitle: "Prep for CompTIA Security+" }), "Security+");
    assert.equal(
      shortCourseName({
        credentialName: "AWS Certified Solutions Architect - Professional",
        providerName: "Amazon Web Services",
        examCode: "SAP-C03",
        trackTitle: "AWS Solutions Architect Professional Coach",
      }),
      "SAP-C03"
    );
    const gcp = shortCourseName({
      credentialName: "Google Cloud Professional Cloud DevOps Engineer",
      providerName: "Google Cloud",
      examCode: null,
      trackTitle: "x",
    });
    assert.ok(gcp.length <= 18, gcp);
    assert.equal(shortCourseName({ credentialName: null, providerName: null, examCode: null, trackTitle: "MSCS Foundations" }), "MSCS Foundations");
  });

  test("topic", () => {
    assert.equal(shortTopic("Incident response: preparation, detection, analysis"), "Incident response");
    assert.equal(shortTopic("Public key infrastructure (PKI): public key, private key"), "Public key infrastructure");
    const long = shortTopic("Given a change request, run the business process and every other part of it at length");
    assert.ok(long.length <= 40 && long.endsWith("…"), long);
  });

  test("days param is clamped", () => {
    assert.equal(clampPlanDays(null), 7);
    assert.equal(clampPlanDays("99"), 14);
    assert.equal(clampPlanDays("0"), 1);
    assert.equal(clampPlanDays("3"), 3);
  });
});
