// REQ-286 / REQ-287: the ASWB Clinical and Masters courses and the Washington
// psychology jurisprudence course as seeded -- ASWB's 2026 content areas at the
// published weights with every applied knowledge statement as outline,
// the format and scoring read 2026-11-14, the sim-ready objective titles, the
// NASW recheck before its 2026-11-18 vote, and for the jurisprudence course the
// study-emphasis weights (no published blueprint), DOH's reference list as the
// outline, the first-CE-cycle rule and no invented format or passing score.
// All three sit in the mental-health category, so the per-course 18+
// acknowledgment applies (lib/mature-content.ts, MATURE_CATEGORIES). Pure data
// test over the seed modules.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { ASWB_CLINICAL_TRACK, ASWB_MASTERS_TRACK, ASWB_CLINICAL_SIM_OBJECTIVES, ASWB_MASTERS_SIM_OBJECTIVES } from "../supabase/seed/tracks/aswb";
import { WA_JP_TRACK } from "../supabase/seed/tracks/wa-psych-jurisprudence";
import { EPPP_TRACK } from "../supabase/seed/tracks/eppp";
import { courseCategoryOf } from "./billing-config";
import { MATURE_CATEGORIES } from "./mature-content";
import { unitReferenceLines } from "./current-facts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AREAS = ["Values and Ethics", "Assessment and Planning", "Intervention and Practice"];

describe("REQ-286: Prep for the ASWB Clinical Exam and Prep for the ASWB Masters Exam", () => {
  test("each is in the catalog once, under social work licensure, gated, with the independence statement", () => {
    for (const [t, title] of [
      [ASWB_CLINICAL_TRACK, "Exam Prep for ASWB Clinical Examination"],
      [ASWB_MASTERS_TRACK, "Exam Prep for ASWB Masters Examination"],
    ] as const) {
      assert.equal(CATALOG_TRACKS.filter((c) => c.code === t.code).length, 1);
      assert.equal(t.title, title);
      assert.equal(t.subcategorySlug, "social-work-licensure");
      assert.equal(t.credential?.subcategorySlug, "social-work-licensure");
      assert.equal(t.trackType, "certification");
      assert.equal(t.requiresAcknowledgement, true);
      assert.equal(t.disclaimerKey, "mental-health-clinical-content");
      assert.match(t.description, /not affiliated with or endorsed by the Association of Social Work Boards/);
      assert.match(t.description, /18\+/);
      assert.equal(t.credential?.basis, "regulatory_licensure");
      assert.equal(t.credential?.providerSlug, "aswb");
      assert.equal(t.credential?.effectiveDate, "2026-08-03");
    }
  });

  test("units are ASWB's three 2026 content areas at the published weights (guidebook August 2026, read 2026-11-14)", () => {
    assert.deepEqual(activeUnits(ASWB_CLINICAL_TRACK).map((u) => [u.title, u.weight]), AREAS.map((a, i) => [a, [36, 32, 32][i]]));
    assert.deepEqual(activeUnits(ASWB_MASTERS_TRACK).map((u) => [u.title, u.weight]), AREAS.map((a, i) => [a, [35, 33, 32][i]]));
    for (const t of [ASWB_CLINICAL_TRACK, ASWB_MASTERS_TRACK]) for (const u of t.units) assert.equal(u.rangeLabel, `${u.weight}% of the exam`);
  });

  test("every unit carries all of its area's applied knowledge statements, coded by competency, dated", () => {
    // Clinical 28 / 40 / 48 = 116; Masters 27 / 39 / 43 = 109 (counted in the guidebook).
    const counts = { ASWBCLINICAL: [28, 40, 48], ASWBMASTERS: [27, 39, 43] } as Record<string, number[]>;
    for (const t of [ASWB_CLINICAL_TRACK, ASWB_MASTERS_TRACK]) {
      t.units.forEach((u, i) => {
        const outline = u.sources!.find((s) => s.outline?.length)!;
        assert.equal(outline.kind, "exam_outline");
        assert.equal(outline.outline!.length, counts[t.code][i], `${t.code} / ${u.title}`);
        const roman = ["I", "II", "III"][i];
        for (const line of outline.outline!) assert.match(line, new RegExp(`^${roman}[A-D] [A-Z]`), line);
        for (const s of u.sources!) {
          assert.match(s.checkedAt, DATE);
          assert.equal(s.checkedAt, "2026-11-14");
          assert.match(s.url, /^https:\/\//);
        }
      });
      assert.equal(t.contentReviewDueAt, "2027-05-14T00:00:00Z");
    }
    // Only the Clinical outline has the DSM statement and research ethics.
    const all = (t: typeof ASWB_CLINICAL_TRACK) => t.units.flatMap((u) => u.sources!.flatMap((s) => s.outline ?? [])).join("\n");
    assert.match(all(ASWB_CLINICAL_TRACK), /Diagnostic and Statistical Manual/);
    assert.doesNotMatch(all(ASWB_MASTERS_TRACK), /Diagnostic and Statistical Manual/);
    assert.match(all(ASWB_CLINICAL_TRACK), /Research ethics/);
    assert.match(all(ASWB_MASTERS_TRACK), /Social change and social planning methods/);
  });

  test("objectives are unique, our own wording, and every unit has a gate", () => {
    for (const t of [ASWB_CLINICAL_TRACK, ASWB_MASTERS_TRACK]) {
      const all = t.units.flatMap((u) => u.objectives);
      assert.equal(new Set(all).size, all.length, t.code);
      assert.ok(all.length >= 60, `${t.code}: ${all.length}`);
      const statements = new Set(t.units.flatMap((u) => u.sources!.flatMap((s) => s.outline ?? [])).map((h) => h.replace(/^[IV]+[A-D] [^:]+: /, "").toLowerCase()));
      for (const o of all) assert.ok(!statements.has(o.toLowerCase()), `${t.code}: "${o}" copies an outline statement`);
      for (const u of t.units) assert.ok((u.gate ?? "").length > 40, `${t.code} / ${u.title}`);
    }
  });

  test("the sim-ready objectives exist with exactly these titles, in the right areas", () => {
    const where = (t: typeof ASWB_CLINICAL_TRACK, title: string) => t.units.filter((u) => u.objectives.includes(title)).map((u) => u.title);
    assert.deepEqual(where(ASWB_CLINICAL_TRACK, ASWB_CLINICAL_SIM_OBJECTIVES.risk), ["Assessment and Planning"]);
    assert.deepEqual(where(ASWB_CLINICAL_TRACK, ASWB_CLINICAL_SIM_OBJECTIVES.threat), ["Values and Ethics"]);
    assert.deepEqual(where(ASWB_MASTERS_TRACK, ASWB_MASTERS_SIM_OBJECTIVES.involuntary), ["Intervention and Practice"]);
    assert.deepEqual(where(ASWB_MASTERS_TRACK, ASWB_MASTERS_SIM_OBJECTIVES.report), ["Values and Ethics"]);
  });

  test("the credentials state the 2026 format and scoring as read, Washington's rule, and the NASW recheck before its vote", () => {
    for (const t of [ASWB_CLINICAL_TRACK, ASWB_MASTERS_TRACK]) {
      const c = t.credential!;
      assert.equal(c.durationMinutes, 240);
      assert.match(c.questionFormat!, /122 multiple-choice questions in two sections of 61/);
      assert.match(c.questionFormat!, /110 are scored and 12 are unscored/);
      assert.match(c.passingScorePolicy!, /90-day wait/);
      assert.match(c.recommendedExperience!, /WAC 246-809-340/);
      assert.equal(c.status, "active");
      const nasw = t.units[0].sources!.find((s) => /NASW/.test(s.title))!;
      assert.ok(nasw.recheckBy! <= "2026-12-31", "NASW Code rechecked soon after the 2026-11-18 vote");
      assert.ok(nasw.keyValues!.some((k) => /1\.07\(c\)/.test(k)));
    }
    assert.equal(ASWB_CLINICAL_TRACK.credential!.examCode, "ASWB Clinical");
    assert.equal(ASWB_MASTERS_TRACK.credential!.examCode, "ASWB Masters");
    assert.match(ASWB_MASTERS_TRACK.credential!.recommendedExperience!, /not the Masters/);
  });

  test("the lesson writer gets the competency-coded statements and the format for a unit", () => {
    const lines = unitReferenceLines(ASWB_CLINICAL_TRACK, "Assessment and Planning").join("\n");
    assert.match(lines, /IIB Assessment methods and techniques: Components and function of the mental status examination/);
    assert.match(lines, /110 scored and 12 unscored/);
  });
});

describe("REQ-287: Prep for the Washington Psychology Jurisprudence Exam", () => {
  test("modeled on the closest course, the EPPP: psychology licensure, certification, regulatory licensure, gated", () => {
    assert.equal(CATALOG_TRACKS.filter((c) => c.code === "WAPSYCHJP").length, 1);
    assert.equal(WA_JP_TRACK.title, "Exam Prep for Washington Psychology Jurisprudence Examination"); // REQ-324
    assert.equal(WA_JP_TRACK.subcategorySlug, EPPP_TRACK.subcategorySlug);
    assert.equal(WA_JP_TRACK.credential?.subcategorySlug, "psychology-licensure");
    assert.equal(WA_JP_TRACK.trackType, EPPP_TRACK.trackType);
    assert.equal(WA_JP_TRACK.credential?.basis, "regulatory_licensure");
    assert.equal(WA_JP_TRACK.requiresAcknowledgement, true);
    assert.equal(WA_JP_TRACK.disclaimerKey, EPPP_TRACK.disclaimerKey);
    assert.match(WA_JP_TRACK.description, /Not legal advice/);
    assert.match(WA_JP_TRACK.description, /18\+/);
  });

  test("no blueprint is published, so the weights are a study emphasis, never '% of the exam'", () => {
    assert.equal(WA_JP_TRACK.credential?.domainWeights, "study_emphasis");
    assert.equal(activeUnits(WA_JP_TRACK).reduce((a, u) => a + (u.weight ?? 0), 0), 100);
    for (const u of WA_JP_TRACK.units) assert.doesNotMatch(u.rangeLabel ?? "", /of the exam/, u.title);
    assert.match(WA_JP_TRACK.credential!.questionFormat!, /does not publish/);
    assert.match(WA_JP_TRACK.credential!.passingScorePolicy!, /does not publish a passing score/);
    assert.equal(WA_JP_TRACK.credential!.durationMinutes, undefined);
  });

  test("the first-CE-cycle rule (WAC 246-924-230, effective 2025-08-14) is stated", () => {
    assert.match(WA_JP_TRACK.credential!.recommendedExperience!, /first three-year continuing education cycle/);
    assert.match(WA_JP_TRACK.credential!.recommendedExperience!, /2025-08-14/);
    const ce = WA_JP_TRACK.units[1].sources!.flatMap((s) => s.keyValues ?? []).join(" ");
    assert.match(ce, /60 CE hours every three years/);
    assert.match(ce, /jurisprudence exam within the first CE cycle/);
  });

  test("every unit cites DOH's reference list as its outline, every source dated 2026-11-14 at a Washington government site", () => {
    for (const u of WA_JP_TRACK.units) {
      const outline = u.sources!.find((s) => s.outline?.length)!;
      assert.ok(outline, u.title);
      assert.equal(outline.outline!.length, 9);
      assert.match(outline.outline![0], /18\.83 RCW/);
      for (const s of u.sources!) {
        assert.equal(s.checkedAt, "2026-11-14");
        assert.match(s.url, /^https:\/\/(app\.leg\.wa\.gov|doh\.wa\.gov)\//);
        assert.ok(s.recheckBy! <= "2027-06-30", "rechecked before RCW 70.02.230 changes on 2027-06-30");
      }
      assert.ok(u.objectives.length >= 3, u.title);
    }
    assert.ok(WA_JP_TRACK.contentReviewDueAt! < "2027-06-30T00:00:00Z");
  });

  test("key values carry the numbers the labs ask for, as read in the rules", () => {
    const all = WA_JP_TRACK.units.flatMap((u) => u.sources!.flatMap((s) => s.keyValues ?? [])).join("\n");
    assert.match(all, /at least eight years after last contact, and for a minor until age 22/);
    assert.match(all, /five years after services end with a former client and two years with a key party/);
    assert.match(all, /no case later than 48 hours/);
    assert.match(all, /up to \$5,000 per violation/);
    assert.match(all, /reasonably identifiable victim/);
  });
});

describe("REQ-286 / REQ-287: all three behind the mental health gate and in the clinical plan", () => {
  test("the categories are gated and clinical", () => {
    assert.ok((MATURE_CATEGORIES as readonly string[]).includes("mental-health"));
    assert.equal(courseCategoryOf("mental-health", "social-work-licensure"), "clinical");
    assert.equal(courseCategoryOf("mental-health", "psychology-licensure"), "clinical");
  });
});
