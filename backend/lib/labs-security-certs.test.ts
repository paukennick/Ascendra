// REQ-271..273: lab sets for the ISC2 (CC, CISSP), ISACA (CISM) and
// EC-Council (CEH) courses. Hybrid density unit by unit, one lab per
// objective, the general safety note, both lab kinds, a dated outline that is
// rechecked by the course's review date, documentation-range addresses only,
// and -- for CEH -- no attack payloads or tool invocations in any lab. Kept
// in its own file so parallel lab waves don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { GENERAL_SAFETY } from "../supabase/seed/labs/types";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan } from "../scripts/generate-labs-lib";

const PLANS: Record<string, number[]> = {
  ISC2CC: [3, 2, 2, 2, 2],
  CISSP: [2, 1, 2, 2, 2, 2, 2, 1],
  CISM: [2, 2, 3, 3],
  CEH: [1, 2, 2, 3, 2, 1, 2, 1, 1],
};
const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
const setOf = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;
const allText = (code: string) =>
  setOf(code)
    .labs.map((l) => [l.brief, ...l.steps.flatMap((s) => [s.text, s.ask, ...s.parts.flatMap((p) => [p.criteria, p.modelAnswer, JSON.stringify(p.interactive ?? {})])])].join("\n"))
    .join("\n");

describe("REQ-271..273: security certification lab sets", () => {
  for (const [code, plan] of Object.entries(PLANS)) {
    test(`${code}: hybrid density unit by unit, one lab per objective, general safety, both kinds, dated outline`, () => {
      const units = activeUnits(tracks.get(code)!);
      const want = unitPlan(
        { code, family: "general", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) },
        "hybrid"
      );
      assert.deepEqual(want, plan, `${code}: the plan itself`);
      const set = setOf(code);
      assert.ok(set, `${code} has a lab set`);
      assert.deepEqual(
        units.map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length),
        plan,
        code
      );
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      for (const lab of set.labs) {
        assert.equal(lab.safetyNote, GENERAL_SAFETY, `${code}/${lab.slug}`);
        assert.match(lab.brief, /fictional|your own (practice )?lab/i, `${code}/${lab.slug}: fictional or own lab`);
        assert.ok(lab.slug.startsWith(`${code === "ISC2CC" ? "cc" : code.toLowerCase()}-`), lab.slug);
      }
      assert.ok(set.labs.some((l) => l.kind === "build") && set.labs.some((l) => l.kind === "case"), `${code}: both kinds`);
      assert.ok(set.labs.some((l) => l.steps.some((s) => s.parts.some((p) => p.interactive))), `${code}: uses interactive answers`);
      const outline = set.sources.find((s) => s.kind === "exam_outline");
      assert.ok(outline && outline.checkedAt === "2026-11-14", `${code}: dated outline`);
      assert.ok(outline!.recheckBy! <= tracks.get(code)!.contentReviewDueAt!.slice(0, 10), `${code}: rechecked by the course's review date`);
    });

    test(`${code}: every IPv4 address is from a documentation or private range`, () => {
      const ips = allText(code).match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? [];
      const ok = (ip: string) =>
        /^(192\.0\.2|198\.51\.100|203\.0\.113)\./.test(ip) || /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
      assert.deepEqual(ips.filter((ip) => !ok(ip)), [], code);
    });
  }

  test("CEH labs teach recognition and countermeasures, never payloads or tool runs against a target", () => {
    const text = allText("CEH");
    for (const bad of [/' ?OR ?'?1'? ?= ?'?1/i, /UNION\s+SELECT/i, /\bsqlmap\b/i, /\bmsfconsole\b/i, /\bhydra\b/i, /\baireplay-ng\b/i, /\bnmap\s+-/i, /<script>/i]) {
      assert.doesNotMatch(text, bad, String(bad));
    }
    // Every engagement lab says it is authorized or in the learner's own lab.
    for (const lab of setOf("CEH").labs) {
      assert.match(`${lab.brief} ${lab.steps.map((s) => s.text).join(" ")}`, /authori[sz]ed|your own|their own|fictional/i, lab.slug);
    }
  });

  test("CISSP quantitative risk lab: SLE, ALE and the control's value follow the standard formulas", () => {
    const lab = setOf("CISSP").labs.find((l) => l.slug === "cissp-ale-control-value")!;
    const nums = lab.steps.flatMap((s) => s.parts.map((p) => (p.interactive?.type === "numeric" ? p.interactive.answer : null))).filter((n) => n !== null);
    const av = 400000, ef = 0.25, aro = 0.5, aroAfter = 0.1, cost = 18000;
    const sle = av * ef;
    assert.deepEqual(nums, [sle, sle * aro, sle * aro - sle * aroAfter - cost]);
  });

  test("the CC ethics lab quotes the four canons as ISC2 publishes them and claims no priority order", () => {
    const lab = setOf("ISC2CC").labs.find((l) => l.slug === "cc-code-of-ethics-dilemma")!;
    for (const canon of [
      "protect society, the common good, necessary public trust and confidence, and the infrastructure",
      "act honorably, honestly, justly, responsibly, and legally",
      "provide diligent and competent service to principals",
      "advance and protect the profession",
    ])
      assert.ok(lab.brief.toLowerCase().includes(canon), canon);
    assert.ok(lab.sources?.some((s) => s.url === "https://www.isc2.org/ethics" && s.checkedAt === "2026-11-14"));
    assert.doesNotMatch(allText("ISC2CC"), /in order of priority|canons? (are|is) applied in order/i);
  });
});
