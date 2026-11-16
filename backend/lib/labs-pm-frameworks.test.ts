// REQ-280 / REQ-281: lab sets for PSM I, CSM, ITIL 4 Foundation, ASQ CSSGB
// and the NASM Certified Nutrition Coach. The generic content, objective and
// slug checks run over every set in labs.test.ts; this file adds the hybrid
// density unit by unit, one lab per objective, both lab kinds, interactive
// parts, the safety framing and fictional people, and the dated outlines --
// in its own file so parallel lab waves don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { FITNESS_SAFETY, GENERAL_SAFETY } from "../supabase/seed/labs/types";
import { VALUE_SOURCES } from "../supabase/seed/labs/value-sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

const CODES = ["PSMI", "CSM", "ITIL4FND", "CSSGB", "NASMCNC"] as const;
const EXPECTED: Record<(typeof CODES)[number], number[]> = {
  PSMI: [2, 2, 2, 2, 2, 2],
  CSM: [2, 2, 3, 2, 1, 2],
  ITIL4FND: [2, 2, 1, 1, 1, 2, 3],
  CSSGB: [2, 2, 2, 2, 2, 2],
  NASMCNC: [2, 3, 2, 3],
};
const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
const setOf = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;
const familyOf = (code: string) => (code === "NASMCNC" ? "fitness" : "general");

function planOf(code: string): PlanTrack {
  const units = activeUnits(tracks.get(code)!);
  return { code, family: familyOf(code), units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) };
}
function perUnit(code: string): number[] {
  return activeUnits(tracks.get(code)!).map((u) => setOf(code).labs.filter((l) => u.objectives.includes(l.objective)).length);
}

describe("REQ-280/281: Scrum, ITIL, Six Sigma and nutrition coach lab sets", () => {
  for (const code of CODES) {
    test(`${code}: hybrid density unit by unit, one lab per objective, both kinds, interactive parts, dated outline`, () => {
      const set = setOf(code);
      assert.ok(set, `${code} has a lab set`);
      assert.deepEqual(perUnit(code), unitPlan(planOf(code), "hybrid"), code);
      assert.deepEqual(perUnit(code), EXPECTED[code], code);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      assert.ok(set.labs.some((l) => l.kind === "build") && set.labs.some((l) => l.kind === "case"), `${code}: both kinds`);
      const interactive = set.labs.filter((l) => l.steps.some((s) => s.parts.some((p) => p.interactive))).length;
      assert.ok(interactive >= 5, `${code}: ${interactive} labs with an interactive part`);
      const outline = set.sources.find((s) => s.kind === "exam_outline");
      assert.ok(outline, `${code} cites an outline`);
      assert.equal(outline!.checkedAt, "2026-11-14");
    });

    test(`${code}: safety note, fictional people or organizations, never 'your client'`, () => {
      for (const lab of setOf(code).labs) {
        assert.equal(lab.safetyNote, code === "NASMCNC" ? FITNESS_SAFETY : GENERAL_SAFETY, lab.slug);
        assert.match(lab.brief, /fictional/i, `${lab.slug}: the brief says it is fictional`);
        const asks = lab.steps.map((s) => s.ask).join(" ");
        assert.doesNotMatch(asks, /\byour (own )?(patient|client)s?\b/i, lab.slug);
        if (lab.kind === "build") assert.equal(lab.steps[0].text, "", `${lab.slug}: a build lab's step has no text`);
      }
    });
  }

  test("NASMCNC: every lab names its value sources or says why not, never both", () => {
    for (const lab of setOf("NASMCNC").labs) {
      assert.ok(VALUE_SOURCES.NASMCNC?.[lab.slug], `${lab.slug} has a value-sources entry`);
      const own = lab.sources ?? [];
      assert.ok(own.length > 0 || (lab.noValueSource ?? "").length > 20, lab.slug);
      assert.ok(!(own.length > 0 && lab.noValueSource), lab.slug);
    }
  });

  test("NASMCNC labs that quote a guideline value cite it", () => {
    const urls = (slug: string) => (setOf("NASMCNC").labs.find((l) => l.slug === slug)!.sources ?? []).map((s) => s.url).join(" ");
    for (const lab of setOf("NASMCNC").labs) {
      const text = JSON.stringify(lab.steps);
      if (/Dietary Guidelines/.test(text)) assert.match(urls(lab.slug), /realfood\.gov\/DGA\.pdf/, `${lab.slug} quotes the DGA`);
      if (/\bFDA\b/.test(text)) assert.match(urls(lab.slug), /fda\.gov/, `${lab.slug} quotes FDA`);
    }
  });

  test("the nutrition coach labs refer out rather than prescribe for a diagnosed condition", () => {
    const refer = setOf("NASMCNC").labs.find((l) => l.slug === "nasmcnc-refer-or-coach")!;
    const text = JSON.stringify(refer.steps);
    assert.match(text, /medical nutrition therapy/);
    assert.match(text, /registered dietitian nutritionist|an RDN/);
  });

  test("ITIL lab outlines are rechecked before PeopleCert's planned 2027-12-31 ITIL 4 sunset", () => {
    for (const s of setOf("ITIL4FND").sources) assert.ok(s.recheckBy && s.recheckBy < "2027-12-31", s.url);
  });
});
