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

  test("sarcopenia is taught as fiber loss, not only protein change (FAIL-1137)", () => {
    const lines = active("DPT").filter((o) => /sarcopenia/i.test(o));
    assert.equal(lines.length, 1);
    assert.match(lines[0], /muscle fibers also die/);
    assert.doesNotMatch(lines[0], /rather than the number of cells/);
  });
});

describe("REQ-220 study-emphasis weights (FAIL-1136)", () => {
  test("the four nursing courses whose weights are our judgment say so; NCLEX and NPTE do not", () => {
    for (const code of ["CNA", "LPNVN", "ADNRN", "BSNRN"]) assert.equal(track(code).credential?.domainWeights, "study_emphasis", code);
    for (const code of ["NCLEXRN", "NCLEXPN", "NPTEPT", "NPTEPTA", "SECPLUS"]) assert.notEqual(track(code).credential?.domainWeights, "study_emphasis", code);
  });

  test("the server's list of study-emphasis courses is exactly the seed's", async () => {
    const { STUDY_EMPHASIS_TRACK_CODES } = await import("./readiness");
    const { CATALOG_TRACKS } = await import("../supabase/seed/catalog");
    const fromSeed = CATALOG_TRACKS.filter((t) => t.credential?.domainWeights === "study_emphasis").map((t) => t.code).sort();
    assert.deepEqual([...STUDY_EMPHASIS_TRACK_CODES].sort(), fromSeed);
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

describe("REQ-220 clinical framing follows the profession (FAIL-1140)", () => {
  test("PT and EMS courses are not told to reason by the nursing process; nursing courses still are", async () => {
    const { domainFraming } = await import("./prompts");
    const base = { trackTitle: "T", trackType: "certification", categorySlug: "healthcare-nursing", categoryName: "Healthcare & Nursing" };
    const pt = domainFraming({ ...base, subcategorySlug: "physical-therapy" });
    assert.doesNotMatch(pt, /nursing process/);
    assert.match(pt, /patient\/client management model/);
    const ems = domainFraming({ ...base, subcategorySlug: "emergency-medical-services" });
    assert.doesNotMatch(ems, /nursing process/);
    assert.match(ems, /primary assessment/);
    assert.match(domainFraming({ ...base, subcategorySlug: "nclex-preparation" }), /the nursing process/);
    assert.doesNotMatch(domainFraming({ ...base, subcategorySlug: "health-informatics" }), /nursing process/);
  });
});

describe("REQ-220 CCRN pneumonia terms (FAIL-1139)", () => {
  test("the retired 'healthcare-associated pneumonia' category is no longer taught as current", () => {
    const lines = active("CCRNADULT").filter((o) => /pneumonia/i.test(o) && /Classify/.test(o));
    assert.equal(lines.length, 1);
    assert.match(lines[0], /hospital-acquired \(HAP\), ventilator-associated \(VAP\)/);
    assert.doesNotMatch(lines[0], /community-acquired, healthcare-associated,/);
  });
});

describe("REQ-220 dated key values reach the writer and the checker (FAIL-1141)", () => {
  test("the CNA unit with the Heimlich objective carries the AHA 2025 5-and-5 sequence, and the current-facts block names it", async () => {
    const { currentFactsBlock, unitReferenceLines } = await import("./current-facts");
    const cna = track("CNA");
    const unit = cna.units.find((u) => u.objectives.some((o) => /Heimlich/.test(o)))!;
    const block = currentFactsBlock(cna, unit.title)!;
    assert.match(block, /5 back blows, then 5 abdominal thrusts/);
    assert.match(block, /checked 2026-11-11/); // REQ-235: re-read 2026-11-11
    assert.deepEqual(unitReferenceLines(cna, "no such unit"), []);
  });

  test("the fact-checker prompt carries an item's references and says to judge against them", async () => {
    const { factCheckPrompt } = await import("./fact-check");
    const { system, user } = factCheckPrompt({
      items: [{ key: "i1", objectiveTitle: "Heimlich", question: "Q?", format: "single", options: ["a", "b"], expected: [0], references: ["- Reference for this unit: AHA 2025 (u), checked 2026-11-08. Key values: 5 back blows, then 5 abdominal thrusts."] }],
    });
    assert.match(user, /References \(dated, from the course outline\):\n- Reference for this unit: AHA 2025/);
    assert.match(system.task, /judge the item against them, not against an older value you remember/);
  });

  test("the review writer gets each objective's unit references", async () => {
    const { reviewBatchPrompt } = await import("./review-prompts");
    const { user } = reviewBatchPrompt({
      trackTitle: "T",
      objectives: [{ key: "o1", title: "O", unitTitle: "U", teach: "t", knownTerms: [], targetTerms: [], references: ["- Reference for this unit: X (u), checked 2026-11-08. Key values: v."] }],
    });
    assert.match(user, /References \(dated; use these values over older ones you remember\):\n- Reference for this unit: X/);
  });

  test("the CCRN sepsis and stroke units carry their guideline values", () => {
    const units = track("CCRNADULT").units;
    const multi = units.find((u) => u.title === "Multisystem")!;
    assert.ok(multi.sources?.some((s) => s.keyValues?.some((v) => /30 mL\/kg/.test(v))));
    const neuro = units.find((u) => /Neurological/.test(u.title))!;
    assert.ok(neuro.sources?.some((s) => s.keyValues?.some((v) => /185\/110/.test(v))));
  });
});
