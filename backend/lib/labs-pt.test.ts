// REQ-147: the physical therapy entry-level courses' authored labs (NPTE-PT,
// NPTE-PTA, DPT). The generic content, objective and slug checks run over
// every lab set in labs.test.ts; this file adds the clinical framing, the
// adopted density (hybrid, docs/labs.md "Density") and the PTA scope rule,
// in its own file so parallel lab waves don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CLINICAL_SAFETY } from "../supabase/seed/labs/types";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

const CODES = ["NPTEPT", "NPTEPTA", "DPT"] as const;

describe("physical therapy lab wave (REQ-147)", () => {
  const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
  const setFor = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;

  test("each course has a lab set citing its outline and references", () => {
    for (const code of CODES) {
      const set = LAB_SETS.find((s) => s.trackCode === code);
      assert.ok(set, `${code} has labs`);
      assert.ok(set!.sources.length >= 2 && set!.sources.every((s) => s.startsWith("https://")), `${code} cites outline and references`);
    }
  });

  test("every lab carries the clinical safety note, calls its people fictional and never asks about a real patient", () => {
    for (const code of CODES) {
      for (const lab of setFor(code).labs) {
        assert.equal(lab.safetyNote, CLINICAL_SAFETY, `${code}/${lab.slug}`);
        assert.match(lab.brief, /fictional/i, `${code}/${lab.slug}: the brief says the person is fictional`);
        const asks = lab.steps.map((s) => s.ask).join(" ");
        assert.doesNotMatch(asks, /\byour (own )?(patient|client)s?\b/i, `${code}/${lab.slug}`);
        if (lab.kind === "build") assert.equal(lab.steps[0].text, "", `${code}/${lab.slug}: a build lab's step has no text`);
      }
    }
  });

  test("each course follows the recommended density (hybrid) unit by unit, one lab per objective", () => {
    for (const code of CODES) {
      const units = activeUnits(tracks.get(code)!);
      const plan: PlanTrack = {
        code,
        family: "clinical",
        units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })),
      };
      const set = setFor(code);
      const got = units.map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length);
      assert.deepEqual(got, unitPlan(plan, "hybrid"), code);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
    }
  });

  test("clinical-judgment case labs dominate each course", () => {
    for (const code of CODES) {
      const labs = setFor(code).labs;
      const cases = labs.filter((l) => l.kind === "case").length;
      assert.ok(cases > labs.length / 2 && labs.some((l) => l.kind === "build"), `${code}: ${cases} case of ${labs.length}`);
    }
  });

  test("every PTA lab grades within PTA scope: the rubric routes decisions to the supervising PT", () => {
    for (const lab of setFor("NPTEPTA").labs) {
      const criteria = lab.steps.flatMap((s) => s.parts.map((p) => p.criteria)).join(" ");
      assert.match(criteria, /\b(supervising PT|the PT|PT's)\b/, `${lab.slug}: criteria defer to the PT`);
      assert.match(lab.brief, /\b(PTA|PT's plan|plan of care)\b/, `${lab.slug}: the brief sets the PTA role`);
    }
  });
});
