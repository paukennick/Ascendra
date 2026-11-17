// REQ-280 / REQ-281: the Scrum (PSM I, CSM), ITIL 4 Foundation, ASQ CSSGB
// and NASM Certified Nutrition Coach courses as seeded -- weights as
// published (ITIL marks, CSSGB question counts) or flagged as study emphasis
// (PSM I, CSM, NASM CNC publish none), dated outline statements on every
// unit, the formats read 2026-11-14, the subcategories (migration 084) and
// plans, the coach's scope on the CNC, and ITIL left unverified until Nick
// decides (its syllabus was read only in a training organization's copy).
// Pure data test over the seed modules; no database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { PSMI_TRACK, CSM_TRACK, ITIL4FND_TRACK, ITIL5FND_TRACK, CSSGB_TRACK } from "../supabase/seed/tracks/pm-frameworks";
import { NASM_CNC_TRACK } from "../supabase/seed/tracks/fitness";
import { courseCategoryOf } from "./billing-config";
import { STUDY_EMPHASIS_TRACK_CODES } from "./readiness";
import { unitReferenceLines } from "./current-facts";

const ALL = [PSMI_TRACK, CSM_TRACK, ITIL4FND_TRACK, ITIL5FND_TRACK, CSSGB_TRACK, NASM_CNC_TRACK];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("REQ-280/281: Scrum, ITIL, Six Sigma and nutrition coach courses", () => {
  test("each is in the catalog once, with an independence statement", () => {
    for (const t of ALL) {
      assert.equal(CATALOG_TRACKS.filter((c) => c.code === t.code).length, 1, t.code);
      assert.equal(t.trackType, "certification");
      assert.match(t.title, /^Prep for (the|an?) /); // REQ-309
      assert.doesNotMatch(t.title, /\bCoach\b/, "REQ-194: no '<mark> Coach' title");
      // REQ-309: Scrum.org's own disclaimer reads "not affiliated with ... and does not constitute an endorsement".
      assert.match(t.description, /not affiliated with or endorsed by|not affiliated with Advanced Development Methods d\/b\/a Scrum\.org \(ADM\) and does not constitute an endorsement/);
    }
  });

  test("subcategories: Scrum and Six Sigma under PM (migration 084), ITIL under IT, CNC under fitness; plans follow", () => {
    assert.equal(PSMI_TRACK.subcategorySlug, "agile-scrum-certifications");
    assert.equal(CSM_TRACK.subcategorySlug, "agile-scrum-certifications");
    assert.equal(CSSGB_TRACK.subcategorySlug, "quality-six-sigma-certifications");
    assert.equal(ITIL4FND_TRACK.subcategorySlug, "it-certifications");
    assert.equal(ITIL5FND_TRACK.subcategorySlug, "it-certifications");
    assert.equal(NASM_CNC_TRACK.subcategorySlug, "fitness");
    for (const t of ALL) assert.equal(t.credential?.subcategorySlug, t.subcategorySlug, t.code);
    const sql = readFileSync(new URL("../supabase/migrations/084_pm_agile_quality_taxonomy.sql", import.meta.url), "utf8");
    assert.match(sql, /'project-management-certifications','agile-scrum-certifications'/);
    assert.match(sql, /'project-management-certifications','quality-six-sigma-certifications'/);
    assert.equal(courseCategoryOf("project-management-certifications", "agile-scrum-certifications"), "pm");
    assert.equal(courseCategoryOf("it-software", "it-certifications"), "it_cloud");
    assert.equal(courseCategoryOf("health-fitness", "fitness"), "fitness");
  });

  test("published weights: ITIL by syllabus marks (5/6/2/1/2/7/17 of 40), CSSGB by question counts (11/20/20/18/16/15)", () => {
    const marks = [5, 6, 2, 1, 2, 7, 17];
    assert.deepEqual(activeUnits(ITIL4FND_TRACK).map((u) => u.weight), marks.map((m) => (m / 40) * 100));
    ITIL4FND_TRACK.units.forEach((u, i) => assert.equal(u.rangeLabel, `${marks[i]} of 40 marks`));
    assert.deepEqual(activeUnits(CSSGB_TRACK).map((u) => u.weight), [11, 20, 20, 18, 16, 15]);
    for (const t of [ITIL4FND_TRACK, CSSGB_TRACK]) assert.notEqual(t.credential?.domainWeights, "study_emphasis", t.code);
  });

  test("PSM I, CSM and the CNC publish no weights: study emphasis, summing to 100, in the server's list", () => {
    for (const t of [PSMI_TRACK, CSM_TRACK, NASM_CNC_TRACK]) {
      assert.equal(t.credential?.domainWeights, "study_emphasis", t.code);
      assert.equal(sum(t.units.map((u) => u.weight ?? 0)), 100, t.code);
      assert.ok((STUDY_EMPHASIS_TRACK_CODES as readonly string[]).includes(t.code), t.code);
    }
  });

  test("every unit has dated sources with the body's own outline statements, a gate and our own objectives", () => {
    for (const t of ALL) {
      for (const u of t.units) {
        const outline = u.sources?.find((s) => s.outline?.length);
        assert.ok(outline, `${t.code} / ${u.title} has outline statements`);
        assert.equal(outline!.kind, "exam_outline");
        assert.equal(outline!.checkedAt, t.code === "ITIL5FND" ? "2026-11-16" : "2026-11-14");
        for (const s of u.sources!) {
          assert.match(s.checkedAt, DATE);
          assert.match(s.url, /^https:\/\//);
        }
        assert.ok((u.gate ?? "").length > 40, `${t.code} / ${u.title}`);
        assert.ok(u.objectives.length >= 4, `${t.code} / ${u.title}`);
      }
      const all = t.units.flatMap((u) => u.objectives);
      assert.equal(new Set(all).size, all.length, `${t.code}: objectives unique`);
      const headings = new Set(t.units.flatMap((u) => u.sources!.flatMap((s) => s.outline ?? [])).map((h) => h.toLowerCase()));
      for (const o of all) assert.ok(!headings.has(o.toLowerCase()), `${t.code}: "${o}" copies an outline statement`);
    }
  });

  test("Scrum courses teach the 2020 Guide's values as read (timeboxes, accountabilities, commitments)", () => {
    const lines = unitReferenceLines(PSMI_TRACK, "Scrum Events").join("\n");
    assert.match(lines, /15-minute event for the Developers/);
    assert.match(lines, /at most 8 hours for a one-month Sprint/);
    assert.match(lines, /only the Product Owner may cancel a Sprint/);
    const csm = CSM_TRACK.units.flatMap((u) => u.sources!.flatMap((s) => s.outline ?? []));
    assert.equal(csm.filter((s) => /^\d\.\d+ /.test(s)).length, 24 + 28, "all 24 Scrum Foundations and 28 CSM learning objectives");
  });

  test("formats and scoring as read on the bodies' pages on 2026-11-14", () => {
    assert.equal(PSMI_TRACK.credential!.durationMinutes, 60);
    assert.match(PSMI_TRACK.credential!.questionFormat!, /^80 questions/);
    assert.match(PSMI_TRACK.credential!.passingScorePolicy!, /^85%/);
    assert.equal(CSM_TRACK.credential!.durationMinutes, 60);
    assert.match(CSM_TRACK.credential!.questionFormat!, /50 multiple-choice questions/);
    assert.match(CSM_TRACK.credential!.passingScorePolicy!, /^37 of 50/);
    assert.match(CSM_TRACK.description, /16-hour course with a Certified Scrum Trainer/);
    assert.match(CSM_TRACK.description, /does not replace that course/);
    assert.equal(ITIL4FND_TRACK.credential!.durationMinutes, 60);
    assert.match(ITIL4FND_TRACK.credential!.passingScorePolicy!, /26 of 40/);
    assert.equal(CSSGB_TRACK.credential!.durationMinutes, 258);
    assert.match(CSSGB_TRACK.credential!.questionFormat!, /110 multiple-choice questions, 100 scored and 10 unscored/);
    assert.match(CSSGB_TRACK.credential!.passingScorePolicy!, /550 of 750/);
    assert.equal(NASM_CNC_TRACK.credential!.durationMinutes, 90);
    assert.match(NASM_CNC_TRACK.credential!.questionFormat!, /100 multiple-choice questions, fixed length \(every candidate answers the same number of questions\), online and open book/);
    assert.equal(NASM_CNC_TRACK.credential!.passingScorePolicy, "70% or higher.");
  });

  test("verified on the day the check finished, except ITIL, whose syllabus was read only in a copy", () => {
    for (const t of [PSMI_TRACK, CSM_TRACK, CSSGB_TRACK, NASM_CNC_TRACK]) {
      assert.equal(t.sourceVerifiedAt, "2026-11-14T00:00:00Z", t.code);
      assert.equal(t.contentReviewDueAt, "2027-11-14T00:00:00Z", t.code);
    }
    assert.equal(ITIL4FND_TRACK.sourceVerifiedAt, undefined);
    assert.equal(ITIL4FND_TRACK.sourceUrl, undefined);
    assert.ok(ITIL4FND_TRACK.contentReviewDueAt! < "2027-12-31T00:00:00Z", "reviewed before PeopleCert's planned ITIL 4 sunset");
    assert.match(ITIL4FND_TRACK.credential!.versionNote!, /2027-12-31/);
  });

  test("the nutrition coach course stays inside a coach's scope and carries the fitness gate", () => {
    assert.equal(NASM_CNC_TRACK.requiresAcknowledgement, true);
    assert.equal(NASM_CNC_TRACK.disclaimerKey, "fitness-content");
    assert.match(NASM_CNC_TRACK.description, /registered dietitian nutritionist/);
    const objectives = NASM_CNC_TRACK.units.flatMap((u) => u.objectives).join("\n");
    assert.match(objectives, /never diagnosing or providing medical nutrition therapy/);
    assert.match(objectives, /suspected eating disorder/);
    assert.doesNotMatch(objectives, /\b(prescrib|treat(ing)? (diabetes|disease)|meal plan for (diabetes|kidney))/i);
    const lines = unitReferenceLines(NASM_CNC_TRACK, "Nutrition Science").join("\n");
    assert.match(lines, /1\.2-1\.6 g per kg/);
    assert.match(lines, /carbohydrate 45-65%, fat 20-35%, protein 10-35%/);
  });
});

// REQ-308 (Nick, 2026-11-16): the ITIL course switches to ITIL Foundation
// (Version 5). ITIL4FND is hidden, not deleted (it reached production in
// #193 with no learners); ITIL5FND carries the syllabus v5.0 categories and
// weights as read 2026-11-16 and stays unverified, because PeopleCert does
// not publish the syllabus and it was read in a publisher's reproduction.
describe("REQ-308: ITIL Foundation (Version 5) replaces ITIL 4 Foundation", () => {
  test("ITIL4FND is hidden with its reason; ITIL5FND is listed", () => {
    assert.ok(!Number.isNaN(Date.parse(ITIL4FND_TRACK.hiddenAt!)));
    assert.match(ITIL4FND_TRACK.hiddenReason ?? "", /ITIL5FND/);
    assert.match(ITIL4FND_TRACK.hiddenReason ?? "", /https:\/\/peoplecert\.org\/help-and-support\/faq-itil/);
    assert.equal(ITIL5FND_TRACK.hiddenAt, undefined);
    assert.equal(ITIL4FND_TRACK.credential!.status, "transitioning");
    assert.equal(ITIL4FND_TRACK.credential!.retirementDate, "2027-12-31");
    assert.notEqual(ITIL5FND_TRACK.credential!.credentialSlug, ITIL4FND_TRACK.credential!.credentialSlug);
  });

  test("seven units in syllabus order, weighted 30/10/10/40/5/2.5/2.5 as published", () => {
    const w = [30, 10, 10, 40, 5, 2.5, 2.5];
    assert.deepEqual(activeUnits(ITIL5FND_TRACK).map((u) => u.weight), w);
    assert.equal(sum(w), 100);
    ITIL5FND_TRACK.units.forEach((u, i) => {
      assert.match(u.rangeLabel ?? "", new RegExp(`^${w[i]}% of the exam \\(${(w[i] * 40) / 100} of 40 questions\\)$`));
      const outline = u.sources!.find((s) => s.outline?.length)!;
      assert.match(outline.outline![0], new RegExp(`^${i + 1}\\. `), u.title);
    });
    assert.notEqual(ITIL5FND_TRACK.credential?.domainWeights, "study_emphasis");
  });

  test("format as read on PeopleCert's page on 2026-11-16", () => {
    const c = ITIL5FND_TRACK.credential!;
    assert.equal(c.durationMinutes, 60);
    assert.match(c.questionFormat!, /^40 multiple-choice questions in 60 minutes, fixed length \(every candidate answers the same number of questions\), closed book/);
    assert.match(c.questionFormat!, /9 languages/);
    assert.match(c.passingScorePolicy!, /^65%: 26 of 40/);
    assert.equal(c.lastVendorVerifiedAt, "2026-11-16T00:00:00Z");
  });

  test("unverified: no sourceVerifiedAt or sourceUrl, reviewed within six months", () => {
    assert.equal(ITIL5FND_TRACK.sourceVerifiedAt, undefined);
    assert.equal(ITIL5FND_TRACK.sourceUrl, undefined);
    assert.equal(ITIL5FND_TRACK.contentReviewDueAt, "2027-05-16T00:00:00Z");
    assert.match(ITIL5FND_TRACK.credential!.versionNote!, /does not publish/);
    for (const u of ITIL5FND_TRACK.units) for (const s of u.sources!) assert.equal(s.recheckBy, "2027-05-16", `${u.title}: ${s.url}`);
  });

  test("key values: the syllabus's lists (dimensions, lifecycle activities, principles, practice groups)", () => {
    const lines = ITIL5FND_TRACK.units.flatMap((u) => u.sources!.flatMap((s) => s.keyValues ?? [])).join("\n");
    assert.match(lines, /discover; design; acquire; build; transition; operate; deliver; support/);
    assert.match(lines, /organizations and people; partners and suppliers; information and technology; value streams and processes/);
    assert.match(lines, /focus on value; start where you are; progress iteratively with feedback/);
    assert.match(lines, /general management practices, and product and service management practices/);
  });

  test("trademark: descriptive title with ® on first use, PeopleCert group notice, no license claim", () => {
    // REQ-309: PeopleCert grants no descriptive use to non-licensees, so the
    // course names neither the body nor its marks (catalog-trademarks.test.ts).
    assert.equal(ITIL5FND_TRACK.title, "Prep for an IT service management foundation exam (version 5)");
    assert.doesNotMatch(`${ITIL5FND_TRACK.title} ${ITIL5FND_TRACK.description}`, /ITIL|PeopleCert|PRINCE2|AXELOS/);
    assert.match(ITIL5FND_TRACK.description, /not affiliated with or endorsed by the organization that owns or administers this exam\.$/);
  });
});
