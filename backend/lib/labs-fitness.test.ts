// REQ-149: the remaining fitness courses' authored labs (ACE, ACSM, NSCA-CPT,
// NSCA CSCS, NCCPT). The generic content, objective and slug checks run over
// every lab set in labs.test.ts; this file adds the fitness framing and the
// adopted density (hybrid, docs/labs.md "Density") for these five courses,
// in its own file so parallel lab waves don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { FITNESS_SAFETY } from "../supabase/seed/labs/types";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

const CODES = ["ACECPT", "ACSMCPT", "NSCACPT", "NSCACSCS", "NCCPTCPT"] as const;

describe("fitness lab wave (REQ-149)", () => {
  const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));

  test("each course has a lab set citing its outline", () => {
    for (const code of CODES) {
      const set = LAB_SETS.find((s) => s.trackCode === code);
      assert.ok(set, `${code} has labs`);
      assert.ok(set!.sources.length >= 2 && set!.sources.every((s) => s.url.startsWith("https://")), `${code} cites outline and references`);
    }
  });

  test("every lab carries the fitness safety note, calls its people fictional and never asks about a real client", () => {
    for (const code of CODES) {
      const set = LAB_SETS.find((s) => s.trackCode === code)!;
      for (const lab of set.labs) {
        assert.equal(lab.safetyNote, FITNESS_SAFETY, `${code}/${lab.slug}`);
        assert.match(lab.brief, /fictional/i, `${code}/${lab.slug}: the brief says the person is fictional`);
        const asks = lab.steps.map((s) => s.ask).join(" ");
        assert.doesNotMatch(asks, /\byour (own )?(patient|client|athlete)s?\b/i, `${code}/${lab.slug}`);
        if (lab.kind === "build") assert.equal(lab.steps[0].text, "", `${code}/${lab.slug}: a build lab's step has no text`);
      }
    }
  });

  test("each course follows the recommended density (hybrid) unit by unit", () => {
    for (const code of CODES) {
      const t = tracks.get(code)!;
      const units = activeUnits(t);
      const plan: PlanTrack = {
        code,
        family: "fitness",
        units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })),
      };
      const want = unitPlan(plan, "hybrid");
      const set = LAB_SETS.find((s) => s.trackCode === code)!;
      const got = units.map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length);
      assert.deepEqual(got, want, code);
      // At most one lab per objective, so a unit's labs practise different skills.
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
    }
  });

  test("each course mixes build and case labs", () => {
    for (const code of CODES) {
      const set = LAB_SETS.find((s) => s.trackCode === code)!;
      assert.ok(set.labs.some((l) => l.kind === "build") && set.labs.some((l) => l.kind === "case"), code);
    }
  });
});
