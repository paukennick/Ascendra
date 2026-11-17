// REQ-323 (docs/sims.md 22.32): health sims of the round of 2026-11-17.
// Breadth first: every physical therapy specialty course, NPTE-PTA and the
// strength and conditioning course get at least one sim, by a band (4.7)
// where a DPT or other case already teaches the objective and a new
// treatment-session case where none does. Then depth: nursing bands that
// register existing bedside cases to fitting objectives of the launch and
// specialty courses. Documents are selected by slug from this file's own lists
// (FAIL-2002). Bands change only objective, secondary objectives, sources and
// brief, so the base's thresholds, scoring and endings carry over unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { scenarioSchema } from "./schema.ts";
import { certMarkProblems } from "./lint.ts";
import { courseObjectives } from "./generator/course.ts";
import { selectionFor } from "./generator/selection.ts";
import { toUsSpelling } from "../us-spelling";

export const REQ323_BANDS: readonly { course: string; slug: string; base: string }[] = [
  { course: "ABPTSGCS", slug: "stroke-balance-fall-risk-geri", base: "DPT/stroke-balance-fall-risk" },
  { course: "ABPTSNCS", slug: "dizziness-central-red-flags-neuro", base: "DPT/dizziness-central-red-flags" },
  { course: "ABPTSNCS", slug: "parkinson-freezing-session-neuro", base: "DPT/parkinson-freezing-session" },
  { course: "ABPTSCCS", slug: "icu-early-mobility-cardiopulm", base: "DPT/icu-early-mobility" },
  { course: "ABPTSOCS", slug: "tka-gait-dvt-red-flag-ortho", base: "DPT/tka-gait-dvt-red-flag" },
  { course: "NPTEPTA", slug: "icu-early-mobility-pta", base: "DPT/icu-early-mobility" },
  { course: "NSCACSCS", slug: "cscs-squat-knees-cave", base: "NASMCPT/cpt-squat-knees-cave" },
  { course: "CMSRN", slug: "post-op-transfusion-reaction-cmsrn", base: "NCLEXRN/post-op-transfusion-reaction" },
  { course: "CMSRN", slug: "pca-oversedation-naloxone-cmsrn", base: "ADNRN/pca-oversedation-naloxone" },
  { course: "CMSRN", slug: "med-surg-deterioration-sbar-cmsrn", base: "NCLEXRN/med-surg-deterioration-sbar" },
  { course: "PCCN", slug: "postop-hemorrhage-early-signs-pccn", base: "CMSRN/postop-hemorrhage-early-signs" },
  { course: "PCCN", slug: "sepsis-to-septic-shock-pccn", base: "CCRNADULT/sepsis-to-septic-shock" },
  { course: "PCCN", slug: "status-epilepticus-after-craniotomy-pccn", base: "CCRNADULT/status-epilepticus-after-craniotomy" },
  { course: "NCLEXRN", slug: "femoral-access-retroperitoneal-bleed-nclexrn", base: "PCCN/femoral-access-retroperitoneal-bleed" },
  { course: "FNPANCC", slug: "clinic-severe-bp-stroke-signs-fnp-role", base: "FNPAANP/clinic-severe-bp-stroke-signs" },
  { course: "FNPAANP", slug: "clinic-sulfonylurea-hypoglycemia-fnp-clinical", base: "FNPANCC/clinic-sulfonylurea-hypoglycemia" },
  // Round 2 (docs/sims.md 22.32): bands of this round's own new cases.
  { course: "NCLEXRN", slug: "hallway-head-injury-falling-gcs-nclexrn", base: "CEN/hallway-head-injury-falling-gcs" },
  { course: "NCLEXRN", slug: "delirium-night-prn-restraint-order-nclexrn", base: "CMSRN/delirium-night-prn-restraint-order" },
  { course: "FNPANCC", slug: "two-falls-not-herself-fnp-role", base: "FNPAANP/two-falls-not-herself" },
];

export const REQ323_SCENARIOS: readonly { course: string; slug: string }[] = [
  { course: "ABPTSPWCS", slug: "prenatal-exercise-severe-bp-headache" },
  { course: "ABPTSSCS", slug: "preseason-collapse-heat-stroke" },
  { course: "ABPTSWMS", slug: "leg-ulcer-calcified-abi-compression" },
  { course: "ABPTSPCS", slug: "knee-pain-limp-hip-slip" },
  { course: "ABPTSOCS", slug: "acute-back-pain-mri-request-cauda-equina" },
  { course: "ABPTSONC", slug: "post-mastectomy-strength-start-back-pain" },
  { course: "ABPTSECS", slug: "carpal-tunnel-referral-demyelinating-gbs" },
  // Round 2: the PTA musculoskeletal case.
  { course: "NPTEPTA", slug: "pta-back-pain-new-bladder-symptoms" },
];

// Round 2 (docs/sims.md 22.32): new bedside cases for the emergency nursing
// course, nursing depth and the launch courses, in the shape of the
// treatment-session cases above (assess, recognize, act by the right route),
// on the bedside screen with the clinical profile.
export const REQ323_BEDSIDE: readonly { course: string; slug: string }[] = [
  { course: "CEN", slug: "triage-indigestion-inferior-stemi" },
  { course: "CEN", slug: "asthma-attack-quiet-chest" },
  { course: "CEN", slug: "diving-injury-low-pressure-slow-pulse" },
  { course: "CEN", slug: "bee-sting-anaphylaxis-triage" },
  { course: "CEN", slug: "black-stools-then-hematemesis" },
  { course: "CEN", slug: "tearing-pain-heparin-ordered" },
  { course: "CEN", slug: "hallway-head-injury-falling-gcs" },
  { course: "PCCN", slug: "pacing-wires-pulled-then-restless" },
  { course: "PCCN", slug: "capnography-alarm-saturation-fine" },
  { course: "CMSRN", slug: "delirium-night-prn-restraint-order" },
  { course: "FNPAANP", slug: "two-falls-not-herself" },
  { course: "CCRNADULT", slug: "falling-platelets-cold-foot-on-heparin" },
  { course: "NCLEXPN", slug: "ltc-critical-potassium-call" },
];

// The breadth courses of this round; each must have at least one sim.
const BREADTH = ["ABPTSOCS", "ABPTSGCS", "ABPTSNCS", "ABPTSCCS", "ABPTSPCS", "ABPTSSCS", "ABPTSONC", "ABPTSECS", "ABPTSPWCS", "ABPTSWMS", "NPTEPTA", "NSCACSCS"];
const BAND_PATCH_KEYS = ["brief", "objective", "secondaryObjectives", "sources"];
// The specialist letters and the certifying body's marks (REQ-309/319). GCS
// is left out: in a sim it is the Glasgow Coma Scale (lint.ts).
const SPECIALTY_MARKS = /\b(ABPTS|APTA|OCS|NCS|CCS|PCS|SCS|ECS|PWCS|WMS)\b/;

interface GoldenPath { id: string; expect: { ending: string; rating: string; criteria: Record<string, string> } }

const entryOf = (course: string, slug: string) => ALL_DOCUMENTS.find((e) => e.course === course && e.slug === slug);
const jsonbOrder = (a: string, b: string): number => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

function checkObjectives(course: string, slug: string): void {
  const doc = loadDocument(entryOf(course, slug)!);
  const objectives = courseObjectives(course);
  const ctx = objectives.find((o) => toUsSpelling(o.objective) === toUsSpelling(doc.objective));
  assert.ok(ctx, `objective in the ${course} catalog: ${doc.objective}`);
  assert.ok(selectionFor(ctx!).qualifies, `"${doc.objective}" passes the selection screen`);
  const titles = new Set(objectives.map((o) => toUsSpelling(o.objective)));
  for (const s of doc.secondaryObjectives ?? []) assert.ok(titles.has(toUsSpelling(s)), `secondary objective in the ${course} catalog: ${s}`);
  assert.ok(!(doc.secondaryObjectives ?? []).includes(doc.objective), "the main objective is not also secondary");
}

function checkSources(course: string, slug: string): void {
  for (const s of loadDocument(entryOf(course, slug)!).sources) {
    assert.match(s.checkedAt ?? "", /^\d{4}-\d{2}-\d{2}$/, `${s.cite}: dated`);
    if (!s.url) continue;
    assert.match(s.note ?? "", /^(Read|Relayed)/, `${s.cite}: note starts with how it was read (FAIL-1981)`);
  }
}

function checkLearnerText(course: string, slug: string): void {
  const doc = loadDocument(entryOf(course, slug)!);
  assert.deepEqual(certMarkProblems(doc), [], "no permission-only body's mark (REQ-309)");
  // Learner-visible text only: everything but the catalog-owned objective
  // titles, the citations and the slug, as certMarkProblems walks it.
  const visible = JSON.stringify({ ...doc, objective: "", secondaryObjectives: [], sources: [], slug: "" }, (k, v) => (k === "source" ? undefined : v));
  assert.doesNotMatch(visible, SPECIALTY_MARKS, "no specialist letters or the board's marks in sim text");
  assert.doesNotMatch(readFileSync(entryOf(course, slug)!.file, "utf8"), /\b(expert|clinician|nurse educator|subject matter)s?\b.{0,40}\b(review|approv)/i, "no claim of a review by clinicians or experts");
}

function checkGoldens(course: string, slug: string, everyEnding: boolean): void {
  const e = entryOf(course, slug)!;
  const g = JSON.parse(readFileSync(e.golden!, "utf8")) as { paths: GoldenPath[] };
  const ratings = new Set(g.paths.map((p) => p.expect.rating));
  for (const want of ["good", "mediocre", "bad"]) assert.ok(ratings.has(want), `a ${want} path`);
  const doc = loadDocument(e);
  const reached = new Set(g.paths.map((p) => p.expect.ending));
  const classes = new Set(Object.entries(doc.endings).filter(([id]) => reached.has(id)).map(([, x]) => x.class));
  for (const c of ["target", "recovered", "harm"]) assert.ok(classes.has(c as never), `a golden path reaches a ${c} ending`);
  const conditional = Object.entries(doc.endings).filter(([, x]) => x.when).map(([id]) => id);
  assert.deepEqual([...(doc.endingOrder ?? [])].sort(), [...conditional].sort(), "endingOrder lists every conditional ending");
  if (!everyEnding) return;
  for (const id of Object.keys(doc.endings)) if (id !== "time_up") assert.ok(reached.has(id), `ending ${id} reached`);
  for (const c of doc.scoring.criteria) {
    const scores = new Set(g.paths.map((p) => p.expect.criteria[c.id]));
    assert.ok(scores.has("met") && scores.has("missed"), `${c.id} met and missed`);
  }
}

test("every breadth course of the round has at least one sim", () => {
  for (const c of BREADTH) assert.ok(ALL_DOCUMENTS.some((e) => e.course === c), `${c} has a sim`);
});

for (const b of REQ323_BANDS) {
  test(`${b.course}/${b.slug}: a band of ${b.base}, registered and compiled`, () => {
    const e = entryOf(b.course, b.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "band");
    const raw = JSON.parse(readFileSync(e!.file, "utf8")) as { base: { course: string; slug: string }; slug: string; patch: Record<string, unknown>; append?: unknown };
    assert.equal(`${raw.base.course}/${raw.base.slug}`, b.base);
    assert.equal(raw.slug, b.slug);
    assert.notEqual(raw.base.course, b.course, "a band registers another course's case");
    for (const k of Object.keys(raw.patch)) assert.ok(BAND_PATCH_KEYS.includes(k), `patch changes only ${BAND_PATCH_KEYS.join(", ")}: ${k}`);
    assert.equal(raw.append, undefined);
    const doc = loadDocument(e!);
    assert.ok(scenarioSchema.safeParse(doc).success, "the compiled band passes the schema");
    const [bc, bs] = b.base.split("/");
    const base = loadDocument(entryOf(bc, bs)!);
    assert.deepEqual(doc.scoring, base.scoring, "scoring is the base's");
    assert.deepEqual(doc.outcome, base.outcome, "outcome thresholds are the base's");
    assert.deepEqual(doc.endings, base.endings, "endings are the base's");
  });
  test(`${b.course}/${b.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(b.course, b.slug));
  test(`${b.course}/${b.slug}: sources are dated and say how they were read`, () => checkSources(b.course, b.slug));
  test(`${b.course}/${b.slug}: learner text names no permission-only mark`, () => checkLearnerText(b.course, b.slug));
  test(`${b.course}/${b.slug}: goldens cover Good, Mediocre and Bad and all three outcome classes`, () => checkGoldens(b.course, b.slug, false));
}

for (const r of REQ323_SCENARIOS) {
  test(`${r.course}/${r.slug}: registered, valid, a running treatment session on engine 1.2`, () => {
    const e = entryOf(r.course, r.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "scenario");
    const parsed = scenarioSchema.safeParse(JSON.parse(readFileSync(e!.file, "utf8")));
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
    const doc = loadDocument(e!);
    assert.equal(doc.screen.type, "treatment-session");
    assert.equal(doc.outcome.profile, "physical-therapy");
    assert.deepEqual(doc.engine, { major: 1, minor: 2 });
    assert.ok(Object.values(doc.phases).some((p) => p.clock === "running"), "a running phase");
    const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
    assert.ok(keys.length >= 1, "a sourced teaching prompt");
    assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
    const critical = doc.scoring.criteria.filter((c) => c.critical);
    assert.ok(critical.length >= 3 && critical.length <= 4, "three or four critical criteria");
    assert.ok(Object.values(doc.endings).some((x) => x.class === "harm" && x.when), "a conditional harm ending");
  });
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text names no permission-only mark and no specialist letters`, () => checkLearnerText(r.course, r.slug));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
}

for (const r of REQ323_BEDSIDE) {
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
    assert.ok(keys.length >= 1, "a sourced teaching prompt");
    assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
    const critical = doc.scoring.criteria.filter((c) => c.critical);
    assert.ok(critical.length >= 3 && critical.length <= 4, "three or four critical criteria");
    assert.ok(Object.values(doc.endings).some((x) => x.class === "harm" && x.when), "a conditional harm ending");
  });
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text names no permission-only mark and no specialist letters`, () => checkLearnerText(r.course, r.slug));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
}

// The emergency nursing course had no case of its own in its highest-weighted
// categories; round 2 gives each of the four largest at least one.
test("emergency nursing: a case in each of the four highest-weighted categories", () => {
  const units = new Set(REQ323_BEDSIDE.filter((r) => r.course === "CEN").map((r) => {
    const doc = loadDocument(entryOf(r.course, r.slug)!);
    return courseObjectives("CEN").find((o) => o.objective === doc.objective)!.unitTitle;
  }));
  for (const u of ["Cardiovascular Emergencies", "Respiratory Emergencies", "Neurological Emergencies", "Medical Emergencies"]) assert.ok(units.has(u), `a case in ${u}`);
});
