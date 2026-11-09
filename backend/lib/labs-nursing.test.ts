// REQ-148: the remaining nursing courses' authored labs (NCLEX-PN, LPN/VN,
// CNA, ADN-RN, BSN-RN). The generic content, objective and slug checks run
// over every lab set in labs.test.ts; this file adds the clinical framing and
// the adopted density (hybrid, docs/labs.md "Density"), in its own file so
// parallel lab waves don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

const CODES = ["NCLEXPN", "LPNVN", "CNA", "ADNRN", "BSNRN"] as const;

describe("nursing lab wave (REQ-148)", () => {
  const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
  const setFor = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;

  test("every lab carries the clinical framing, calls its people fictional and never asks about a real patient", () => {
    for (const code of CODES) {
      assert.ok(setFor(code), `${code} has labs`);
      for (const lab of setFor(code).labs) {
        assert.match(lab.safetyNote!, /not clinical guidance/, `${code}/${lab.slug}`);
        assert.match(lab.brief, /fictional/i, `${code}/${lab.slug}`);
        assert.doesNotMatch(lab.steps.map((s) => s.ask).join(" "), /\byour (own )?(patient|client|resident)s?\b/i, `${code}/${lab.slug}`);
      }
    }
  });

  test("each course follows the recommended density (hybrid) unit by unit", () => {
    for (const code of CODES) {
      const units = activeUnits(tracks.get(code)!);
      const plan: PlanTrack = { code, family: "clinical", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) };
      const got = units.map((u) => setFor(code).labs.filter((l) => u.objectives.includes(l.objective)).length);
      assert.deepEqual(got, unitPlan(plan, "hybrid"), code);
    }
  });

  test("case labs lead each course, and CNA rubrics route judgment to the nurse", () => {
    for (const code of CODES) {
      const labs = setFor(code).labs;
      assert.ok(labs.filter((l) => l.kind === "case").length > labs.length / 2, code);
    }
    for (const lab of setFor("CNA").labs) {
      const criteria = lab.steps.flatMap((s) => s.parts.map((p) => p.criteria)).join(" ");
      assert.doesNotMatch(criteria, /\badminister/i, lab.slug);
    }
  });
});
