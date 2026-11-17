// REQ-325 (docs/sims.md 22.33): nursing depth of the round of 2026-11-17,
// third builder. Purpose-written bedside cases for the launch nursing courses
// (CCRN Adult, NCLEX-RN, NCLEX-PN), highest-weighted categories first, in the
// shape of the round-2 bedside cases (health-sims-1117.test.ts): assessments
// share one timer, a red-flag finding is timed against the escalation, and
// leaving for the next level of care ends the run. Documents are selected by
// slug from this file's own list (FAIL-2002).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { scenarioSchema } from "./schema.ts";
import { certMarkProblems } from "./lint.ts";
import { courseObjectives } from "./generator/course.ts";
import { selectionFor } from "./generator/selection.ts";
import { toUsSpelling } from "../us-spelling";

export const REQ325_BEDSIDE: readonly { course: string; slug: string }[] = [
  // CCRN Adult: Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary (21%).
  { course: "CCRNADULT", slug: "low-urine-after-contrast-on-vancomycin" },
  { course: "CCRNADULT", slug: "oozing-lines-in-septic-shock" },
  { course: "CCRNADULT", slug: "pressor-climbing-home-prednisone-missed" },
  { course: "CCRNADULT", slug: "pale-urine-after-pituitary-surgery" },
  { course: "CCRNADULT", slug: "fever-ten-days-after-chemo" },
  { course: "CCRNADULT", slug: "cirrhosis-hematemesis-at-night" },
  { course: "CCRNADULT", slug: "pressor-arm-cold-and-pale" },
  { course: "CCRNADULT", slug: "tight-belly-after-massive-resuscitation" },
  // CCRN Adult: Musculoskeletal, Neurological, Behavioral/Psychosocial (18%).
  { course: "CCRNADULT", slug: "pounding-headache-c6-injury" },
  { course: "CCRNADULT", slug: "tibial-fracture-pain-out-of-proportion" },
  { course: "CCRNADULT", slug: "day-six-after-coiling-new-weakness" },
  { course: "CCRNADULT", slug: "fever-stiff-neck-waiting-for-lp" },
  // CCRN Adult: Multisystem (16%).
  { course: "CCRNADULT", slug: "toothache-tablets-level-above-line" },
  { course: "CCRNADULT", slug: "found-on-floor-tea-colored-urine" },
  // NCLEX-PN: Coordinated Care (21%), Pharmacological Therapies (13%), Physiological Adaptation (10%).
  { course: "NCLEXPN", slug: "aide-feeding-thin-liquids-dysphagia" },
  { course: "NCLEXPN", slug: "warfarin-inr-high-tarry-stool" },
  { course: "NCLEXPN", slug: "clinic-belly-pain-moved-right" },
  // NCLEX-RN: Management of Care (18%), Pharmacological and Parenteral Therapies (16%),
  // Physiological Adaptation (14%), Safety and Infection Prevention (13%), Reduction of Risk Potential (12%).
  { course: "NCLEXRN", slug: "preop-consent-after-opioid" },
  { course: "NCLEXRN", slug: "digoxin-due-yellow-halos" },
  { course: "NCLEXRN", slug: "insulin-given-to-wrong-bed" },
  { course: "NCLEXRN", slug: "heparin-aptt-high-pink-urine" },
  { course: "NCLEXRN", slug: "postop-fever-150-graves-meds-stopped" },
  { course: "NCLEXRN", slug: "day-two-chemo-potassium-climbing" },
  { course: "NCLEXRN", slug: "pacu-snoring-then-vomiting" },
];

// The specialist letters (REQ-309/319). GCS is the Glasgow Coma Scale here.
const SPECIALTY_MARKS = /\b(ABPTS|APTA|OCS|NCS|CCS|PCS|SCS|ECS|PWCS|WMS)\b/;
// A dose is a number followed by a dosing unit; none may appear in learner text (the brief's rule). Output
// criteria such as 0.5 mL/kg/h and lab values in mg/dL are not doses.
const DOSE = /\b\d+(\.\d+)?\s?(mg(?!\/dL)|mcg|micrograms?|units?|g\/kg|mEq\/kg)\b/i;

interface GoldenPath { id: string; expect: { ending: string; rating: string; criteria: Record<string, string> } }

const entryOf = (course: string, slug: string) => ALL_DOCUMENTS.find((e) => e.course === course && e.slug === slug);
const jsonbOrder = (a: string, b: string): number => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

for (const r of REQ325_BEDSIDE) {
  test(`${r.course}/${r.slug}: registered, valid, a running bedside case on engine 1.2`, () => {
    const e = entryOf(r.course, r.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "scenario");
    const parsed = scenarioSchema.safeParse(JSON.parse(readFileSync(e!.file, "utf8")));
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
    const doc = loadDocument(e!);
    assert.equal(doc.screen.type, "bedside");
    assert.equal(doc.outcome.profile, "clinical");
    assert.deepEqual(doc.engine, { major: 1, minor: 2 });
    assert.ok(Object.values(doc.phases).some((p) => p.clock === "running"), "a running phase");
    const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
    assert.ok(keys.length >= 2, "two sourced teaching prompts");
    assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
    const critical = doc.scoring.criteria.filter((c) => c.critical);
    assert.ok(critical.length >= 3 && critical.length <= 4, "three or four critical criteria");
    assert.ok(Object.values(doc.endings).some((x) => x.class === "harm" && x.when), "a conditional harm ending");
  });

  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own and fit the selection screen`, () => {
    const doc = loadDocument(entryOf(r.course, r.slug)!);
    const objectives = courseObjectives(r.course);
    const ctx = objectives.find((o) => toUsSpelling(o.objective) === toUsSpelling(doc.objective));
    assert.ok(ctx, `objective in the ${r.course} catalog: ${doc.objective}`);
    assert.ok(selectionFor(ctx!).qualifies, `"${doc.objective}" passes the selection screen`);
    const titles = new Set(objectives.map((o) => toUsSpelling(o.objective)));
    for (const s of doc.secondaryObjectives ?? []) assert.ok(titles.has(toUsSpelling(s)), `secondary objective in the ${r.course} catalog: ${s}`);
    assert.ok(!(doc.secondaryObjectives ?? []).includes(doc.objective), "the main objective is not also secondary");
  });

  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => {
    for (const s of loadDocument(entryOf(r.course, r.slug)!).sources) {
      assert.match(s.checkedAt ?? "", /^\d{4}-\d{2}-\d{2}$/, `${s.cite}: dated`);
      if (!s.url) continue;
      assert.match(s.note ?? "", /^(Read|Relayed)/, `${s.cite}: note starts with how it was read (FAIL-1981)`);
    }
  });

  test(`${r.course}/${r.slug}: learner text names no permission-only mark, no specialist letters, no dose, no review claim`, () => {
    const e = entryOf(r.course, r.slug)!;
    const doc = loadDocument(e);
    assert.deepEqual(certMarkProblems(doc), [], "no permission-only body's mark (REQ-309)");
    const visible = JSON.stringify({ ...doc, objective: "", secondaryObjectives: [], sources: [], slug: "", params: {} }, (k, v) => (k === "source" ? undefined : v));
    assert.doesNotMatch(visible, SPECIALTY_MARKS, "no specialist letters or the board's marks in sim text");
    assert.doesNotMatch(visible, DOSE, "drugs appear as 'the ordered' drug, with no dose");
    assert.doesNotMatch(readFileSync(e.file, "utf8"), /\b(expert|clinician|nurse educator|subject matter)s?\b.{0,40}\b(review|approv)/i, "no claim of a review by clinicians or experts");
  });

  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => {
    const e = entryOf(r.course, r.slug)!;
    const g = JSON.parse(readFileSync(e.golden!, "utf8")) as { paths: GoldenPath[] };
    const ratings = new Set(g.paths.map((p) => p.expect.rating));
    for (const want of ["good", "mediocre", "bad"]) assert.ok(ratings.has(want), `a ${want} path`);
    const doc = loadDocument(e);
    const reached = new Set(g.paths.map((p) => p.expect.ending));
    for (const id of Object.keys(doc.endings)) if (id !== "time_up") assert.ok(reached.has(id), `ending ${id} reached`);
    const conditional = Object.entries(doc.endings).filter(([, x]) => x.when).map(([id]) => id);
    assert.deepEqual([...(doc.endingOrder ?? [])].sort(), [...conditional].sort(), "endingOrder lists every conditional ending");
    for (const c of doc.scoring.criteria) {
      const scores = new Set(g.paths.map((p) => p.expect.criteria[c.id]));
      assert.ok(scores.has("met") && scores.has("missed"), `${c.id} met and missed`);
    }
  });
}

// The round's brief: highest-weighted categories first. Each launch course
// gets a case in its highest-weighted category that has a fitting objective.
test("highest-weighted categories first: a case in each course's top fitting category", () => {
  const unitsOf = (course: string) => new Set(REQ325_BEDSIDE.filter((r) => r.course === course).map((r) => {
    const doc = loadDocument(entryOf(r.course, r.slug)!);
    return courseObjectives(course).find((o) => toUsSpelling(o.objective) === toUsSpelling(doc.objective))!.unitTitle;
  }));
  assert.ok(unitsOf("CCRNADULT").has("Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary"));
  assert.ok(unitsOf("NCLEXPN").has("Coordinated Care"));
  assert.ok(unitsOf("NCLEXRN").has("Management of Care"));
});
