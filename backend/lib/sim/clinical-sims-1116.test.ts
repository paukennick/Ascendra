// REQ-315 (docs/sims.md 22.28): clinical sims of the round of 2026-11-16.
// Nick approved building every fitting clinical objective on an existing
// screen, launch courses first, and registering a band (4.7) where another
// course's sim already teaches the objective. Each document here is selected
// by slug from this requirement's own list (FAIL-2002), registers to a
// catalog objective of its course that the selection rule passes, and its
// golden paths cover Good, Mediocre and Bad. Bands change only what makes the
// case this course's (objective, secondary objectives, sources, brief), so
// the base's thresholds and scoring carry over unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, NBCC_SESSION_DOCUMENTS, loadDocument } from "./documents.ts";
import { scenarioSchema } from "./schema.ts";
import { courseObjectives } from "./generator/course.ts";
import { selectionFor } from "./generator/selection.ts";
import { toUsSpelling } from "../us-spelling";

export const REQ315_BANDS: readonly { course: string; slug: string; base: string }[] = [
  { course: "NCLEXRN", slug: "delegation-morning-assignment-nclexrn", base: "CMSRN/delegation-morning-assignment" },
  { course: "NCLEXRN", slug: "postop-hemorrhage-early-signs-nclexrn", base: "CMSRN/postop-hemorrhage-early-signs" },
  { course: "NCLEXRN", slug: "heart-failure-pulmonary-edema-nclexrn", base: "ADNRN/heart-failure-pulmonary-edema" },
  { course: "NCLEXRN", slug: "pca-oversedation-naloxone-nclexrn", base: "ADNRN/pca-oversedation-naloxone" },
  { course: "NCLEXRN", slug: "copd-exacerbation-niv-nclexrn", base: "PCCN/copd-exacerbation-niv" },
  { course: "NCLEXRN", slug: "sepsis-to-septic-shock-nclexrn", base: "CCRNADULT/sepsis-to-septic-shock" },
  { course: "NCLEXPN", slug: "ltc-insulin-hypoglycemia-nclexpn", base: "LPNVN/ltc-insulin-hypoglycemia" },
  { course: "NCLEXPN", slug: "ltc-pressure-injury-infection-nclexpn", base: "LPNVN/ltc-pressure-injury-infection" },
  { course: "CCRNADULT", slug: "copd-exacerbation-niv-ccrn", base: "PCCN/copd-exacerbation-niv" },
  { course: "CCRNADULT", slug: "post-op-transfusion-reaction-ccrn", base: "NCLEXRN/post-op-transfusion-reaction" },
  { course: "CCRNADULT", slug: "pca-oversedation-naloxone-ccrn", base: "ADNRN/pca-oversedation-naloxone" },
  { course: "CCRNADULT", slug: "heart-failure-pulmonary-edema-ccrn", base: "ADNRN/heart-failure-pulmonary-edema" },
  { course: "NPTEPT", slug: "tka-gait-dvt-red-flag-npte", base: "DPT/tka-gait-dvt-red-flag" },
  { course: "NPTEPT", slug: "parkinson-freezing-session-npte", base: "DPT/parkinson-freezing-session" },
  { course: "NPTEPT", slug: "dizziness-central-red-flags-npte", base: "DPT/dizziness-central-red-flags" },
  { course: "NPTEPT", slug: "icu-early-mobility-npte", base: "DPT/icu-early-mobility" },
  { course: "NPTEPT", slug: "stroke-balance-fall-risk-npte", base: "DPT/stroke-balance-fall-risk" },
  { course: "NCE", slug: "nce-suicide-safety-plan", base: "NCMHCE/ncmhce-suicide-safety-plan" },
  { course: "NCMHCE", slug: "ncmhce-boundary-dual-relationship", base: "NCE/nce-boundary-dual-relationship" },
];

// New scenarios of this requirement (not bands).
export const REQ315_SCENARIOS: readonly { course: string; slug: string; screen: string }[] = [
  { course: "NCLEXRN", slug: "alcohol-withdrawal-ciwa", screen: "bedside" },
  { course: "CNA", slug: "sundowning-at-the-exit-door", screen: "bedside" },
];

const BAND_PATCH_KEYS = ["brief", "objective", "secondaryObjectives", "sources"];

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
    if (!s.url) continue;
    assert.match(s.note ?? "", /^(Read|Relayed)/, `${s.cite}: note starts with how it was read (FAIL-1981)`);
  }
}

function checkGoldens(course: string, slug: string): void {
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
}

for (const b of REQ315_BANDS) {
  test(`${b.course}/${b.slug}: a band of ${b.base}, registered and compiled`, () => {
    const e = entryOf(b.course, b.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "band");
    const raw = JSON.parse(readFileSync(e!.file, "utf8")) as { base: { course: string; slug: string }; slug: string; patch: Record<string, unknown>; append?: unknown; tighten?: unknown };
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
  test(`${b.course}/${b.slug}: sources say how they were read`, () => checkSources(b.course, b.slug));
  test(`${b.course}/${b.slug}: goldens cover Good, Mediocre and Bad and all three outcome classes`, () => checkGoldens(b.course, b.slug));
}

for (const r of REQ315_SCENARIOS) {
  test(`${r.course}/${r.slug}: registered, valid, on its screen, a running case`, () => {
    const e = entryOf(r.course, r.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "scenario");
    const parsed = scenarioSchema.safeParse(JSON.parse(readFileSync(e!.file, "utf8")));
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
    const doc = loadDocument(e!);
    assert.equal(doc.screen.type, r.screen);
    assert.deepEqual(doc.engine, { major: 1, minor: 2 });
    assert.ok(Object.values(doc.phases).some((p) => p.clock === "running"), "a running phase");
    const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
    assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
  });
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => {
    checkGoldens(r.course, r.slug);
    const e = entryOf(r.course, r.slug)!;
    const g = JSON.parse(readFileSync(e.golden!, "utf8")) as { paths: GoldenPath[] };
    const doc = loadDocument(e);
    for (const c of doc.scoring.criteria) {
      const scores = new Set(g.paths.map((p) => p.expect.criteria[c.id]));
      assert.ok(scores.has("met") && scores.has("missed"), `${c.id} met and missed`);
    }
    const reached = new Set(g.paths.map((p) => p.expect.ending));
    for (const id of Object.keys(doc.endings)) if (id !== "time_up") assert.ok(reached.has(id), `ending ${id} reached`);
  });
}

test("no REQ-315 sim text claims a review by clinicians or experts", () => {
  for (const r of [...REQ315_BANDS, ...REQ315_SCENARIOS]) {
    const e = entryOf(r.course, r.slug)!;
    assert.doesNotMatch(readFileSync(e.file, "utf8"), /\b(expert|clinician|nurse educator|subject matter)s?\b.{0,40}\b(review|approv)/i, r.slug);
  }
});

test("FAIL-2240: the REQ-239 NBCC session list is named by slug, so NCE and NCMHCE bands do not join it", () => {
  assert.deepEqual(NBCC_SESSION_DOCUMENTS.map((e) => e.slug).sort(), [
    "nce-boundary-dual-relationship",
    "nce-substance-use-screen",
    "ncmhce-intake-ptsd-alcohol",
    "ncmhce-suicide-safety-plan",
    "ncmhce-trauma-treatment-plan",
  ]);
  assert.ok(ALL_DOCUMENTS.some((e) => e.course === "NCE" && e.slug === "nce-suicide-safety-plan"), "an NCE band exists beside the list");
});
