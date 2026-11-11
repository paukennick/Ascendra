// REQ-220: course-content fixes from the 2026-11-11 audit (batch G5). Pure
// data tests over the seed modules -- no database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";

const SEED = join(__dirname, "..", "supabase", "seed");
const seedFiles = (dir: string) => readdirSync(join(SEED, dir)).filter((f) => f.endsWith(".ts")).map((f) => join(SEED, dir, f));
const allSeedText = () => [...seedFiles("labs"), ...seedFiles("tracks"), join(SEED, "data.ts")].map((f) => [f, readFileSync(f, "utf8")] as const);
const track = (code: string) => {
  const t = CATALOG_TRACKS.find((x) => x.code === code);
  assert.ok(t, code);
  return t;
};
const active = (code: string) => activeUnits(track(code)).flatMap((u) => u.objectives);
const all = (code: string) => track(code).units.flatMap((u) => u.objectives);

describe("REQ-220 PT content", () => {
  test("every 'N kg (M lb)' pair in the seed converts correctly, to the nearest pound (FAIL-1135)", () => {
    // 1.8 kg is 3.97 lb: the heart-failure weight-gain flag was printed "1.8 kg (3 lb)".
    const re = /(\d+(?:\.\d+)?)\s?kg\s?(?:\(|\/\s?)(\d+(?:\.\d+)?)\s?lb/g;
    const bad: string[] = [];
    let n = 0;
    for (const [file, text] of allSeedText()) {
      for (const m of text.matchAll(re)) {
        n++;
        const lb = Number(m[1]) * 2.20462;
        if (Math.abs(lb - Number(m[2])) > 0.5) bad.push(`${file.split("seed/")[1]}: ${m[0]} (= ${lb.toFixed(2)} lb)`);
      }
    }
    assert.ok(n >= 9, "the heart-failure flag pairs are still found");
    assert.deepEqual(bad, []);
  });

  test("the superseded APTA ethics documents are no longer taught (FAIL-1133)", () => {
    for (const code of ["DPT", "NPTEPTA"]) {
      for (const o of active(code)) {
        assert.doesNotMatch(o, /eight principles of the APTA Code|Standards of Ethical Conduct/, `${code}: ${o.slice(0, 80)}`);
      }
    }
    const dpt = active("DPT");
    assert.ok(dpt.some((o) => /Code of Ethics for the Physical Therapy Profession \(effective 2026-01-01/.test(o)));
    assert.ok(dpt.some((o) => /nine Ethical Commitments/.test(o) && /autonomy, beneficence, nonmaleficence, justice, veracity and fidelity/.test(o)));
    // The retired line keeps its slot (row identity).
    assert.ok(all("DPT").some((o) => /^The eight principles of the APTA Code of Ethics/.test(o)));
  });

  test("PTAs may furnish maintenance therapy the PT delegates, since 2021 (FAIL-1134)", () => {
    for (const code of ["DPT", "NPTEPTA"]) {
      const lines = active(code).filter((o) => /maintenance program/i.test(o) && /PTA/.test(o));
      assert.ok(lines.length > 0, code);
      for (const o of lines) {
        assert.doesNotMatch(o, /(deliver|furnish) skilled maintenance programs/, `${code}: ${o.slice(0, 80)}`);
        assert.match(o, /since 2021 the PT may delegate furnishing/, code);
      }
    }
  });

  test("sarcopenia is taught as fibre loss, not only protein change (FAIL-1137)", () => {
    const lines = active("DPT").filter((o) => /sarcopenia/i.test(o));
    assert.equal(lines.length, 1);
    assert.match(lines[0], /muscle fibres also die/);
    assert.doesNotMatch(lines[0], /rather than the number of cells/);
  });
});

describe("REQ-220 study-emphasis weights (FAIL-1136)", () => {
  test("the four nursing courses whose weights are our judgment say so; NCLEX and NPTE do not", () => {
    for (const code of ["CNA", "LPNVN", "ADNRN", "BSNRN"]) assert.equal(track(code).credential?.domainWeights, "study_emphasis", code);
    for (const code of ["NCLEXRN", "NCLEXPN", "NPTEPT", "NPTEPTA", "SECPLUS"]) assert.notEqual(track(code).credential?.domainWeights, "study_emphasis", code);
  });

  test("readiness with study-emphasis weights is unweighted (no 'of the exam' labels)", async () => {
    const { rollupReadiness } = await import("./readiness");
    const units = [
      { id: "a", title: "A", weight: 80 },
      { id: "b", title: "B", weight: 20 },
    ];
    const objs = [
      { unitId: "a", weightedAccuracy: 1, readinessScore: 1, status: "independent", kept: "kept", recheckDue: false, retention: 1 },
      { unitId: "b", weightedAccuracy: null, readinessScore: null, status: null, kept: null, recheckDue: null, retention: null },
    ];
    assert.equal(rollupReadiness(units, objs).blueprintWeighted, true);
    const r = rollupReadiness(units, objs, undefined, false);
    assert.equal(r.blueprintWeighted, false);
    assert.equal(r.coveragePercent, 50, "one of two objectives, not 80% of an exam");
  });
});
