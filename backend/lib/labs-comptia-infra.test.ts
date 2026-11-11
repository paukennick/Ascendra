// REQ-160: the CompTIA infrastructure and data lab sets follow the adopted
// density (hybrid) unit by unit, like the pilot courses in labs.test.ts. Kept
// in its own file so parallel lab PRs do not all edit the same list.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

export const REQ160_COURSES = ["NETWORKPLUS", "LINUXPLUS", "SERVERPLUS", "AUTOOPSPLUS", "DATAPLUS", "DATAAI"] as const;

describe("REQ-160 CompTIA infrastructure and data labs", () => {
  const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
  test("each course has a lab set that follows the hybrid density unit by unit", () => {
    for (const code of REQ160_COURSES) {
      const t = tracks.get(code);
      assert.ok(t, code);
      const units = activeUnits(t!);
      const plan: PlanTrack = { code, family: "general", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) };
      const want = unitPlan(plan, "hybrid");
      const set = LAB_SETS.find((s) => s.trackCode === code);
      assert.ok(set, `${code} has a lab set`);
      const got = units.map((u) => set!.labs.filter((l) => u.objectives.includes(l.objective)).length);
      assert.deepEqual(got, want, code);
    }
  });
  test("every lab is a general-family lab with a fictional organization and cites the official CompTIA page", () => {
    for (const set of LAB_SETS.filter((s) => (REQ160_COURSES as readonly string[]).includes(s.trackCode))) {
      assert.ok(set.sources.every((s) => s.url.startsWith("https://www.comptia.org/")), set.trackCode);
      for (const lab of set.labs) {
        assert.match(lab.safetyNote ?? "", /Fictional organization/, `${set.trackCode}/${lab.slug}`);
        assert.ok(lab.kind === "build" ? lab.steps.length === 1 : lab.steps.length >= 2, `${set.trackCode}/${lab.slug} shape`);
      }
    }
  });
});
