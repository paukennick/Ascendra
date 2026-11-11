// REQ-224 (batch EPPP-A): the EPPP course as seeded -- ASPPB's Part 1
// domains at their published weights, the three objectives the clinical sims
// attach to by exact title, dated sources on every unit, and the mental
// health category counted as clinical (study notice, 3x sim pace, clinical
// plan). Pure data test over the seed modules; no database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { EPPP_TRACK } from "../supabase/seed/tracks/eppp";
import { labSafetyFamily } from "./lab-grading";
import { labFamilySql } from "./labs";
import { courseCategoryOf } from "./billing-config";
import { pacingFor } from "./sims";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("REQ-224: Prep for the EPPP", () => {
  test("is in the catalog once, under psychology licensure, titled the way Nick asked", () => {
    assert.equal(CATALOG_TRACKS.filter((t) => t.code === "EPPP").length, 1);
    assert.equal(EPPP_TRACK.title, "Prep for the EPPP");
    assert.equal(EPPP_TRACK.subcategorySlug, "psychology-licensure");
    assert.equal(EPPP_TRACK.trackType, "certification");
    assert.equal(EPPP_TRACK.requiresAcknowledgement, true);
    assert.match(EPPP_TRACK.description, /not affiliated with or endorsed by the Association of State and Provincial Psychology Boards/);
    assert.match(EPPP_TRACK.description, /18\+/);
  });

  test("units are ASPPB's eight Part 1-Knowledge domains at the published weights (content areas page, read 2026-11-10)", () => {
    const got = activeUnits(EPPP_TRACK).map((u) => [u.title, u.weight]);
    assert.deepEqual(got, [
      ["Biological Bases of Behavior", 10],
      ["Cognitive-Affective Bases of Behavior", 13],
      ["Social and Cultural Bases of Behavior", 11],
      ["Growth and Lifespan Development", 12],
      ["Assessment and Diagnosis", 16],
      ["Treatment, Intervention, Prevention, and Supervision", 15],
      ["Research Methods and Statistics", 7],
      ["Ethical, Legal, and Professional Issues", 16],
    ]);
    assert.equal(got.reduce((a, [, w]) => a + (w as number), 0), 100);
    assert.equal(EPPP_TRACK.credential?.publishedWeightsNote, undefined);
  });

  test("the three sim objectives exist with exactly these titles, in the right domains", () => {
    const where = (title: string) => EPPP_TRACK.units.filter((u) => u.objectives.includes(title)).map((u) => u.title);
    assert.deepEqual(where("Assess suicide risk and plan safety in a clinical interview"), ["Assessment and Diagnosis"]);
    assert.deepEqual(where("Conduct a diagnostic intake using DSM-5-TR criteria"), ["Assessment and Diagnosis"]);
    assert.deepEqual(where("Apply duty-to-warn and duty-to-protect obligations"), ["Ethical, Legal, and Professional Issues"]);
  });

  test("objectives are unique, non-trivial and every unit has a gate and dated sources", () => {
    const all = EPPP_TRACK.units.flatMap((u) => u.objectives);
    assert.equal(new Set(all).size, all.length);
    assert.ok(all.length >= 80, `objective count ${all.length}`);
    for (const u of EPPP_TRACK.units) {
      assert.ok(u.objectives.length >= 6, u.title);
      assert.ok((u.gate ?? "").length > 40, u.title);
      assert.equal(u.rangeLabel, `${u.weight}% of the exam`);
      assert.ok((u.sources ?? []).length >= 1, u.title);
      for (const s of u.sources!) {
        assert.match(s.checkedAt, DATE);
        assert.match(s.url, /^https:\/\//);
        if (s.recheckBy) assert.ok(s.recheckBy > s.checkedAt, s.url);
      }
    }
    const ethics = EPPP_TRACK.units.find((u) => u.title.startsWith("Ethical"))!;
    assert.ok(ethics.sources!.some((s) => s.url === "https://www.apa.org/ethics/code"));
    const assess = EPPP_TRACK.units.find((u) => u.title === "Assessment and Diagnosis")!;
    assert.ok(assess.sources!.some((s) => /psychiatry\.org/.test(s.url)));
  });

  test("the credential states ASPPB's format and scoring and Washington's rule", () => {
    const c = EPPP_TRACK.credential!;
    assert.equal(c.basis, "regulatory_licensure");
    assert.equal(c.examCode, "EPPP Part 1");
    assert.equal(c.durationMinutes, 255);
    assert.match(c.questionFormat!, /225 multiple-choice items/);
    assert.match(c.questionFormat!, /175 are scored and 50 are unscored/);
    assert.match(c.passingScorePolicy!, /500/);
    assert.match(c.recommendedExperience!, /WAC 246-924-070/);
    assert.equal(c.retirementDate, "2028-03-31");
    // Review the course before ASPPB's Q4 2027 switch to the integrated EPPP.
    assert.ok(EPPP_TRACK.contentReviewDueAt! < "2027-10-01");
  });
});

describe("REQ-224: the mental health category is clinical", () => {
  test("labs and sims: family clinical in both the coach rule and the SQL rule", () => {
    assert.equal(labSafetyFamily({ categorySlug: "mental-health" }), "clinical");
    assert.match(labFamilySql("st"), /ec\.slug = 'mental-health' then 'clinical'/);
  });
  test("a running-clock sim in a mental health course gets the 3x study pace by default", () => {
    const running = { phases: { p: { clock: "running" } } } as never;
    assert.deepEqual(pacingFor(running, "clinical"), { eligible: true, studyPace: 3, examPace: 1, defaultPace: 3 });
    assert.equal(pacingFor(running, "general").defaultPace, 1);
  });
  test("paid plans: mental health courses are in the clinical plan", () => {
    assert.equal(courseCategoryOf("mental-health", "psychology-licensure"), "clinical");
  });
});
