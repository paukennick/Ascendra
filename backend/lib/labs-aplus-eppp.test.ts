// REQ-234: lab sets for CompTIA A+ Core 1 and Core 2 and the EPPP, and the
// DP-900 and ABPTS pelvic and women's health top-ups. The generic content,
// objective and slug checks run over every set in labs.test.ts; this file
// adds the density (hybrid, with the deliberate top-ups), one lab per
// objective, the safety framing, dated outlines, and a value source or a
// reason on every new lab -- in its own file so parallel lab waves don't
// edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CLINICAL_SAFETY, GENERAL_SAFETY } from "../supabase/seed/labs/types";
import { VALUE_SOURCES } from "../supabase/seed/labs/value-sources";
import { SOURCE_KINDS } from "../supabase/seed/sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { LAB_PLAN_TOP_UPS, POLICY_DEFAULTS, unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

const NEW_SETS = ["APLUS_CORE1", "APLUS_CORE2", "EPPP"] as const;
const TOPPED_UP = ["DP900", "ABPTSPWCS"] as const;
const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));

function planOf(code: string, family: PlanTrack["family"] = "general"): PlanTrack {
  const units = activeUnits(tracks.get(code)!);
  return { code, family, units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) };
}
function perUnit(code: string): number[] {
  const set = LAB_SETS.find((s) => s.trackCode === code)!;
  return activeUnits(tracks.get(code)!).map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length);
}

describe("REQ-234: A+ and EPPP lab sets", () => {
  for (const code of NEW_SETS) {
    test(`${code}: hybrid density unit by unit, one lab per objective, both kinds, dated outline`, () => {
      const set = LAB_SETS.find((s) => s.trackCode === code);
      assert.ok(set, `${code} has a lab set`);
      assert.deepEqual(perUnit(code), unitPlan(planOf(code), "hybrid"), code);
      const objectives = set!.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      assert.ok(set!.labs.some((l) => l.kind === "build") && set!.labs.some((l) => l.kind === "case"), `${code}: both lab kinds`);
      assert.ok(set!.sources.some((s) => s.kind === "exam_outline"), `${code} cites its exam outline`);
      for (const s of set!.sources) {
        assert.ok((SOURCE_KINDS as readonly string[]).includes(s.kind), `${code}: ${s.url}`);
        assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/, `${code}: ${s.url}`);
      }
    });
  }
  test("A+ labs carry the general safety note; EPPP labs the clinical one, with fictional people and no 'your client'", () => {
    for (const code of ["APLUS_CORE1", "APLUS_CORE2"]) {
      for (const lab of LAB_SETS.find((s) => s.trackCode === code)!.labs) assert.equal(lab.safetyNote, GENERAL_SAFETY, `${code}/${lab.slug}`);
    }
    for (const lab of LAB_SETS.find((s) => s.trackCode === "EPPP")!.labs) {
      assert.equal(lab.safetyNote, CLINICAL_SAFETY, lab.slug);
      assert.match(lab.brief, /fictional/i, `${lab.slug}: the brief says the people are fictional`);
      const asks = lab.steps.map((s) => s.ask).join(" ");
      assert.doesNotMatch(asks, /\byour (own )?(patient|client)s?\b/i, lab.slug);
    }
  });
  test("the EPPP set covers all eight ASPPB domains", () => {
    assert.ok(perUnit("EPPP").every((n) => n >= 1));
    assert.equal(perUnit("EPPP").length, 8);
  });
  test("A+ Core 1 has no lab on the troubleshooting methodology objective, which V15 says is not tested", () => {
    const set = LAB_SETS.find((s) => s.trackCode === "APLUS_CORE1")!;
    assert.ok(!set.labs.some((l) => /troubleshooting methodology/i.test(l.objective)));
  });
});

describe("REQ-234: DP-900 and ABPTS PWCS top-ups", () => {
  for (const code of TOPPED_UP) {
    test(`${code}: at least 8 labs, at least the hybrid plan and at most the cap in every unit`, () => {
      const family = code === "ABPTSPWCS" ? "clinical" : "general";
      const got = perUnit(code);
      assert.ok(got.reduce((a, b) => a + b, 0) >= 8, `${code}: ${got}`);
      const base = unitPlan(planOf(code, family), "hybrid", { ...POLICY_DEFAULTS });
      assert.deepEqual(got, base, `${code} follows its top-up`);
      for (const n of got) assert.ok(n >= 1 && n <= POLICY_DEFAULTS.hybridUnitCap, `${code}: ${got}`);
      const set = LAB_SETS.find((s) => s.trackCode === code)!;
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
    });
  }
  test("a top-up never lowers a unit below the plan, never exceeds the cap, and is ignored when the units change", () => {
    const track: PlanTrack = {
      code: "DP900",
      family: "general",
      units: [
        { title: "A", weight: 50, objectives: ["Design a", "Design b", "Design c", "Design d"] },
        { title: "B", weight: 30, objectives: ["x"] },
        { title: "C", weight: 10, objectives: ["y"] },
        { title: "D", weight: 10, objectives: ["z"] },
      ],
    };
    const plan = unitPlan(track, "hybrid");
    const top = LAB_PLAN_TOP_UPS.DP900;
    plan.forEach((n, i) => assert.equal(n, Math.min(POLICY_DEFAULTS.hybridUnitCap, Math.max(n, top[i]))));
    assert.ok(plan.every((n) => n <= POLICY_DEFAULTS.hybridUnitCap));
    const reshaped = { ...track, units: track.units.slice(0, 3) };
    const noTop = unitPlan({ ...reshaped, code: "NOT_TOPPED" }, "hybrid");
    assert.deepEqual(unitPlan(reshaped, "hybrid"), noTop, "a top-up whose length no longer matches is ignored");
  });
});

describe("REQ-234: every new lab names its value sources or says why not", () => {
  const newSlugs: Record<string, string[] | "all"> = {
    APLUS_CORE1: "all",
    APLUS_CORE2: "all",
    EPPP: "all",
    DP900: ["classify-workloads-and-roles", "normalize-order-spreadsheet", "blob-tiers-and-early-deletion", "batch-vs-streaming-pipeline"],
    ABPTSPWCS: ["pwcs-fecal-incontinence-sphincters", "pwcs-appraise-pfmt-trial", "pwcs-pfmt-adherence-follow-up"],
  };
  test("an entry for each, sources dated, never both", () => {
    for (const [code, slugs] of Object.entries(newSlugs)) {
      const set = LAB_SETS.find((s) => s.trackCode === code)!;
      const labs = slugs === "all" ? set.labs : set.labs.filter((l) => slugs.includes(l.slug));
      assert.equal(labs.length, slugs === "all" ? set.labs.length : slugs.length, code);
      for (const lab of labs) {
        assert.ok(VALUE_SOURCES[code]?.[lab.slug], `${code}/${lab.slug} has a value-sources entry`);
        const own = lab.sources ?? [];
        assert.ok(own.length > 0 || (lab.noValueSource ?? "").length > 20, `${code}/${lab.slug}: cite a source or say why not`);
        assert.ok(!(own.length > 0 && lab.noValueSource), `${code}/${lab.slug}: not both`);
        for (const s of own) assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/, `${code}/${lab.slug}: ${s.url}`);
      }
    }
  });
  test("the EPPP labs that quote a drug level, a statute or a guideline cite it", () => {
    const set = LAB_SETS.find((s) => s.trackCode === "EPPP")!;
    const urls = (slug: string) => (set.labs.find((l) => l.slug === slug)!.sources ?? []).map((s) => s.url).join(" ");
    assert.match(urls("eppp-lithium-toxicity-case"), /dailymed/);
    assert.match(urls("eppp-mandated-report-washington"), /26\.44\.030/);
    assert.match(urls("eppp-match-ebt"), /31305099/);
    assert.match(urls("eppp-ethics-rural-multiple-relationship"), /apa\.org\/ethics\/code/);
  });
});
