// REQ-173: the ABPTS Clinical Electrophysiologic Specialist lab set. The
// generic content, objective and slug checks run over every lab set in
// labs.test.ts; this file adds the clinical framing, the adopted density
// (hybrid, docs/labs.md "Density") unit by unit, one lab per objective, and
// Nick's clinical-content rule: every lab names the guideline or primary
// source its values rest on (value-sources.ts), or says why it names none,
// and stays needs_expert_review via the seed.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CLINICAL_SAFETY } from "../supabase/seed/labs/types";
import { VALUE_SOURCES } from "../supabase/seed/labs/value-sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan } from "../scripts/generate-labs-lib";

const CODE = "ABPTSECS";

describe("ABPTS clinical electrophysiology labs (REQ-173)", () => {
  const set = LAB_SETS.find((s) => s.trackCode === CODE);

  test("the set exists and cites the ABPTS outline with dates", () => {
    assert.ok(set, `${CODE} has labs`);
    assert.ok(set!.sources.some((s) => s.kind === "exam_outline" && s.url.includes("specialization.apta.org")));
    for (const s of set!.sources) assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  });

  test("hybrid density unit by unit, one lab per objective, case labs dominate", () => {
    const units = activeUnits(CATALOG_TRACKS.find((t) => t.code === CODE)!);
    const want = unitPlan(
      { code: CODE, family: "clinical", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) },
      "hybrid"
    );
    const got = units.map((u) => set!.labs.filter((l) => u.objectives.includes(l.objective)).length);
    assert.deepEqual(got, want);
    const objectives = set!.labs.map((l) => l.objective);
    assert.equal(new Set(objectives).size, objectives.length);
    const cases = set!.labs.filter((l) => l.kind === "case").length;
    assert.ok(cases > set!.labs.length / 2, `${cases} case of ${set!.labs.length}`);
  });

  test("clinical framing: safety note, fictional people, no real patient asked about", () => {
    for (const lab of set!.labs) {
      assert.equal(lab.safetyNote, CLINICAL_SAFETY, lab.slug);
      assert.match(lab.brief, /fictional/i, lab.slug);
      assert.doesNotMatch(lab.steps.map((s) => s.ask).join(" "), /\byour (own )?(patient|client)s?\b/i, lab.slug);
    }
  });

  test("every lab names its value sources (dated) or why it names none, never both", () => {
    assert.deepEqual(Object.keys(VALUE_SOURCES[CODE] ?? {}).sort(), set!.labs.map((l) => l.slug).sort(), "a value-sources entry per lab");
    for (const lab of set!.labs) {
      const own = lab.sources ?? [];
      assert.ok(own.length > 0 || (lab.noValueSource ?? "").length > 20, lab.slug);
      assert.ok(!(own.length > 0 && lab.noValueSource), lab.slug);
      for (const s of own) {
        assert.ok(s.kind === "clinical_guideline" || s.kind === "reference", `${lab.slug}: ${s.url}`);
        assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
