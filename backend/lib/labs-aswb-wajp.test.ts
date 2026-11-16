// REQ-286 / REQ-287: lab sets for the ASWB Clinical and Masters courses and the
// Washington psychology jurisprudence course. The generic content, objective
// and slug checks run over every set in labs.test.ts; this file adds the
// hybrid density unit by unit, one lab per objective, the safety framing and
// fictional people, the dated outline, a value source or a reason on every lab,
// and that each Washington number a lab asks for is backed by a cited rule.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CLINICAL_SAFETY } from "../supabase/seed/labs/types";
import { LEGAL_SAFETY } from "../supabase/seed/labs/wa-psych-jurisprudence";
import { VALUE_SOURCES } from "../supabase/seed/labs/value-sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

const CODES = ["ASWBCLINICAL", "ASWBMASTERS", "WAPSYCHJP"] as const;
const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
const setOf = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;

function planOf(code: string): PlanTrack {
  const units = activeUnits(tracks.get(code)!);
  return { code, family: "clinical", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) };
}
function perUnit(code: string): number[] {
  return activeUnits(tracks.get(code)!).map((u) => setOf(code).labs.filter((l) => u.objectives.includes(l.objective)).length);
}

describe("REQ-286 / REQ-287: ASWB and Washington jurisprudence lab sets", () => {
  for (const code of CODES) {
    test(`${code}: hybrid density unit by unit, one lab per objective, both kinds, dated outline`, () => {
      const set = setOf(code);
      assert.ok(set, `${code} has a lab set`);
      assert.deepEqual(perUnit(code), unitPlan(planOf(code), "hybrid"), code);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      assert.ok(set.labs.some((l) => l.kind === "build") && set.labs.some((l) => l.kind === "case"), `${code}: both lab kinds`);
      assert.ok(set.labs.some((l) => l.steps.some((s) => s.parts.some((p) => p.interactive))), `${code}: uses interactive parts`);
      assert.equal(set.sources[0].checkedAt, "2026-11-14");
    });

    test(`${code}: safety note, fictional people, never 'your client'`, () => {
      for (const lab of setOf(code).labs) {
        assert.equal(lab.safetyNote, code === "WAPSYCHJP" ? LEGAL_SAFETY : CLINICAL_SAFETY, lab.slug);
        assert.match(lab.safetyNote!, /not clinical guidance/);
        assert.match(lab.brief, /fictional/i, `${lab.slug}: the brief says the people are fictional`);
        const asks = lab.steps.map((s) => s.ask).join(" ");
        assert.doesNotMatch(asks, /\byour (own )?(patient|client)s?\b/i, lab.slug);
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

  test("plans: ASWB 3/3/3, jurisprudence 1/1/3/2/1/1", () => {
    assert.deepEqual(perUnit("ASWBCLINICAL"), [3, 3, 3]);
    assert.deepEqual(perUnit("ASWBMASTERS"), [3, 3, 3]);
    assert.deepEqual(perUnit("WAPSYCHJP"), [1, 1, 3, 2, 1, 1]);
  });

  test("labs that quote the NASW Code, 988 or a Washington statute or rule cite it", () => {
    const urls = (code: string, slug: string) => (setOf(code).labs.find((l) => l.slug === slug)!.sources ?? []).map((s) => s.url).join(" ");
    for (const code of CODES) {
      for (const lab of setOf(code).labs) {
        const text = JSON.stringify(lab.steps);
        if (/NASW \d\.\d\d/.test(text)) assert.match(urls(code, lab.slug), /socialworkers\.org/, `${lab.slug} quotes the NASW Code`);
        if (/\b988\b/.test(text)) assert.match(urls(code, lab.slug), /988/, `${lab.slug} names 988`);
        if (/RCW 71\.05\.120/.test(text)) assert.match(urls(code, lab.slug), /71\.05\.120/, `${lab.slug} quotes RCW 71.05.120`);
        if (/RCW 26\.44\.030/.test(text)) assert.match(urls(code, lab.slug), /26\.44\.030/, `${lab.slug} quotes RCW 26.44.030`);
        if (/WAC 246-924/.test(text)) assert.match(urls(code, lab.slug), /246-924/, `${lab.slug} quotes WAC 246-924`);
        if (/RCW 70\.02/.test(text)) assert.match(urls(code, lab.slug), /70\.02/, `${lab.slug} quotes chapter 70.02 RCW`);
      }
    }
  });

  test("the Washington numeric answers match the rules as read 2026-11-14", () => {
    const answers = setOf("WAPSYCHJP").labs.flatMap((l) => l.steps.flatMap((s) => s.parts.flatMap((p) => (p.interactive?.type === "numeric" ? [[l.slug, p.interactive.answer]] : []))));
    assert.deepEqual(Object.fromEntries(answers), {
      "wajp-first-ce-cycle-plan": 60, // WAC 246-924-230(1)
      "wajp-sexual-misconduct-waiting-periods": 2, // WAC 246-924-358(5), key party
      "wajp-records-retention-and-closing-practice": 8, // WAC 246-924-354(2), a 15-year-old
      "wajp-child-abuse-report-48-hours": 48, // RCW 26.44.030(1)(h)
    });
  });
});
