// REQ-275..278: the nursing specialty and advanced practice courses as
// seeded -- each built on its certifying body's current outline (read
// 2026-11-14) at the published weights, with dated sources and outline
// headings on every unit, the credential facts as read, and the placement
// that puts them in the clinical plan behind the study notice. Pure data test
// over the seed modules.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { PCCN_TRACK, PCCN_SIM_OBJECTIVES } from "../supabase/seed/tracks/pccn";
import { CEN_TRACK, CEN_SIM_OBJECTIVES } from "../supabase/seed/tracks/cen";
import { CMSRN_TRACK, CMSRN_SIM_OBJECTIVES } from "../supabase/seed/tracks/cmsrn";
import { FNPAANP_TRACK, FNPANCC_TRACK, FNP_SIM_OBJECTIVES } from "../supabase/seed/tracks/fnp";
import { courseCategoryOf } from "./billing-config";
import { clinicalReasoningFrame } from "./prompts";
import type { SeedTrack } from "../supabase/seed/data";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function commonChecks(t: SeedTrack, title: string, subcategory: string, notAffiliated: RegExp) {
  assert.equal(CATALOG_TRACKS.filter((c) => c.code === t.code).length, 1, `${t.code} once in the catalog`);
  assert.equal(t.title, title);
  assert.match(t.title, /^Prep for an? [^®™]+ (exam|assessment|test)( \(.+\))?$/); // REQ-309
  assert.equal(t.subcategorySlug, subcategory);
  assert.equal(t.credential?.subcategorySlug, subcategory);
  assert.equal(t.trackType, "certification");
  assert.equal(t.requiresAcknowledgement, true);
  assert.equal(t.disclaimerKey, "nursing-clinical-content");
  assert.match(t.description, notAffiliated);
  assert.equal(t.levelFlow, undefined, "levelFlow is switched on by the lead later");
  assert.equal(t.sourceVerifiedAt, "2026-11-14T00:00:00Z");
  assert.ok(t.contentReviewDueAt! > t.sourceVerifiedAt!);
  assert.equal(t.credential?.lastVendorVerifiedAt, "2026-11-14T00:00:00Z");
  assert.equal(courseCategoryOf("healthcare-nursing", subcategory), "clinical");
  assert.equal(clinicalReasoningFrame(subcategory), "the nursing process or clinical-reasoning cycle");
  const all = t.units.flatMap((u) => u.objectives);
  assert.equal(new Set(all).size, all.length, `${t.code}: objectives unique`);
  for (const u of t.units) {
    assert.ok(u.objectives.length >= 2, `${t.code} / ${u.title}`);
    assert.ok((u.gate ?? "").length > 40, `${t.code} / ${u.title} gate`);
    const outline = u.sources?.find((s) => s.kind === "exam_outline" && s.outline?.length);
    assert.ok(outline, `${t.code} / ${u.title} carries outline headings`);
    assert.equal(outline!.checkedAt, "2026-11-14");
    for (const s of u.sources!) {
      assert.match(s.checkedAt, DATE);
      assert.match(s.url, /^https:\/\//);
    }
    const headings = new Set(u.sources!.flatMap((s) => s.outline ?? []).map((h) => h.replace(/^[A-Z0-9]+\. /, "")));
    for (const o of u.objectives) assert.ok(!headings.has(o), `${t.code}: "${o}" copies an outline heading`);
  }
  // Never claims a review by clinicians or experts (lead's instruction, 2026-11-14).
  assert.doesNotMatch(JSON.stringify(t), /\b(expert|clinician|nurse educator|subject matter)s?\b.{0,40}\b(review|approv)/i);
}

describe("REQ-277: Prep for the PCCN Exam", () => {
  test("in the catalog once, as a gated nursing specialty certification in the clinical plan, AACN as provider", () => {
    commonChecks(PCCN_TRACK, "Prep for a progressive care nursing certification exam", "nursing-specialty-certifications", /not affiliated with or endorsed by AACN Certification Corporation/);
    assert.equal(PCCN_TRACK.credential?.providerSlug, "aacn-certification-corp");
    assert.equal(PCCN_TRACK.credential?.basis, "vendor_exam_unpublished_code");
    assert.equal(PCCN_TRACK.credential?.examCode, undefined);
  });

  test("units are AACN's twelve PCCN categories at the printed weights (101, explained)", () => {
    assert.deepEqual(
      activeUnits(PCCN_TRACK).map((u) => u.weight),
      [20, 14, 6, 3, 7, 7, 4, 2, 15, 3, 11, 9]
    );
    assert.equal(sum(PCCN_TRACK.units.map((u) => u.weight!)), 101);
    assert.match(PCCN_TRACK.credential!.publishedWeightsNote!, /not 100 because of rounding/);
    assert.equal(sum(PCCN_TRACK.units.slice(0, 10).map((u) => u.weight!)), 81, "Clinical Judgment as printed");
  });

  test("the credential states the handbook's format and eligibility, read 2026-11-14", () => {
    const c = PCCN_TRACK.credential!;
    assert.equal(c.durationMinutes, 180);
    assert.match(c.questionFormat!, /150 multiple-choice items in 3 hours: 125 scored and 25 unscored/);
    assert.match(c.recommendedExperience!, /1,750 hours/);
    assert.match(c.recommendedExperience!, /2,000/);
    assert.equal(c.effectiveDate, "2024-02-06");
    assert.match(c.passingScorePolicy!, /modified Angoff/);
  });

  test("the sim objectives exist with exactly these titles, in the right units", () => {
    const where = (o: string) => PCCN_TRACK.units.filter((u) => u.objectives.includes(o)).map((u) => u.title);
    assert.deepEqual(where(PCCN_SIM_OBJECTIVES.accessBleed), ["Cardiovascular"]);
    assert.deepEqual(where(PCCN_SIM_OBJECTIVES.copdNiv), ["Respiratory"]);
  });

  test("key values the lessons get come from the dated sources (sepsis, stroke, AKI, transfusion)", () => {
    const kv = (title: string) => PCCN_TRACK.units.find((u) => u.title === title)!.sources!.flatMap((s) => s.keyValues ?? []).join("\n");
    assert.match(kv("Multisystem"), /MAP target 65 mm Hg/);
    assert.match(kv("Neurology"), /185\/110/);
    assert.match(kv("Renal"), /0\.3 mg\/dL within 48 hours/);
    assert.match(kv("Hematology/Immunology/Oncology"), /7 g\/dL/);
  });
});

describe("REQ-276: Prep for the Certified Emergency Nurse (CEN) Exam", () => {
  test("in the catalog once, as a gated nursing specialty certification in the clinical plan, BCEN as provider", () => {
    commonChecks(CEN_TRACK, "Prep for an emergency nursing certification exam", "nursing-specialty-certifications", /not affiliated with or endorsed by the organization that owns or administers this exam/); // REQ-309: BCEN preapproves every third-party use of its marks
    assert.equal(CEN_TRACK.credential?.providerSlug, "bcen");
    assert.equal(CEN_TRACK.credential?.basis, "vendor_exam_unpublished_code");
  });

  test("units are BCEN's eleven categories (effective July 2026), weighted by item count over 150", () => {
    const counts = [18, 17, 17, 14, 10, 13, 15, 11, 10, 13, 12];
    assert.equal(sum(counts), 150);
    const units = activeUnits(CEN_TRACK);
    assert.equal(units.length, 11);
    units.forEach((u, i) => {
      assert.equal(u.rangeLabel, `${counts[i]} of 150 scored items`);
      assert.ok(Math.abs(u.weight! - (counts[i] * 100) / 150) < 0.006, u.title);
    });
    assert.ok(Math.abs(sum(units.map((u) => u.weight!)) - 100) < 0.001);
    assert.equal(CEN_TRACK.credential?.publishedWeightsNote, undefined);
  });

  test("the credential states BCEN's format and passing standard as read 2026-11-14", () => {
    const c = CEN_TRACK.credential!;
    assert.equal(c.durationMinutes, 180);
    assert.match(c.questionFormat!, /175 multiple-choice items/);
    assert.match(c.questionFormat!, /150 scored and 25 unscored/);
    assert.match(c.passingScorePolicy!, /99 of the 150 scored items/);
    assert.match(c.recommendedExperience!, /does not require it/);
    assert.match(CEN_TRACK.sourceUrl!, /BCEN-CEN-ECO-2025-effective-07-2026/);
  });

  test("the sim objectives exist with exactly these titles, and triage carries ESI v5 values", () => {
    const where = (o: string) => CEN_TRACK.units.filter((u) => u.objectives.includes(o)).map((u) => u.title);
    assert.deepEqual(where(CEN_SIM_OBJECTIVES.triage), ["Professional Issues"]);
    assert.deepEqual(where(CEN_SIM_OBJECTIVES.sepsis), ["Medical Emergencies"]);
    const kv = CEN_TRACK.units[10].sources!.flatMap((s) => s.keyValues ?? []).join("\n");
    assert.match(kv, /SpO2 <92%/);
    assert.match(kv, /medical screening examination/);
  });
});

describe("REQ-275: Prep for the CMSRN Exam", () => {
  test("in the catalog once, as a gated nursing specialty certification in the clinical plan, MSNCB as provider", () => {
    commonChecks(CMSRN_TRACK, "Prep for a medical-surgical nursing certification exam", "nursing-specialty-certifications", /not affiliated with or endorsed by the Medical-Surgical Nursing Certification Board/);
    assert.equal(CMSRN_TRACK.credential?.providerSlug, "msncb");
  });

  test("units are MSNCB's five 2023 blueprint domains at 32/15/17/15/21", () => {
    assert.deepEqual(
      activeUnits(CMSRN_TRACK).map((u) => [u.title, u.weight]),
      [
        ["Patient/Care Management", 32],
        ["Holistic Patient Care", 15],
        ["Elements of Interprofessional Care", 17],
        ["Professional Concepts", 15],
        ["Nursing Teamwork and Collaboration", 21],
      ]
    );
    const items = CMSRN_TRACK.units.map((u) => Number(/\((\d+) of 125 scored items\)/.exec(u.sources![0].title)![1]));
    assert.deepEqual(items, [40, 19, 21, 19, 26]);
    assert.equal(sum(items), 125);
  });

  test("the credential states MSNCB's format, passing standard and eligibility as read 2026-11-14", () => {
    const c = CMSRN_TRACK.credential!;
    assert.equal(c.durationMinutes, 180);
    assert.match(c.questionFormat!, /150 multiple-choice questions in 3 hours: 125 scored and 25 unscored/);
    assert.match(c.passingScorePolicy!, /standard score of 95/);
    assert.match(c.recommendedExperience!, /2,000 practice hours/);
  });

  test("sim objectives exist with exactly these titles; the Code of Ethics is the 2025 revision", () => {
    const where = (o: string) => CMSRN_TRACK.units.filter((u) => u.objectives.includes(o)).map((u) => u.title);
    assert.deepEqual(where(CMSRN_SIM_OBJECTIVES.postopBleed), ["Patient/Care Management"]);
    assert.deepEqual(where(CMSRN_SIM_OBJECTIVES.delegation), ["Nursing Teamwork and Collaboration"]);
    assert.ok(CMSRN_TRACK.units[3].objectives.some((o) => /Code of Ethics for Nurses \(2025 revision\)/.test(o)));
  });
});

describe("REQ-278: two FNP courses, one per exam (AANPCB and ANCC)", () => {
  test("both in the catalog once, under advanced practice nursing, gated, in the clinical plan", () => {
    commonChecks(FNPAANP_TRACK, "Prep for a family nurse practitioner board certification exam (clinical practice focus)", "advanced-practice-nursing", /not affiliated with or endorsed by the organization that owns or administers this exam/);
    commonChecks(FNPANCC_TRACK, "Prep for a family nurse practitioner board certification exam (with professional role topics)", "advanced-practice-nursing", /not affiliated with or endorsed by the organization that owns or administers this exam/);
    assert.notEqual(FNPAANP_TRACK.credential!.credentialSlug, FNPANCC_TRACK.credential!.credentialSlug);
  });

  test("AANPCB: four practice domains at the web blueprint's 32/26.5/26.5/15 (43/36/36/20 of 135), age bands as key values", () => {
    assert.deepEqual(activeUnits(FNPAANP_TRACK).map((u) => [u.title, u.weight]), [["Assess", 32], ["Diagnose", 26.5], ["Plan", 26.5], ["Evaluate", 15]]);
    const c = FNPAANP_TRACK.credential!;
    assert.equal(c.durationMinutes, 180);
    assert.match(c.questionFormat!, /150 multiple-choice questions in 3 hours, linear \(every candidate answers the full form\): 135 scored and 15 unscored/);
    assert.match(c.recommendedExperience!, /500 faculty-supervised/);
    const kv = FNPAANP_TRACK.units[0].sources!.flatMap((x) => x.keyValues ?? []).join("\n");
    assert.match(kv, /Older Adult 40 \(30%\)/);
  });

  test("ANCC: five domains at the TCO's printed 17/17/19/33/13 (99, explained), effective 2026-10-30, 3.5 hours", () => {
    assert.deepEqual(
      activeUnits(FNPANCC_TRACK).map((u) => [u.title, u.weight]),
      [["Assessment", 17], ["Diagnosis", 17], ["Planning", 19], ["Implementation", 33], ["Evaluation", 13]]
    );
    const c = FNPANCC_TRACK.credential!;
    assert.match(c.publishedWeightsNote!, /total 99/);
    assert.equal(c.effectiveDate, "2026-10-30");
    assert.equal(c.durationMinutes, 210);
    assert.match(c.questionFormat!, /175 questions in 3.5 hours, linear \(every candidate answers the full form\): 150 scored and 25 unscored/);
    const impl = FNPANCC_TRACK.units[3];
    assert.ok(impl.sources![0].outline!.some((l) => /artificial intelligence/.test(l)), "ANCC's 2026 outline names AI");
  });

  test("the blueprints differ materially, which is why there are two courses", () => {
    assert.notEqual(FNPAANP_TRACK.units.length, FNPANCC_TRACK.units.length);
    assert.notEqual(FNPAANP_TRACK.credential!.durationMinutes, FNPANCC_TRACK.credential!.durationMinutes);
    assert.ok(!FNPAANP_TRACK.units.some((u) => /Implementation/.test(u.title)));
  });

  test("the red-flag sim objective is in both courses' diagnosis units; screening values are USPSTF's as read", () => {
    assert.deepEqual(FNPAANP_TRACK.units.filter((u) => u.objectives.includes(FNP_SIM_OBJECTIVES.chestPain)).map((u) => u.title), ["Diagnose"]);
    assert.deepEqual(FNPANCC_TRACK.units.filter((u) => u.objectives.includes(FNP_SIM_OBJECTIVES.chestPain)).map((u) => u.title), ["Diagnosis"]);
    const kv = FNPANCC_TRACK.units[0].sources!.flatMap((x) => x.keyValues ?? []).join("\n");
    assert.match(kv, /ages 45-49 \(B\) and 50-75 \(A\)/);
    assert.match(kv, /biennial mammography ages 40-74/);
  });
});
