// REQ-239 (wave 2): the NCE and NCMHCE courses as seeded -- NBCC's six
// domains at the published weights (the NCMHCE's Areas of Clinical Focus at
// 0, assessed through the cases), the official outline headings on every
// unit, the format and scoring read 2026-11-11, the five sim objectives with
// exact titles, and the counseling-licensure subcategory that puts both
// behind the mental health 18+ gate and the clinical rules. Pure data test
// over the seed modules; no database (the gate itself is exercised in
// lib/mature-content.dbtest.ts).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { NCE_TRACK, NCMHCE_TRACK, NCE_SIM_OBJECTIVES, NCMHCE_SIM_OBJECTIVES } from "../supabase/seed/tracks/nbcc";
import { courseCategoryOf } from "./billing-config";
import { unitReferenceLines } from "./current-facts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DOMAINS = [
  "Professional Practice and Ethics",
  "Intake, Assessment, and Diagnosis",
  "Areas of Clinical Focus",
  "Treatment Planning",
  "Counseling Skills and Interventions",
  "Core Counseling Attributes",
];

describe("REQ-239: Prep for the NCE and Prep for the NCMHCE", () => {
  test("each is in the catalog once, under counseling licensure, as a gated certification course", () => {
    for (const [t, title] of [
      [NCE_TRACK, "Prep for the NCE"],
      [NCMHCE_TRACK, "Prep for the NCMHCE"],
    ] as const) {
      assert.equal(CATALOG_TRACKS.filter((c) => c.code === t.code).length, 1);
      assert.equal(t.title, title);
      assert.equal(t.subcategorySlug, "counseling-licensure");
      assert.equal(t.credential?.subcategorySlug, "counseling-licensure");
      assert.equal(t.trackType, "certification");
      assert.equal(t.requiresAcknowledgement, true);
      assert.equal(t.disclaimerKey, "mental-health-clinical-content");
      assert.match(t.description, /not affiliated with or endorsed by the National Board for Certified Counselors/);
      assert.match(t.description, /18\+/);
      assert.equal(t.credential?.basis, "regulatory_licensure");
      assert.equal(t.credential?.providerSlug, "nbcc");
    }
  });

  test("NCE units are NBCC's six domains at 12/12/29/9/30/8 (content outline 2023, read 2026-11-11)", () => {
    assert.deepEqual(
      activeUnits(NCE_TRACK).map((u) => [u.title, u.weight]),
      DOMAINS.map((d, i) => [d, [12, 12, 29, 9, 30, 8][i]])
    );
    for (const u of NCE_TRACK.units) assert.equal(u.rangeLabel, `${u.weight}% of the exam`);
  });

  test("NCMHCE units are the same domains at 15/25/0/15/30/15; Areas of Clinical Focus is assessed through the cases", () => {
    assert.deepEqual(
      activeUnits(NCMHCE_TRACK).map((u) => [u.title, u.weight]),
      DOMAINS.map((d, i) => [d, [15, 25, 0, 15, 30, 15][i]])
    );
    const focus = NCMHCE_TRACK.units[2];
    assert.match(focus.rangeLabel!, /case studies/);
    assert.ok(focus.objectives.length >= 6, "still taught: the cases are built on it");
  });

  test("every unit carries its domain's official outline headings, dated, rechecked before NBCC's 2027-07-01 change", () => {
    const letters = [24, 21, 50, 16, 49, 13]; // A-X, A-U, A-AX, A-P, A-AW, A-M
    for (const t of [NCE_TRACK, NCMHCE_TRACK]) {
      t.units.forEach((u, i) => {
        const outline = u.sources!.find((s) => s.outline?.length);
        assert.ok(outline, `${t.code} / ${u.title} has outline statements`);
        assert.equal(outline!.kind, "exam_outline");
        assert.equal(outline!.outline!.length, letters[i], `${t.code} / ${u.title}`);
        assert.match(outline!.outline![0], /^A\. /);
        assert.equal(outline!.checkedAt, "2026-11-11");
        assert.ok(outline!.recheckBy! < "2027-07-01");
        for (const s of u.sources!) {
          assert.match(s.checkedAt, DATE);
          assert.match(s.url, /^https:\/\//);
        }
      });
      assert.ok(t.contentReviewDueAt! < "2027-07-01T00:00:00Z", `${t.code} is reviewed before the new blueprint`);
    }
  });

  test("objectives are unique, our own wording, and every unit has a gate", () => {
    for (const t of [NCE_TRACK, NCMHCE_TRACK]) {
      const all = t.units.flatMap((u) => u.objectives);
      assert.equal(new Set(all).size, all.length, t.code);
      assert.ok(all.length >= 50, `${t.code}: ${all.length}`);
      const headings = new Set(t.units.flatMap((u) => u.sources!.flatMap((s) => s.outline ?? [])).map((h) => h.replace(/^[A-Z]+\. /, "")));
      for (const o of all) assert.ok(!headings.has(o), `${t.code}: "${o}" copies an outline heading`);
      for (const u of t.units) {
        assert.ok(u.objectives.length >= 6, `${t.code} / ${u.title}`);
        assert.ok((u.gate ?? "").length > 40, `${t.code} / ${u.title}`);
      }
    }
  });

  test("the sim objectives exist with exactly these titles, in the right domains", () => {
    const where = (t: typeof NCE_TRACK, title: string) => t.units.filter((u) => u.objectives.includes(title)).map((u) => u.title);
    assert.deepEqual(where(NCE_TRACK, NCE_SIM_OBJECTIVES.boundaries), ["Professional Practice and Ethics"]);
    assert.deepEqual(where(NCE_TRACK, NCE_SIM_OBJECTIVES.substance), ["Intake, Assessment, and Diagnosis"]);
    assert.deepEqual(where(NCMHCE_TRACK, NCMHCE_SIM_OBJECTIVES.intake), ["Intake, Assessment, and Diagnosis"]);
    assert.deepEqual(where(NCMHCE_TRACK, NCMHCE_SIM_OBJECTIVES.suicide), ["Intake, Assessment, and Diagnosis"]);
    assert.deepEqual(where(NCMHCE_TRACK, NCMHCE_SIM_OBJECTIVES.trauma), ["Treatment Planning"]);
  });

  test("the credentials state NBCC's format and scoring as read, and Washington's rule", () => {
    const nce = NCE_TRACK.credential!;
    assert.equal(nce.examCode, "NCE");
    assert.equal(nce.durationMinutes, 255);
    assert.match(nce.questionFormat!, /200 multiple-choice items/);
    assert.match(nce.questionFormat!, /160 are scored and 40 are unscored/);
    assert.match(nce.passingScorePolicy!, /modified Angoff/);
    const nc = NCMHCE_TRACK.credential!;
    assert.equal(nc.examCode, "NCMHCE");
    assert.equal(nc.durationMinutes, 255);
    assert.match(nc.questionFormat!, /11 clinical case studies, one of them unscored/);
    assert.match(nc.questionFormat!, /initial intake summary and two later counseling sessions/);
    assert.match(nc.questionFormat!, /9 to 15 per case, each with four options/);
    assert.match(nc.questionFormat!, /100 scored/);
    for (const c of [nce, nc]) {
      assert.match(c.recommendedExperience!, /WAC 246-809-240/);
      assert.match(c.versionNote!, /2027-07-01/);
      assert.equal(c.status, "active");
    }
  });

  test("the lesson writer gets the outline headings and the case format for an NCMHCE unit", () => {
    const lines = unitReferenceLines(NCMHCE_TRACK, "Intake, Assessment, and Diagnosis").join("\n");
    assert.match(lines, /F\. Perform a Mental Status Exam \(MSE\)/);
    assert.match(lines, /initial intake summary and two counseling sessions/);
  });

  test("paid plans: both are in the clinical plan with the other mental health courses", () => {
    assert.equal(courseCategoryOf("mental-health", "counseling-licensure"), "clinical");
  });
});
