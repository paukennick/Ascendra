// REQ-275..278: lab sets for the CMSRN, CEN, PCCN and FNP courses. The
// generic content, objective and slug checks run over every set in
// labs.test.ts; this file adds the hybrid density unit by unit, one lab per
// objective, the clinical safety framing and fictional people, a written
// (graded-by-reading) part in every lab, the dated outline, and a value source
// or a reason on every lab -- in its own file so parallel waves don't edit the
// same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CLINICAL_SAFETY } from "../supabase/seed/labs/types";
import { VALUE_SOURCES } from "../supabase/seed/labs/value-sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

export const SPECIALTY_CODES = ["CMSRN", "CEN", "PCCN"] as const;
const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
const setOf = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;

function planOf(code: string): PlanTrack {
  const units = activeUnits(tracks.get(code)!);
  return { code, family: "clinical", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) };
}
const perUnit = (code: string) =>
  activeUnits(tracks.get(code)!).map((u) => setOf(code).labs.filter((l) => u.objectives.includes(l.objective)).length);

describe("REQ-275..278: nursing specialty lab sets", () => {
  for (const code of SPECIALTY_CODES) {
    test(`${code}: hybrid density unit by unit, one lab per objective, both kinds, dated outline`, () => {
      const set = setOf(code);
      assert.ok(set, `${code} has a lab set`);
      const plan = unitPlan(planOf(code), "hybrid");
      assert.deepEqual(perUnit(code), plan, code);
      assert.equal(set.labs.length, plan.reduce((a, b) => a + b, 0));
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      assert.ok(set.labs.some((l) => l.kind === "build") && set.labs.some((l) => l.kind === "case"));
      const outline = set.sources.find((s) => s.kind === "exam_outline");
      assert.ok(outline);
      assert.equal(outline!.checkedAt, "2026-11-14");
    });

    test(`${code}: safety note, fictional people, never 'your patient', a written part in every lab`, () => {
      for (const lab of setOf(code).labs) {
        assert.equal(lab.safetyNote, CLINICAL_SAFETY, lab.slug);
        assert.match(lab.brief, /fictional/i, lab.slug);
        assert.doesNotMatch(lab.steps.map((s) => s.ask).join(" "), /\byour (own )?(patient|client)s?\b/i, lab.slug);
        assert.ok(lab.slug.startsWith(`${code.toLowerCase().replace(/^fnp(aanp|ancc)$/, "fnp")}-`), lab.slug);
        assert.ok(lab.steps.some((s) => s.parts.some((p) => !p.interactive)), `${lab.slug}: clinical judgment keeps a written part`);
        assert.doesNotMatch(JSON.stringify(lab), /\b(expert|clinician|educator)s?\b.{0,40}\b(review|approv)/i, lab.slug);
      }
    });

    test(`${code}: every lab names its value sources or says why not, never both`, () => {
      for (const lab of setOf(code).labs) {
        assert.ok(VALUE_SOURCES[code]?.[lab.slug], `${code}/${lab.slug} has a value-sources entry`);
        const own = lab.sources ?? [];
        assert.ok(own.length > 0 || (lab.noValueSource ?? "").length > 20, `${code}/${lab.slug}`);
        assert.ok(!(own.length > 0 && lab.noValueSource), `${code}/${lab.slug}: not both`);
        for (const s of own) {
          assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
          assert.ok(s.kind === "clinical_guideline" || s.kind === "reference", `${lab.slug}: ${s.kind}`);
        }
      }
    });
  }

  test("PCCN: 18 labs, 2/2/1/1/2/1/1/1/2/1/2/2", () => {
    assert.deepEqual(perUnit("PCCN"), [2, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 2]);
  });
});
