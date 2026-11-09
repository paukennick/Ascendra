// REQ-172: the Google Cloud network engineer (GCPNET), Azure AI Fundamentals
// (AI-901) and CompTIA Tech+ lab sets. The generic content, objective and
// slug checks run over every lab set in labs.test.ts; this file adds the
// adopted density (hybrid, docs/labs.md "Density") unit by unit, one lab per
// objective, the general safety note and dated sources, in its own file so
// parallel lab waves don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { GENERAL_SAFETY } from "../supabase/seed/labs/types";
import { SOURCE_KINDS } from "../supabase/seed/sources";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan } from "../scripts/generate-labs-lib";

const CODES = ["GCPNET", "AI901", "TECHPLUS"] as const;

describe("IT and cloud lab wave (REQ-172)", () => {
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
      assert.ok(set!.sources.some((s) => s.kind === "exam_outline"), `${code} cites its exam outline`);
      for (const s of set!.sources) {
        assert.ok((SOURCE_KINDS as readonly string[]).includes(s.kind), `${code}: ${s.url}`);
        assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/, `${code}: ${s.url}`);
      }
      assert.ok(set!.labs.some((l) => l.kind === "build") && set!.labs.some((l) => l.kind === "case"), `${code}: both lab kinds`);
    });
  }
});
