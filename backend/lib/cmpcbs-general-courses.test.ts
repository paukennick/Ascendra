// REQ-195 (Nick, 2026-11-09): the CMPCBS track is general courses, not one
// school's degree plan. Pure checks on the seed, the labs and the authored
// lessons; the database side (retire on re-seed, retired objectives not
// served) is in lib/cmpcbs-general-courses.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CMPCBS_TRACK } from "../supabase/seed/data";
import { activeUnits, objectiveRetiredAt } from "../supabase/seed/catalog";
import { CMPCBS_LABS } from "../supabase/seed/labs/academic-cmpcbs";
import { AUTHORED_LESSONS, hasAuthoredLesson } from "./authored-lessons";

const SCHOOL = /liberty/i;
const COURSE_CODE = /\b[A-Z]{4} \d{3}\b/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The shape before REQ-195: objectives per unit, by position. Rows are
// matched by position, so this must never change -- retire, never remove or
// reorder.
const OBJECTIVES_PER_UNIT = [4, 2, 2, 1, 2, 2, 6, 5, 6, 5, 6, 6, 5, 6, 4, 6, 5, 4, 4, 4, 3, 5, 5, 5, 7, 5, 1, 6];

describe("REQ-195: no school named as our product", () => {
  test("the track's title and description name no school and describe general courses", () => {
    assert.equal(CMPCBS_TRACK.title, "Computer Science Degree Foundations");
    assert.doesNotMatch(CMPCBS_TRACK.title, SCHOOL);
    assert.doesNotMatch(CMPCBS_TRACK.description, SCHOOL);
    assert.match(CMPCBS_TRACK.description, /Not affiliated with any university/);
    assert.equal(CMPCBS_TRACK.curriculum?.kind, "self_defined");
  });
  test("no learner-facing text in the track names the school: titles, gates, objectives, labels, retired lines included", () => {
    for (const u of CMPCBS_TRACK.units) {
      for (const t of [u.title, u.gate ?? "", u.rangeLabel ?? "", ...u.objectives]) assert.doesNotMatch(t, SCHOOL, t);
    }
    assert.doesNotMatch(JSON.stringify(CMPCBS_TRACK), SCHOOL);
  });
  test("active units, gates and objectives carry no school course codes", () => {
    for (const u of activeUnits(CMPCBS_TRACK)) {
      for (const t of [u.title, u.gate ?? "", ...u.objectives]) assert.doesNotMatch(t, COURSE_CODE, t);
    }
  });
  test("labs name no school and no school course code, and cite no school catalog", () => {
    const text = JSON.stringify(CMPCBS_LABS);
    assert.doesNotMatch(text, SCHOOL);
    assert.doesNotMatch(text, COURSE_CODE);
  });
});

describe("REQ-195: degree-plan lines are retired, never removed or reordered", () => {
  test("every unit and objective keeps its position", () => {
    assert.deepEqual(CMPCBS_TRACK.units.map((u) => u.objectives.length), OBJECTIVES_PER_UNIT);
    for (const u of CMPCBS_TRACK.units) {
      if (u.objectiveRetiredAt) assert.equal(u.objectiveRetiredAt.length, u.objectives.length, u.title);
    }
  });
  test("the logistics units and the elective lines are retired, and nothing else", () => {
    const retiredUnits = CMPCBS_TRACK.units.flatMap((u, i) => (u.retiredAt ? [i] : []));
    assert.deepEqual(retiredUnits, [0, 1, 2, 3, 4, 5, 26, 27]);
    const retiredLines = CMPCBS_TRACK.units.flatMap((u, i) => u.objectives.flatMap((_, j) => (!u.retiredAt && objectiveRetiredAt(u, j) ? [`${i}.${j}`] : [])));
    assert.deepEqual(retiredLines, [], "no single-line retirements remain in a unit that stays");
    for (const at of [...CMPCBS_TRACK.units.map((u) => u.retiredAt), ...(CMPCBS_TRACK.units[0].objectiveRetiredAt ?? [])].filter(Boolean)) {
      assert.ok(Date.parse(at!) <= Date.parse("2026-11-09T00:00:00Z"), "retired as of the decision, not at a future date");
    }
  });
  test("activeUnits leaves retired objectives out", () => {
    const active = activeUnits(CMPCBS_TRACK);
    assert.equal(active.length, 20);
    assert.equal(active[0].title, "Introduction to Computer Science");
    const all = active.flatMap((u) => u.objectives);
    assert.ok(!all.some((o) => /elective|credits|UNIV|Worldview|graduation/i.test(o)), "no logistics line is active");
    assert.ok(!active.some((u) => /composition|religion|bible|theolog/i.test([u.title, ...u.objectives].join(" "))), "no English or religion course is active");
  });
  test("every active unit is taught from at least one dated reference", () => {
    for (const u of activeUnits(CMPCBS_TRACK)) {
      assert.ok((u.sources ?? []).length >= 1, u.title);
      for (const s of u.sources!) {
        assert.match(s.checkedAt, DATE, `${u.title}: ${s.url}`);
        assert.match(s.url, /^https:\/\//);
        assert.ok(s.title.length > 5);
      }
    }
  });
});

describe("REQ-195: only CS, math and IS courses remain (Nick, 2026-11-09)", () => {
  test("the track has no authored lessons and no retired objective has one", () => {
    assert.deepEqual(AUTHORED_LESSONS.CMPCBS ?? {}, {});
    for (const u of CMPCBS_TRACK.units) u.objectives.forEach((o) => assert.equal(hasAuthoredLesson("CMPCBS", o), false, o));
  });
  test("the description no longer offers composition or religion surveys", () => {
    assert.doesNotMatch(CMPCBS_TRACK.description, /composition|Bible|theology|religio/i);
  });
});
