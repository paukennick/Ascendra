// REQ-270..274: the ISC2 (CC, CISSP), ISACA (CISM) and EC-Council (CEH)
// courses as seeded -- the published domains and weights of the outlines
// read 2026-11-14, the outline headings on every unit, the exam format and
// scoring facts, the review dates that come before each body's next change,
// the descriptive titles and independence notices, and the IT certifications
// subcategory (it_cloud plan). Pure data test over the seed modules; no
// database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { ISC2CC_TRACK, CISSP_TRACK } from "../supabase/seed/tracks/isc2";
import { CISM_TRACK } from "../supabase/seed/tracks/isaca";
import { CEH_TRACK, CEH_DOMAIN_QUESTIONS } from "../supabase/seed/tracks/eccouncil";
import { courseCategoryOf } from "./billing-config";
import { unitReferenceLines } from "./current-facts";
import type { SeedTrack } from "../supabase/seed/data";

const CHECKED = "2026-11-14";
const TRACKS: SeedTrack[] = [ISC2CC_TRACK, CISSP_TRACK, CISM_TRACK, CEH_TRACK];
const weights = (t: SeedTrack) => activeUnits(t).map((u) => [u.title, u.weight]);

describe("REQ-270..274: ISC2, ISACA and EC-Council security courses", () => {
  test("each is in the catalog once, under IT & Software > IT Certifications, titled descriptively with an independence notice", () => {
    const want: Record<string, [string, RegExp]> = {
      ISC2CC: ["Prep for the ISC2 Certified in Cybersecurity (CC®) Exam", /not affiliated with or endorsed by ISC2\. ISC2 and CC are registered marks of ISC2, Inc\.$/],
      CISSP: ["Prep for the CISSP® Exam", /not affiliated with or endorsed by ISC2\. ISC2 and CISSP are registered marks of ISC2, Inc\.$/],
      CISM: ["Prep for the CISM® Exam", /not affiliated with or endorsed by ISACA\. CISM is a registered trademark of ISACA\.$/],
      CEH: ["Prep for the CEH® Exam", /not affiliated with or endorsed by EC-Council\. CEH and Certified Ethical Hacker are registered trademarks of EC-Council\.$/],
    };
    for (const t of TRACKS) {
      assert.equal(CATALOG_TRACKS.filter((c) => c.code === t.code).length, 1, t.code);
      assert.equal(t.title, want[t.code][0]);
      assert.match(t.title, /^Prep for the .+ Exam$/);
      assert.match(t.description, want[t.code][1], t.code);
      assert.equal(t.subcategorySlug, "it-certifications");
      assert.equal(t.credential?.subcategorySlug, "it-certifications");
      assert.equal(t.freshnessModel, "certification_aligned");
      assert.equal(t.trackType, "certification");
      assert.ok(!t.levelFlow, `${t.code}: levelFlow is the lead's switch`);
      assert.ok(!t.requiresAcknowledgement, `${t.code}: not a clinical course`);
      // Verified only after the check (verify-common.md): the day the outlines were read.
      assert.equal(t.sourceVerifiedAt, "2026-11-14T00:00:00Z", t.code);
      assert.equal(t.credential?.lastVendorVerifiedAt, "2026-11-14T00:00:00Z", t.code);
      assert.ok(t.contentReviewDueAt! > t.sourceVerifiedAt!, t.code);
    }
    // Same plan as the CompTIA courses (it-software -> it_cloud).
    assert.equal(courseCategoryOf("it-software", "it-certifications"), "it_cloud");
  });

  test("CC: the five domains of the outline effective 2026-09-01 at 24/17.3/20/21.3/17.3 (printed; they add to 99.9)", () => {
    assert.deepEqual(weights(ISC2CC_TRACK), [
      ["Security Principles", 24],
      ["Security Governance", 17.3],
      ["Identity And Access Management (IAM) Concepts", 20],
      ["Networking and Cloud Security Concepts", 21.3],
      ["Security Operations and Incident Response", 17.3],
    ]);
    assert.match(ISC2CC_TRACK.credential!.publishedWeightsNote!, /99\.9/);
    const c = ISC2CC_TRACK.credential!;
    assert.equal(c.effectiveDate, "2026-09-01");
    assert.equal(c.durationMinutes, 120);
    assert.match(c.questionFormat!, /100-125 items/);
    assert.match(c.questionFormat!, /25 unscored pretest items/);
    assert.match(c.passingScorePolicy!, /700 out of 1000/);
    assert.match(c.officialObjectivesUrl, /2026\/EXAMS-CC_Exam_Outline-English-Revised-01-2026-Final\.pdf$/);
  });

  test("CC does not teach the replaced October 2025 outline's domains", () => {
    const titles = ISC2CC_TRACK.units.map((u) => u.title);
    for (const old of ["Business Continuity (BC), Disaster Recovery (DR) & Incident Response Concepts", "Access Controls Concepts", "Network Security", "Security Operations"]) {
      assert.ok(!titles.includes(old), old);
    }
  });

  test("CISSP: the eight domains of the outline effective 2024-04-15 at 16/10/13/13/13/12/13/10, reviewed before the 2027-04-15 outline", () => {
    assert.deepEqual(weights(CISSP_TRACK), [
      ["Security and Risk Management", 16],
      ["Asset Security", 10],
      ["Security Architecture and Engineering", 13],
      ["Communication and Network Security", 13],
      ["Identity and Access Management (IAM)", 13],
      ["Security Assessment and Testing", 12],
      ["Security Operations", 13],
      ["Software Development Security", 10],
    ]);
    const c = CISSP_TRACK.credential!;
    assert.equal(c.effectiveDate, "2024-04-15");
    assert.equal(c.durationMinutes, 180);
    assert.match(c.questionFormat!, /100-150 items/);
    assert.match(c.passingScorePolicy!, /700 out of 1000/);
    assert.match(c.passingScorePolicy!, /95% confidence/);
    assert.match(c.versionNote!, /April 15, 2027/);
    assert.ok(CISSP_TRACK.contentReviewDueAt! < "2027-04-15T00:00:00Z");
    for (const u of CISSP_TRACK.units) for (const s of u.sources!) assert.ok(s.recheckBy! < "2027-04-15", `${u.title}: ${s.title}`);
    assert.match(unitReferenceLines(CISSP_TRACK, "Security and Risk Management").join("\n"), /teach the 2024 outline until then/);
  });

  test("CISM: the four domains of the outline used from 2026-11-03 at 18/20/33/29 (not 2022's 17/20/33/30)", () => {
    assert.deepEqual(weights(CISM_TRACK), [
      ["Information Security Governance", 18],
      ["Information Security Risk Management", 20],
      ["Information Security Program", 33],
      ["Incident Management", 29],
    ]);
    const c = CISM_TRACK.credential!;
    assert.equal(c.effectiveDate, "2026-11-03");
    assert.equal(c.durationMinutes, 240);
    assert.match(c.questionFormat!, /150 multiple-choice questions/);
    assert.match(c.passingScorePolicy!, /200 to 800; 450 or higher passes/);
    // The two content areas ISACA's 2026 update added are taught.
    const all = CISM_TRACK.units.flatMap((u) => u.objectives).join("\n");
    assert.match(all, /enterprise architecture/);
    assert.match(all, /information security architecture/);
  });

  test("CEH: blueprint v5.0's nine domains as printed (they add to 101), 125 questions, exam 312-50, reviewed within three months", () => {
    assert.deepEqual(
      activeUnits(CEH_TRACK).map((u) => u.weight),
      [6, 17, 15, 24, 14, 5, 10, 5, 5]
    );
    assert.equal(CEH_DOMAIN_QUESTIONS.reduce((a, b) => a + b, 0), 125);
    CEH_DOMAIN_QUESTIONS.forEach((q, i) => assert.equal(Math.round((q / 125) * 100), CEH_TRACK.units[i].weight, CEH_TRACK.units[i].title));
    const c = CEH_TRACK.credential!;
    assert.equal(c.examCode, "312-50");
    assert.equal(c.basis, "vendor_exam");
    assert.equal(c.durationMinutes, 240);
    assert.match(c.passingScorePolicy!, /60% to 85%/);
    assert.match(c.publishedWeightsNote!, /101/);
    assert.match(c.examRevision!, /v13/);
    assert.ok(CEH_TRACK.contentReviewDueAt! <= "2027-02-14T00:00:00Z");
  });

  test("ISC2 and ISACA print no exam code: their exams are vendor_exam_unpublished_code with a version note", () => {
    for (const t of [ISC2CC_TRACK, CISSP_TRACK, CISM_TRACK]) {
      assert.equal(t.credential?.basis, "vendor_exam_unpublished_code", t.code);
      assert.equal(t.credential?.examCode, undefined, t.code);
      assert.ok((t.credential?.versionNote ?? "").length > 40, t.code);
    }
  });

  test("every unit carries its official outline headings, dated the day they were read, with a gate and range label", () => {
    const headings: Record<string, number[]> = {
      ISC2CC: [5, 4, 2, 3, 5],
      CISSP: [12, 6, 10, 3, 6, 5, 15, 5],
      CEH: [1, 3, 3, 5, 3, 1, 2, 1, 1],
    };
    for (const t of TRACKS) {
      t.units.forEach((u, i) => {
        const outline = u.sources!.find((s) => s.outline?.length);
        assert.ok(outline, `${t.code} / ${u.title}`);
        assert.equal(outline!.kind, "exam_outline");
        assert.equal(outline!.checkedAt, CHECKED);
        assert.ok(outline!.recheckBy! <= t.contentReviewDueAt!.slice(0, 10), `${t.code}: recheck by the review date`);
        if (headings[t.code]) {
          const numbered = t.code === "CEH" ? outline!.outline! : outline!.outline!.filter((l) => /^\d+\.\d+ /.test(l));
          assert.equal(numbered.length, headings[t.code][i], `${t.code} / ${u.title}`);
        }
        if (t.code === "CISM") {
          assert.match(outline!.outline![0], /^A\. /);
          assert.match(outline!.outline![1], /^B\. /);
        }
        for (const s of u.sources!) {
          assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
          assert.match(s.url, /^https:\/\//);
        }
        assert.ok(u.gate && u.gate.length > 60, `${t.code} / ${u.title} gate`);
        assert.match(u.rangeLabel!, new RegExp(`^${String(u.weight).replace(".", "\\.")}% of the exam`));
        assert.ok(u.objectives.length >= 2);
      });
    }
  });

  test("CC and CISSP: every numbered outline heading is mapped to an objective (the // x.y markers in the seed)", () => {
    const src = readFileSync(join(__dirname, "..", "supabase", "seed", "tracks", "isc2.ts"), "utf8");
    const [ccPart, cisspPart] = src.split("export const CISSP_TRACK");
    const marked = (part: string) => new Set([...part.matchAll(/\/\/ (\d+\.\d+(?:, \d+\.\d+)*)\n/g)].flatMap((m) => m[1].split(", ")));
    for (const [t, part] of [
      [ISC2CC_TRACK, ccPart.slice(ccPart.indexOf("export const ISC2CC_TRACK"))],
      [CISSP_TRACK, cisspPart],
    ] as const) {
      const have = marked(part);
      const want = t.units.flatMap((u) => u.sources![0].outline!.map((l) => l.split(" ")[0]));
      assert.deepEqual(want.filter((h) => !have.has(h)), [], `${t.code}: headings without an objective`);
    }
  });

  test("the unit reference lines give the writer the outline and the format facts", () => {
    const cc = unitReferenceLines(ISC2CC_TRACK, "Security Governance").join("\n");
    assert.match(cc, /2\.4 Measure cybersecurity effectiveness/);
    assert.match(cc, /700 out of 1000/);
    const cism = unitReferenceLines(CISM_TRACK, "Incident Management").join("\n");
    assert.match(cism, /SOAR, playbooks, UEBA/);
    assert.match(cism, /450 or higher passes/);
    const ceh = unitReferenceLines(CEH_TRACK, "Web Application Hacking").join("\n");
    assert.match(ceh, /SQL Injection: SQL Injection Concepts/);
  });
});
