// REQ-171: the remaining PMI lab sets (PgMP, PfMP, PMI-CP, PMI-PMOCP,
// PMI-CPMAI, CSPP) follow the adopted density (hybrid) unit by unit, use the
// general safety note, put at most one lab on any objective, mix build and
// case labs, and cite a dated exam outline. Kept in its own file so parallel
// lab PRs don't collide in labs-pm.test.ts or labs.test.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { GENERAL_SAFETY } from "../supabase/seed/labs/types";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan } from "../scripts/generate-labs-lib";

const CODES = ["PGMP", "PFMP", "PMICP", "PMIPMOCP", "PMICPMAI", "CSPP"];

describe("remaining PMI labs (REQ-171)", () => {
  const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
  for (const code of CODES) {
    test(`${code}: hybrid density unit by unit, one lab per objective, general safety, dated outline`, () => {
      const units = activeUnits(tracks.get(code)!);
      const want = unitPlan(
        { code, family: "general", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) },
        "hybrid"
      );
      const set = LAB_SETS.find((s) => s.trackCode === code);
      assert.ok(set, `${code} has a lab set`);
      const got = units.map((u) => set!.labs.filter((l) => u.objectives.includes(l.objective)).length);
      assert.deepEqual(got, want, code);
      const objectives = set!.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      for (const lab of set!.labs) assert.equal(lab.safetyNote, GENERAL_SAFETY, `${code}/${lab.slug}`);
      assert.ok(set!.labs.some((l) => l.kind === "build") && set!.labs.some((l) => l.kind === "case"), `${code}: both kinds`);
      assert.ok(set!.sources.some((s) => s.kind === "exam_outline" && /^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt)), `${code}: dated outline`);
    });
  }
});
