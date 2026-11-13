// REQ-239: lab sets for the NCE and the NCMHCE. The generic content, objective
// and slug checks run over every set in labs.test.ts; this file adds the
// hybrid density unit by unit, one lab per objective, the clinical safety
// framing and fictional people, the dated outline, a value source or a
// reason on every lab, and the NCMHCE's case-study shape (intake summary,
// then two sessions) -- in its own file so parallel lab waves don't edit the
// same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CLINICAL_SAFETY } from "../supabase/seed/labs/types";
import { VALUE_SOURCES } from "../supabase/seed/labs/value-sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

const CODES = ["NCE", "NCMHCE"] as const;
const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
const setOf = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;

function planOf(code: string): PlanTrack {
  const units = activeUnits(tracks.get(code)!);
  return { code, family: "clinical", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) };
}
function perUnit(code: string): number[] {
  return activeUnits(tracks.get(code)!).map((u) => setOf(code).labs.filter((l) => u.objectives.includes(l.objective)).length);
}

describe("REQ-239: NCE and NCMHCE lab sets", () => {
  for (const code of CODES) {
    test(`${code}: hybrid density unit by unit (12 labs), one lab per objective, both kinds, dated outline`, () => {
      const set = setOf(code);
      assert.ok(set, `${code} has a lab set`);
      assert.deepEqual(perUnit(code), unitPlan(planOf(code), "hybrid"), code);
      assert.equal(set.labs.length, 12);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      assert.ok(set.labs.some((l) => l.kind === "build") && set.labs.some((l) => l.kind === "case"), `${code}: both lab kinds`);
      const outline = set.sources.find((s) => s.kind === "exam_outline");
      assert.ok(outline && /nbcc\.org/.test(outline.url), `${code} cites its NBCC outline`);
      assert.equal(outline!.checkedAt, "2026-11-11");
      assert.ok(outline!.recheckBy! < "2027-07-01", "rechecked before NBCC's 2027-07-01 blueprint");
    });

    test(`${code}: clinical safety note, fictional people, never 'your client'`, () => {
      for (const lab of setOf(code).labs) {
        assert.equal(lab.safetyNote, CLINICAL_SAFETY, lab.slug);
        assert.match(lab.brief, /fictional/i, `${lab.slug}: the brief says the people are fictional`);
        const asks = lab.steps.map((s) => s.ask).join(" ");
        assert.doesNotMatch(asks, /\byour (own )?(patient|client)s?\b/i, lab.slug);
        assert.ok(lab.slug.startsWith(`${code.toLowerCase()}-`), lab.slug);
      }
    });

    test(`${code}: every lab names its value sources or says why not, never both`, () => {
      for (const lab of setOf(code).labs) {
        assert.ok(VALUE_SOURCES[code]?.[lab.slug], `${code}/${lab.slug} has a value-sources entry`);
        const own = lab.sources ?? [];
        assert.ok(own.length > 0 || (lab.noValueSource ?? "").length > 20, `${code}/${lab.slug}: cite a source or say why not`);
        assert.ok(!(own.length > 0 && lab.noValueSource), `${code}/${lab.slug}: not both`);
        for (const s of own) assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/, `${code}/${lab.slug}: ${s.url}`);
      }
    });
  }

  test("every unit, including the NCMHCE's Areas of Clinical Focus (weight 0, assessed through the cases), has labs", () => {
    assert.deepEqual(perUnit("NCE"), [2, 2, 3, 1, 3, 1]);
    assert.deepEqual(perUnit("NCMHCE"), [2, 2, 2, 2, 2, 2]);
  });

  test("NCMHCE case labs follow the exam's case shape: an intake summary, then sessions", () => {
    const cases = setOf("NCMHCE").labs.filter((l) => l.kind === "case");
    assert.ok(cases.length >= 8);
    for (const lab of cases) {
      assert.match(lab.brief, /^Intake summary\./, lab.slug);
      assert.ok(lab.steps.slice(1).some((s) => /^Session \d/.test(s.text)), `${lab.slug}: a later session`);
    }
  });

  test("labs that quote an ethics standard, the PTSD duration or 988 cite them", () => {
    const urls = (code: string, slug: string) => (setOf(code).labs.find((l) => l.slug === slug)!.sources ?? []).map((s) => s.url).join(" ");
    assert.match(urls("NCE", "nce-boundary-gift-and-social-media"), /2014-aca-code-of-ethics/);
    assert.match(urls("NCMHCE", "ncmhce-trauma-acute-or-ptsd"), /ptsd\.va\.gov/);
    assert.match(urls("NCMHCE", "ncmhce-crisis-intervention"), /samhsa\.gov\/mental-health\/988/);
    for (const code of CODES) {
      for (const lab of setOf(code).labs) {
        const text = JSON.stringify(lab.steps);
        if (/\bACA [A-H]\.\d/.test(text)) assert.match(urls(code, lab.slug), /aca-code-of-ethics/, `${lab.slug} quotes the ACA Code`);
        if (/\b988\b/.test(text)) assert.match(urls(code, lab.slug), /988/, `${lab.slug} names 988`);
      }
    }
  });
});
