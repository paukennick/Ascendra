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

export const REQ338_BANDS: readonly { course: string; slug: string; base: string }[] = [
  { course: "ACECPT", slug: "ace-low-glucose-mid-intervals", base: "NASMCPT/cpt-low-glucose-mid-intervals" },
  { course: "ACSMCPT", slug: "acsm-low-glucose-mid-intervals", base: "NASMCPT/cpt-low-glucose-mid-intervals" },
  { course: "NCCPTCPT", slug: "nccpt-low-glucose-mid-intervals", base: "NASMCPT/cpt-low-glucose-mid-intervals" },
  { course: "NSCACPT", slug: "nscacpt-low-glucose-mid-intervals", base: "NASMCPT/cpt-low-glucose-mid-intervals" },
  { course: "ACECPT", slug: "ace-six-weeks-off-make-it-up", base: "NASMCPT/cpt-six-weeks-off-make-it-up" },
  { course: "ACSMCPT", slug: "acsm-six-weeks-off-make-it-up", base: "NASMCPT/cpt-six-weeks-off-make-it-up" },
  { course: "NCCPTCPT", slug: "nccpt-six-weeks-off-make-it-up", base: "NASMCPT/cpt-six-weeks-off-make-it-up" },
  { course: "ACECPT", slug: "ace-watch-zone-on-a-beta-blocker", base: "NASMCPT/cpt-watch-zone-on-a-beta-blocker" },
  { course: "NSCACPT", slug: "nscacpt-watch-zone-on-a-beta-blocker", base: "NASMCPT/cpt-watch-zone-on-a-beta-blocker" },
  { course: "NCCPTCPT", slug: "nccpt-twenty-four-weeks-leaking-fluid", base: "NASMCPT/cpt-twenty-four-weeks-leaking-fluid" },
  { course: "ACECPT", slug: "ace-twenty-four-weeks-leaking-fluid", base: "NASMCPT/cpt-twenty-four-weeks-leaking-fluid" },
  { course: "ACSMCPT", slug: "acsm-twenty-four-weeks-leaking-fluid", base: "NASMCPT/cpt-twenty-four-weeks-leaking-fluid" },
  { course: "NREMTEMT", slug: "emt-line-down-on-the-car", base: "NREMTEMR/emr-line-down-on-the-car" },
  { course: "NREMTAEMT", slug: "aemt-low-sugar-now-says-no", base: "NREMTEMT/emt-low-sugar-now-says-no" },
];

export const REQ338_TRAINER: readonly { course: string; slug: string }[] = [
  { course: "NASMCPT", slug: "cpt-low-glucose-mid-intervals" },
  { course: "NASMCPT", slug: "cpt-six-weeks-off-make-it-up" },
  { course: "NASMCPT", slug: "cpt-watch-zone-on-a-beta-blocker" },
  { course: "NASMCPT", slug: "cpt-twenty-four-weeks-leaking-fluid" },
  { course: "NASMCNC", slug: "cnc-losing-too-fast-and-thirsty" },
  { course: "NSCACSCS", slug: "cscs-first-day-back-collapse-in-heat" },
  { course: "NSCACSCS", slug: "cscs-shuttle-test-trait-on-file" },
  { course: "NSCACSCS", slug: "cscs-winter-return-gut-check-squats" },
];

export const REQ338_BEDSIDE: readonly { course: string; slug: string }[] = [
  { course: "NREMTEMR", slug: "emr-line-down-on-the-car" },
  { course: "NREMTEMR", slug: "emr-finish-line-confused-runner" },
  { course: "NREMTEMR", slug: "emr-head-cut-wants-to-drive-home" },
  { course: "NREMTEMT", slug: "emt-head-bump-on-a-blood-thinner" },
  { course: "NREMTEMT", slug: "emt-low-sugar-now-says-no" },
  { course: "NREMTAEMT", slug: "aemt-copd-tripod-cpap" },
  { course: "NREMTAEMT", slug: "aemt-chest-pressure-pill-last-night" },
  { course: "NREMTAEMT", slug: "aemt-belly-pain-fainted-in-bathroom" },
  { course: "NREMTPARAMEDIC", slug: "medic-racing-heart-pressure-falling" },
  { course: "NREMTPARAMEDIC", slug: "medic-assisted-living-fever-confused" },
  { course: "NREMTPARAMEDIC", slug: "medic-polst-selective-daughter-wants-everything" },
  { course: "NREMTPARAMEDIC", slug: "medic-chest-stab-pulse-lost" },
];

// Main objectives that the keyword screen (selection.ts) does not pick up but
// that meet Nick's rule on reading (time, cues, choices with consequences,
// competing priorities), each with the reason. Everything else must pass the
// screen.
const JUDGED: Readonly<Record<string, string>> = {
  "NASMCPT/cpt-six-weeks-off-make-it-up": "handling a lapse has choices with consequences (blame loses the client, a catch-up load causes exertional rhabdomyolysis) and cues to read",
  "NASMCPT/cpt-twenty-four-weeks-leaking-fluid": "prenatal program design has cues (lightheaded lying flat, fluid leakage) and a time-critical stop-and-call",
  "NCCPTCPT/nccpt-twenty-four-weeks-leaking-fluid": "as its base: prenatal modification with a time-critical warning sign",
  "ACECPT/ace-twenty-four-weeks-leaking-fluid": "as its base: modifying a program for a changing health condition, with a warning sign",
  "ACSMCPT/acsm-twenty-four-weeks-leaking-fluid": "as its base: modifications for a pregnant client, with a warning sign",
};

// The round's target (round-1117b): every unit with an objective fitting the
// selection rule has a sim whose main objective sits in it, except the units
// recorded here as no fit with a reason (docs/sims.md 22.42); a course under
// 60 objectives has at least 4 sims, from 60 at least 8.
export const REQ338_COURSES = ["NREMTEMR", "NREMTEMT", "NREMTAEMT", "NREMTPARAMEDIC", "ACECPT", "ACSMCPT", "NASMCPT", "NASMCNC", "NCCPTCPT", "NSCACPT", "NSCACSCS"];
export const REQ338_NO_FIT: Readonly<Record<string, string>> = {
  "NASMCPT/Exercise technique and training instruction": "technique coaching with nothing time-critical unfolding; covered as secondary objectives by the overhead squat case",
  "NCCPTCPT/Applied science: anatomy, kinesiology and physiology": "science knowledge; the labs cover it",
  "NCCPTCPT/Nutrition": "a trainer's nutrition knowledge; the nutrition coach cases teach the decisions in their own scope",
  "NSCACSCS/Scientific Foundations: exercise science": "Scientific Foundations stays no fit (round-1117b)",
  "NSCACSCS/Scientific Foundations: sport psychology": "Scientific Foundations stays no fit (round-1117b)",
  "NSCACSCS/Scientific Foundations: nutrition": "Scientific Foundations stays no fit (round-1117b)",
};

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
  // FAIL-2531: the validator wants a real one-line rationale for noProgress.
  if (doc.outcome.noProgress) assert.ok((doc.outcome.noProgress.rationale ?? "").trim().length >= 20, "noProgress rationale of at least 20 characters");
  // FAIL-2530: ids are shared across a trainer screen's readings, findings, rules and journal.
  const tr = doc.screen.trainer;
  if (tr) {
    const ids = [...(tr.readings ?? []), ...(tr.findings ?? []), ...tr.rules, ...(tr.journal ?? []), ...(tr.intake?.items ?? []), ...tr.gauges].map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length, `screen ids unique: ${ids.join(",")}`);
  }
  const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
  assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
}

for (const course of REQ338_COURSES) {
  test(`${course}: every unit has a main-objective sim or a recorded no fit, and the course reaches its count`, () => {
    const objectives = courseObjectives(course);
    const docs = ALL_DOCUMENTS.filter((e) => e.course === course).map((e) => loadDocument(e));
    assert.ok(docs.length >= (objectives.length >= 60 ? 8 : 4), `${course}: ${docs.length} sims for ${objectives.length} objectives`);
    const mains = new Set(docs.map((d) => toUsSpelling(d.objective)));
    for (const unit of new Set(objectives.map((o) => o.unitTitle))) {
      const inUnit = objectives.filter((o) => o.unitTitle === unit);
      const covered = inUnit.some((o) => mains.has(toUsSpelling(o.objective)));
      assert.ok(covered || REQ338_NO_FIT[`${course}/${unit}`], `${course} unit "${unit}" has a main-objective sim or a no-fit reason`);
    }
  });
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
