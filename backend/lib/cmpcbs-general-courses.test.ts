// REQ-195 (Nick, 2026-11-09): the CMPCBS track is general courses, not one
// school's degree plan. Pure checks on the seed, the labs and the authored
// lessons; the database side (retire on re-seed, retired objectives not
// served) is in lib/cmpcbs-general-courses.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CMPCBS_TRACK } from "../supabase/seed/data";
import { activeUnits, objectiveRetiredAt } from "../supabase/seed/catalog";
import { CMPCBS_LABS } from "../supabase/seed/labs/academic-cmpcbs";
import { AUTHORED_LESSONS, authoredLesson, hasAuthoredLesson } from "./authored-lessons";
import { CMPCBS_BIBLE_SURVEY, CMPCBS_COMPOSITION, CMPCBS_THEOLOGY_SURVEY } from "./authored-lessons-cmpcbs";
import { lessonIntroProblems, lessonPracticeProblems } from "./content-validator";

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
  test("authored lessons name no school, and teach no school course code (source titles may carry their own course numbers)", () => {
    for (const title of Object.keys(AUTHORED_LESSONS.CMPCBS)) {
      const l = authoredLesson({ trackCode: "CMPCBS", objectiveTitle: title })!;
      assert.doesNotMatch(JSON.stringify(l), SCHOOL, title);
      const { sources: _s, ...taught } = AUTHORED_LESSONS.CMPCBS[title];
      assert.doesNotMatch(JSON.stringify(taught), COURSE_CODE, title);
    }
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
    assert.deepEqual(retiredUnits, [1, 2, 3, 4, 26, 27]);
    const retiredLines = CMPCBS_TRACK.units.flatMap((u, i) => u.objectives.flatMap((_, j) => (!u.retiredAt && objectiveRetiredAt(u, j) ? [`${i}.${j}`] : [])));
    assert.deepEqual(retiredLines, ["0.1", "0.2", "0.3"]);
    for (const at of [...CMPCBS_TRACK.units.map((u) => u.retiredAt), ...(CMPCBS_TRACK.units[0].objectiveRetiredAt ?? [])].filter(Boolean)) {
      assert.ok(Date.parse(at!) <= Date.parse("2026-11-09T00:00:00Z"), "retired as of the decision, not at a future date");
    }
  });
  test("activeUnits leaves retired objectives out", () => {
    const active = activeUnits(CMPCBS_TRACK);
    assert.equal(active.length, 22);
    assert.deepEqual(active[0].objectives, [CMPCBS_COMPOSITION]);
    assert.deepEqual(active[1].objectives, [CMPCBS_BIBLE_SURVEY, CMPCBS_THEOLOGY_SURVEY]);
    const all = active.flatMap((u) => u.objectives);
    assert.ok(!all.some((o) => /elective|credits|UNIV|Worldview|graduation/i.test(o)), "no logistics line is active");
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

describe("REQ-195: reframed objectives get authored lessons that cite sources", () => {
  const reframed = [CMPCBS_COMPOSITION, CMPCBS_BIBLE_SURVEY, CMPCBS_THEOLOGY_SURVEY];
  test("exactly the reframed objectives have an authored lesson, and each is an active seeded objective", () => {
    assert.deepEqual(Object.keys(AUTHORED_LESSONS.CMPCBS).sort(), [...reframed].sort());
    const active = new Set(activeUnits(CMPCBS_TRACK).flatMap((u) => u.objectives));
    for (const o of reframed) assert.ok(active.has(o), o);
  });
  test("no retired objective has an authored lesson", () => {
    for (const u of CMPCBS_TRACK.units) {
      u.objectives.forEach((o, j) => {
        if (objectiveRetiredAt(u, j)) assert.equal(hasAuthoredLesson("CMPCBS", o), false, o);
      });
    }
  });
  test("each lesson passes every content check, including the distractor lint", () => {
    for (const o of reframed) {
      const l = authoredLesson({ trackCode: "CMPCBS", objectiveTitle: o })!;
      assert.deepEqual([...lessonIntroProblems(l), ...lessonPracticeProblems(l)], [], o);
      assert.equal(l.teachCards!.cards.length, 4);
      assert.equal(new Set(l.fadeChoices).size, 4);
      assert.equal(new Set(l.soloChoices).size, 4);
      assert.equal(l.fadeOptionReasons!.length, 4);
      assert.equal(l.soloOptionReasons!.length, 4);
    }
  });
  test("each lesson cites at least two dated sources, in its last card and its teaching text", () => {
    for (const o of reframed) {
      const a = AUTHORED_LESSONS.CMPCBS[o];
      assert.ok(a.sources.length >= 2, o);
      for (const s of a.sources) {
        assert.match(s.checkedAt, DATE);
        assert.match(s.url, /^https:\/\//);
      }
      const l = authoredLesson({ trackCode: "CMPCBS", objectiveTitle: o })!;
      const last = l.teachCards!.cards.at(-1)!;
      assert.match(last.body, /Sources \(checked\): /);
      for (const s of a.sources) {
        assert.ok(last.body.includes(s.url) && last.body.includes(s.checkedAt), `${o}: ${s.url}`);
        assert.ok(l.teach.includes(s.url));
      }
    }
  });
  test("the keys are the authored keys after the stored shuffle, the same every time", () => {
    for (const o of reframed) {
      const a = AUTHORED_LESSONS.CMPCBS[o];
      const l = authoredLesson({ trackCode: "CMPCBS", objectiveTitle: o })!;
      assert.equal(l.fadeChoices[l.fadeCorrectIndex], a.practice.fadeChoices[a.practice.fadeCorrectIndex]);
      assert.equal(l.soloChoices[l.soloCorrectIndex], a.practice.soloChoices[a.practice.soloCorrectIndex]);
      assert.deepEqual(authoredLesson({ trackCode: "CMPCBS", objectiveTitle: o }), l);
    }
  });
  test("the religion surveys attribute beliefs instead of stating doctrine as fact", () => {
    for (const o of [CMPCBS_BIBLE_SURVEY, CMPCBS_THEOLOGY_SURVEY]) {
      const l = authoredLesson({ trackCode: "CMPCBS", objectiveTitle: o })!;
      const text = [l.teach, l.fadeProblem, l.soloCheck, l.fadeWhy, l.soloWhy].join(" ");
      // Unattributed statements of doctrine: "God is", "Jesus was", "Christ is", "Scripture is".
      assert.doesNotMatch(text, /(?:^|[.!?]\s+)(?:God|Jesus|Christ|Scripture|The Bible) (?:is|was|are)\b/, o);
      assert.match(text, /without (?:asking you to accept|deciding which is true)/, o);
    }
  });
});
