// REQ-102: every certification track in the seeded catalog carries a
// credential block (exam code, format, passing policy, source) and a
// blueprint whose domain weights describe a whole exam. Pure data test --
// it reads the seed modules, no database. The DB-side counterpart
// (exam_domains as actually seeded) is in lib/exam-blueprints.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";

const sum = (ws: (number | undefined)[]) => ws.reduce<number>((a, w) => a + (w ?? 0), 0);

describe("catalog exam blueprints", () => {
  test("every certification track has a credential block", () => {
    const missing = CATALOG_TRACKS.filter((t) => t.trackType === "certification" && !t.credential).map((t) => t.code);
    assert.deepEqual(missing, []);
  });

  test("every certification track's domain weights sum to 100%, unless the vendor prints otherwise and the seed says why", () => {
    const bad: string[] = [];
    for (const t of CATALOG_TRACKS) {
      if (t.trackType !== "certification") continue;
      const units = activeUnits(t);
      const total = sum(units.map((u) => u.weight));
      const allWeighted = units.every((u) => typeof u.weight === "number");
      const exact = allWeighted && Math.abs(total - 100) < 0.001;
      if (exact) continue;
      const note = t.credential?.publishedWeightsNote;
      if (!note || note.trim().length < 20) bad.push(`${t.code}: ${total}`);
    }
    assert.deepEqual(bad, []);
  });

  test("a weights note is only used where it is needed", () => {
    const unneeded = CATALOG_TRACKS.filter((t) => {
      if (!t.credential?.publishedWeightsNote) return false;
      const units = activeUnits(t);
      return units.every((u) => typeof u.weight === "number") && Math.abs(sum(units.map((u) => u.weight)) - 100) < 0.001;
    }).map((t) => t.code);
    assert.deepEqual(unneeded, []);
  });

  test("weighted degree pathways also total 100% when they carry weights at all", () => {
    const bad = CATALOG_TRACKS.filter((t) => {
      if (t.trackType === "certification" || !t.credential) return false;
      const units = activeUnits(t);
      if (units.every((u) => u.weight == null)) return false;
      return Math.abs(sum(units.map((u) => u.weight)) - 100) >= 0.001;
    }).map((t) => t.code);
    assert.deepEqual(bad, []);
  });

  test("vendor exams name their code, format, passing policy and a verified source", () => {
    const bad: string[] = [];
    for (const t of CATALOG_TRACKS) {
      const c = t.credential;
      if (!c) continue;
      const basis = c.basis ?? "vendor_exam";
      if (basis === "vendor_exam" && !c.examCode) bad.push(`${t.code}: no examCode`);
      if (basis.startsWith("vendor_exam") && !c.questionFormat) bad.push(`${t.code}: no questionFormat`);
      if (basis.startsWith("vendor_exam") && !c.passingScorePolicy) bad.push(`${t.code}: no passingScorePolicy`);
      if (c.status !== "draft" && (!c.officialObjectivesUrl || !c.lastVendorVerifiedAt)) bad.push(`${t.code}: unsourced`);
      if (c.durationMinutes != null && !(c.durationMinutes > 0)) bad.push(`${t.code}: bad duration`);
      if (c.retirementDate && c.effectiveDate && c.retirementDate < c.effectiveDate) bad.push(`${t.code}: retires before effective`);
      if (c.supersedes && c.supersedes.examCode === c.examCode) bad.push(`${t.code}: supersedes itself`);
    }
    assert.deepEqual(bad, []);
  });

  test("active domain titles are unique within a track (exam_domains rows are named by them)", () => {
    const bad = CATALOG_TRACKS.filter((t) => {
      const titles = activeUnits(t).map((u) => u.title);
      return new Set(titles).size !== titles.length;
    }).map((t) => t.code);
    assert.deepEqual(bad, []);
  });

  test("every catalog track code is unique", () => {
    const codes = CATALOG_TRACKS.map((t) => t.code);
    assert.equal(new Set(codes).size, codes.length);
  });
});

describe("AWS SAP-C02 -> SAP-C03 (REQ-102)", () => {
  const sap = CATALOG_TRACKS.find((t) => t.code === "AWSSAP")!;

  test("teaches SAP-C03 and records that it supersedes SAP-C02", () => {
    assert.equal(sap.credential?.examCode, "SAP-C03");
    assert.deepEqual(sap.credential?.supersedes, { examCode: "SAP-C02", lastExamDate: "2026-11-16" });
    assert.equal(sap.credential?.effectiveDate, "2026-11-17");
  });

  test("keeps the four SAP-C02 units in place, retired after SAP-C02's last day, ahead of the five SAP-C03 units", () => {
    // Positions are row identity (sort_order): the C02 units must not move,
    // or the seed would rewrite their rows -- and learners' mastery on them
    // -- with C03 content.
    assert.deepEqual(
      sap.units.slice(0, 4).map((u) => u.title),
      [
        "Design Solutions for Organizational Complexity",
        "Design for New Solutions",
        "Continuous Improvement for Existing Solutions",
        "Accelerate Workload Migration and Modernization",
      ]
    );
    for (const u of sap.units.slice(0, 4)) {
      assert.ok(u.retiredAt && u.retiredAt > "2026-11-16T23:59:59Z", `${u.title} retires too early`);
    }
    const active = activeUnits(sap);
    assert.deepEqual(
      active.map((u) => [u.title, u.weight]),
      [
        ["Architecture Design and Implementation Built for the Cloud", 25],
        ["Security, Compliance, and Governance", 25],
        ["Cost-Optimized Architecture Design", 15],
        ["Resilience, Migration, and Business Continuity", 15],
        ["Operational Excellence and Automation", 20],
      ]
    );
    assert.deepEqual(sap.units.slice(4), active);
  });
});
