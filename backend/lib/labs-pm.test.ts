// REQ-150: the project-management lab sets beyond the PMP pilot follow the
// adopted density (hybrid) unit by unit, use the general safety note, and put
// at most one lab on any objective. Kept in its own file so parallel lab PRs
// don't collide in labs.test.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { GENERAL_SAFETY } from "../supabase/seed/labs/types";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan } from "../scripts/generate-labs-lib";

const PM_CODES = ["CAPM", "PMIACP", "PMIRMP", "PMISP", "PMIPBA", "PROJECTPLUS"];

describe("project-management labs (REQ-150)", () => {
  const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
  for (const code of PM_CODES) {
    test(`${code}: hybrid density unit by unit, one lab per objective, general safety`, () => {
      const t = tracks.get(code);
      assert.ok(t, code);
      const units = activeUnits(t!);
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
    });
  }
});
