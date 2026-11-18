// REQ-338 (docs/sims.md 22.42): EMS and fitness depth of the round of
// 2026-11-17. Every unit of the four NREMT courses, the personal trainer
// courses, the nutrition coach course and the strength and conditioning
// course that has an objective fitting the selection rule gets a sim whose
// main objective sits in it, and each course reaches the round's count (4
// below 60 objectives, 8 from 60). New cases are bedside (EMS, within each
// level's scope of practice) or trainer (fitness); a band registers an
// existing case to another course's objective only where the scope matches.
// Documents are selected by slug from this file's own lists (FAIL-2002).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { scenarioSchema } from "./schema.ts";
import { certMarkProblems } from "./lint.ts";
import { courseObjectives } from "./generator/course.ts";
import { selectionFor } from "./generator/selection.ts";
import { toUsSpelling } from "../us-spelling";

export const REQ338_BANDS: readonly { course: string; slug: string; base: string }[] = [];

export const REQ338_TRAINER: readonly { course: string; slug: string }[] = [
  { course: "NASMCPT", slug: "cpt-low-glucose-mid-intervals" },
];

export const REQ338_BEDSIDE: readonly { course: string; slug: string }[] = [];

// Main objectives that the keyword screen (selection.ts) does not pick up but
// that meet Nick's rule on reading (time, cues, choices with consequences,
// competing priorities), each with the reason. Everything else must pass the
// screen.
const JUDGED: Readonly<Record<string, string>> = {};

const BAND_PATCH_KEYS = ["brief", "objective", "secondaryObjectives", "sources"];
interface GoldenPath { id: string; expect: { ending: string; rating: string; criteria: Record<string, string> } }

const entryOf = (course: string, slug: string) => ALL_DOCUMENTS.find((e) => e.course === course && e.slug === slug);
const jsonbOrder = (a: string, b: string): number => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

function checkObjectives(course: string, slug: string): void {
  const doc = loadDocument(entryOf(course, slug)!);
  const objectives = courseObjectives(course);
  const ctx = objectives.find((o) => toUsSpelling(o.objective) === toUsSpelling(doc.objective));
  assert.ok(ctx, `objective in the ${course} catalog: ${doc.objective}`);
  if (!JUDGED[`${course}/${slug}`]) assert.ok(selectionFor(ctx!).qualifies, `"${doc.objective}" passes the selection screen`);
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

function checkAuthored(course: string, slug: string, screen: string, profile: string): void {
  const e = entryOf(course, slug);
  assert.ok(e, "registered in ALL_DOCUMENTS");
  assert.equal(e!.kind, "scenario");
  const parsed = scenarioSchema.safeParse(JSON.parse(readFileSync(e!.file, "utf8")));
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
  const doc = loadDocument(e!);
  assert.equal(doc.screen.type, screen);
  assert.equal(doc.outcome.profile, profile);
  assert.deepEqual(doc.engine, { major: 1, minor: 2 });
  const critical = doc.scoring.criteria.filter((c) => c.critical);
  assert.ok(critical.length >= 3 && critical.length <= 4, "three or four critical criteria");
  assert.ok(Object.values(doc.endings).some((x) => x.class === "harm" && x.when), "a conditional harm ending");
  assert.ok(doc.reasoning && Object.keys(doc.reasoning).length >= 1, "a reasoning moment");
  const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
  assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
}

for (const b of REQ338_BANDS) {
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
    assert.deepEqual(doc.actions, base.actions, "actions are the base's, so the scope of practice is the same");
  });
  test(`${b.course}/${b.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(b.course, b.slug));
  test(`${b.course}/${b.slug}: sources are dated and say how they were read`, () => checkSources(b.course, b.slug));
  test(`${b.course}/${b.slug}: learner text names no permission-only mark`, () => checkLearnerText(b.course, b.slug));
  test(`${b.course}/${b.slug}: goldens cover Good, Mediocre and Bad and all three outcome classes`, () => checkGoldens(b.course, b.slug, false));
}

for (const r of REQ338_TRAINER) {
  test(`${r.course}/${r.slug}: registered, valid, a learner-paced trainer case on engine 1.2`, () => {
    checkAuthored(r.course, r.slug, "trainer", "fitness");
    const doc = loadDocument(entryOf(r.course, r.slug)!);
    assert.ok(Object.values(doc.phases).every((p) => p.clock !== "running"), "learner-paced: no running phase");
    assert.ok((doc.screen.trainer?.rules ?? []).length >= 1, "at least one scope or stop rule on screen");
    assert.ok(doc.safetyNote, "an author-facing safety note");
  });
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text names no permission-only mark`, () => checkLearnerText(r.course, r.slug));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
}

for (const r of REQ338_BEDSIDE) {
  test(`${r.course}/${r.slug}: registered, valid, a running bedside case on engine 1.2`, () => {
    checkAuthored(r.course, r.slug, "bedside", "clinical");
    const doc = loadDocument(entryOf(r.course, r.slug)!);
    assert.ok(Object.values(doc.phases).some((p) => p.clock === "running"), "a running phase");
    const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
    assert.ok(keys.length >= 1, "a sourced teaching prompt");
  });
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text names no permission-only mark`, () => checkLearnerText(r.course, r.slug));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
}
