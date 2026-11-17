// REQ-326 (docs/sims.md 22.34): depth for the specialty nursing courses and
// NPTE-PTA (sims-health-4, round of 2026-11-17). Purpose-built cases on the
// bedside screen (clinical profile) and the treatment-session screen
// (physical-therapy profile), each a fitting objective's main sim, plus bands
// that register a case to a matching objective of another course. Documents
// are selected by slug from this file's own lists (FAIL-2002).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { scenarioSchema } from "./schema.ts";
import { certMarkProblems } from "./lint.ts";
import { courseObjectives } from "./generator/course.ts";
import { selectionFor } from "./generator/selection.ts";
import { toUsSpelling } from "../us-spelling";

export const REQ326_CASES: readonly { course: string; slug: string; screen: "bedside" | "treatment-session" }[] = [
  { course: "CEN", slug: "dizzy-slow-pulse-atropine-not-working", screen: "bedside" },
  { course: "CEN", slug: "cold-leg-new-numbness", screen: "bedside" },
  { course: "CEN", slug: "bike-crash-breath-sounds-gone", screen: "bedside" },
  { course: "CEN", slug: "copd-drowsy-on-high-flow", screen: "bedside" },
  { course: "CEN", slug: "house-fire-hoarse-voice", screen: "bedside" },
  { course: "CEN", slug: "missed-dialysis-weak-legs", screen: "bedside" },
];

export const REQ326_BANDS: readonly { course: string; slug: string; base: string }[] = [];

const BAND_PATCH_KEYS = ["brief", "objective", "secondaryObjectives", "sources"];
// Permission-only marks and specialist letters (REQ-309/319). GCS is left out:
// in a sim it is the Glasgow Coma Scale (lint.ts).
const MARKS = /\b(BCEN|CEN|PCCN|CMSRN|MSNCB|AACN|ANCC|AANPCB|FNP-BC|ABPTS|APTA|NPTE|FSBPT|CCRN)\b/;

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
  const visible = JSON.stringify({ ...doc, objective: "", secondaryObjectives: [], sources: [], slug: "" }, (k, v) => (k === "source" ? undefined : v));
  assert.doesNotMatch(visible, MARKS, "no specialist letters or the board's marks in sim text");
  const raw = readFileSync(entryOf(course, slug)!.file, "utf8");
  assert.doesNotMatch(raw, /\b(expert|clinician|nurse educator|subject matter)s?\b.{0,40}\b(review|approv)/i, "no claim of a review by clinicians or experts");
  // Drugs appear only as "the ordered" drug: no dose number with a unit.
  assert.doesNotMatch(visible, /\b\d+(\.\d+)?\s?(mg|mcg|microgram|units?\/kg|mg\/kg|mL\/kg|g)\b(?!\/d?L)/i, "no dose in learner text (a lab value in mg/dL is not a dose)");
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

for (const r of REQ326_CASES) {
  test(`${r.course}/${r.slug}: registered, valid, a running ${r.screen} case on engine 1.2`, () => {
    const e = entryOf(r.course, r.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "scenario");
    const parsed = scenarioSchema.safeParse(JSON.parse(readFileSync(e!.file, "utf8")));
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
    const doc = loadDocument(e!);
    assert.equal(doc.screen.type, r.screen);
    assert.equal(doc.outcome.profile, r.screen === "bedside" ? "clinical" : "physical-therapy");
    assert.deepEqual(doc.engine, { major: 1, minor: 2 });
    assert.ok(Object.values(doc.phases).some((p) => p.clock === "running"), "a running phase");
    const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
    assert.ok(keys.length >= 2, "two sourced teaching prompts");
    assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
    const critical = doc.scoring.criteria.filter((c) => c.critical);
    assert.equal(critical.length, 3, "three critical criteria");
    assert.ok(Object.values(doc.endings).some((x) => x.class === "harm" && x.when), "a conditional harm ending");
    assert.ok(doc.endings.unsafe && doc.endings.unsafe.class === "harm", "the unsafe choice leads to a harm ending");
  });
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text names no mark, no specialist letters and no dose`, () => checkLearnerText(r.course, r.slug));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
}

for (const b of REQ326_BANDS) {
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
  test(`${b.course}/${b.slug}: learner text names no mark and no specialist letters`, () => checkLearnerText(b.course, b.slug));
  test(`${b.course}/${b.slug}: goldens cover Good, Mediocre and Bad and all three outcome classes`, () => checkGoldens(b.course, b.slug, false));
}

// The CEN suicide and homicide objective is deliberately not built this round:
// the 18+ gate is per course (mental health category, lib/visibility.ts
// startableTrack), and CEN is not in that category (decision for Nick).
test("no emergency nursing sim teaches suicide or homicide risk until a per-sim 18+ gate exists", () => {
  for (const e of ALL_DOCUMENTS.filter((x) => x.course === "CEN")) {
    const doc = loadDocument(e);
    assert.notEqual(doc.objective, "Screen for suicide and homicide risk, and keep a patient at risk safe in the department", e.slug);
  }
});
