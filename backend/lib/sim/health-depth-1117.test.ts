// REQ-334 (docs/sims.md 22.38): health depth of the round of 2026-11-17
// (evening). Nursing licensure (ADN-RN, BSN-RN, LPN/VN), CCRN Neonatal and
// Pediatric, and the ten physical therapy specialty courses brought to the
// "robust" target: at least 8 sims for courses with 60 or more objectives,
// at least 4 for the rest, purpose-written cases for each course's top
// domains, and bands only where the setting and scope match. Documents are
// selected by slug from this file's own lists (FAIL-2002). Bands change only
// objective, secondary objectives, sources and brief, so the base's
// thresholds, scoring and endings (and its `mature` flag) carry over.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { scenarioSchema } from "./schema.ts";
import { certMarkProblems } from "./lint.ts";
import { courseObjectives } from "./generator/course.ts";
import { selectionFor } from "./generator/selection.ts";
import { toUsSpelling } from "../us-spelling";

export const REQ334_BANDS: readonly { course: string; slug: string; base: string }[] = [
  { course: "ADNRN", slug: "postop-fever-150-graves-meds-stopped-adn", base: "NCLEXRN/postop-fever-150-graves-meds-stopped" },
  { course: "ADNRN", slug: "oxytocin-tachysystole-late-decels-adn", base: "NCLEXRN/oxytocin-tachysystole-late-decels" },
  { course: "ADNRN", slug: "postpartum-hemorrhage-atony-adn", base: "NCLEXRN/postpartum-hemorrhage-atony" },
  { course: "ADNRN", slug: "alcohol-withdrawal-ciwa-adn", base: "NCLEXRN/alcohol-withdrawal-ciwa" },
  { course: "ADNRN", slug: "after-amputation-im-done-adn", base: "NCLEXRN/after-amputation-im-done" },
  { course: "ADNRN", slug: "eleven-pills-three-falls-sleep-aid-adn", base: "BSNRN/eleven-pills-three-falls-sleep-aid" },
  { course: "LPNVN", slug: "warfarin-inr-high-tarry-stool-lpn", base: "NCLEXPN/warfarin-inr-high-tarry-stool" },
  { course: "LPNVN", slug: "head-strike-on-apixaban-lpn", base: "NCLEXPN/head-strike-on-apixaban" },
  { course: "LPNVN", slug: "clinic-belly-pain-moved-right-lpn", base: "NCLEXPN/clinic-belly-pain-moved-right" },
  { course: "LPNVN", slug: "aide-feeding-thin-liquids-dysphagia-lpn", base: "NCLEXPN/aide-feeding-thin-liquids-dysphagia" },
  { course: "LPNVN", slug: "postpartum-check-boggy-fundus-lpn", base: "NCLEXPN/postpartum-check-boggy-fundus" },
  { course: "LPNVN", slug: "rehab-resident-no-use-to-anyone-lpn", base: "NCLEXPN/rehab-resident-no-use-to-anyone" },
  { course: "BSNRN", slug: "med-surg-deterioration-sbar-bsn", base: "NCLEXRN/med-surg-deterioration-sbar" },
  { course: "BSNRN", slug: "insulin-given-to-wrong-bed-bsn", base: "NCLEXRN/insulin-given-to-wrong-bed" },
  { course: "BSNRN", slug: "preop-consent-after-opioid-bsn", base: "NCLEXRN/preop-consent-after-opioid" },
  { course: "ABPTSGCS", slug: "parkinson-freezing-session-geri", base: "DPT/parkinson-freezing-session" },
];

// New bedside cases (clinical profile).
export const REQ334_BEDSIDE: readonly { course: string; slug: string }[] = [
  { course: "CCRNNEO", slug: "green-vomit-day-three" },
  { course: "CCRNNEO", slug: "yellow-at-twenty-hours" },
  { course: "CCRNNEO", slug: "floppy-after-cord-prolapse" },
  { course: "CCRNNEO", slug: "cpap-baby-sudden-desaturation" },
  { course: "CCRNNEO", slug: "sweaty-feeds-liver-edge-down" },
  { course: "CCRNNEO", slug: "lip-smacking-and-a-pause" },
  { course: "CCRNPEDS", slug: "sickle-cell-belly-big-and-pale" },
  { course: "CCRNPEDS", slug: "red-cells-then-crackles" },
  { course: "CCRNPEDS", slug: "wheeze-gone-quiet-and-sleepy" },
  { course: "CCRNPEDS", slug: "bike-crash-icp-climbing" },
  { course: "CCRNPEDS", slug: "shunt-baby-vomiting-sats-falling" },
  { course: "CCRNPEDS", slug: "toddler-woke-after-naloxone-now-sleepy" },
  { course: "ADNRN", slug: "two-weeks-thirsty-glucose-890" },
  { course: "ADNRN", slug: "pain-better-then-belly-rigid" },
  { course: "LPNVN", slug: "iv-arm-cool-and-swollen" },
  { course: "LPNVN", slug: "breakfast-tray-droop-last-seen-well" },
  { course: "BSNRN", slug: "hip-repair-moaning-scale-says-zero" },
  { course: "BSNRN", slug: "insulin-pen-teaching-before-noon" },
  { course: "BSNRN", slug: "eleven-pills-three-falls-sleep-aid" },
];

// New treatment-session cases (physical-therapy profile).
export const REQ334_TREATMENT: readonly { course: string; slug: string }[] = [
  { course: "ABPTSCCS", slug: "walk-test-saturation-eighty-three" },
  { course: "ABPTSCCS", slug: "walk-test-booked-two-weeks-after-mi" },
  { course: "ABPTSCCS", slug: "cardiac-rehab-weight-up-orthopnea" },
  { course: "ABPTSECS", slug: "emg-referral-platelets-thirty-one" },
  { course: "ABPTSECS", slug: "proximal-weakness-on-statin-cola-urine" },
  { course: "ABPTSECS", slug: "ulnar-referral-droopy-eyelid-low-snap" },
  { course: "ABPTSGCS", slug: "dizzy-on-standing-new-tamsulosin" },
  { course: "ABPTSGCS", slug: "home-visit-quiet-and-sleepy-today" },
  { course: "ABPTSGCS", slug: "bruises-in-stages-son-wont-leave" },
  { course: "ABPTSNCS", slug: "tilt-table-pounding-headache-t4" },
  { course: "ABPTSNCS", slug: "gait-session-worst-headache-ever" },
  { course: "ABPTSOCS", slug: "neck-pain-headache-after-adjustment" },
  { course: "ABPTSOCS", slug: "rolled-ankle-cant-take-four-steps" },
  { course: "ABPTSONC", slug: "chemo-day-nine-shivery-at-rehab" },
  { course: "ABPTSONC", slug: "jaw-wont-open-new-neck-lump" },
  { course: "ABPTSONC", slug: "thigh-pain-walking-breast-cancer-history" },
  { course: "ABPTSPCS", slug: "nicu-range-of-motion-sats-dropping" },
  { course: "ABPTSPCS", slug: "torticollis-visit-hip-clunk" },
  { course: "ABPTSPCS", slug: "six-year-old-limp-after-soccer" },
  { course: "ABPTSPWCS", slug: "postpartum-gap-and-a-hard-bulge" },
  { course: "ABPTSPWCS", slug: "urgency-numb-legs-blurred-eye" },
  { course: "ABPTSPWCS", slug: "second-trimester-dizzy-on-her-back" },
  { course: "ABPTSSCS", slug: "lacrosse-ball-to-chest-collapse" },
  { course: "ABPTSSCS", slug: "header-collision-wants-back-in" },
  { course: "ABPTSSCS", slug: "runner-groin-pain-hop-test" },
  { course: "ABPTSWMS", slug: "braden-eleven-purple-heel" },
  { course: "ABPTSWMS", slug: "two-wounds-one-dressing-choice" },
  { course: "ABPTSWMS", slug: "walking-program-plantar-ulcer" },
  // Unit coverage (every unit with a fitting objective):
  { course: "ABPTSGCS", slug: "quiet-not-lazy-day-three-hip-fracture" },
  { course: "ABPTSGCS", slug: "stronger-legs-same-fall-risk" },
  { course: "ABPTSSCS", slug: "second-stress-fracture-no-period" },
  { course: "ABPTSECS", slug: "too-early-to-test-day-four-weakness" },
  { course: "ABPTSPCS", slug: "he-used-to-say-ball" },
  { course: "ABPTSNCS", slug: "treadmill-ordered-freezing-in-doorways" },
  { course: "ABPTSOCS", slug: "two-buses-and-a-copay-after-tka" },
  { course: "ABPTSCCS", slug: "eighteen-meters-better-letter" },
  { course: "ABPTSCCS", slug: "she-pulls-him-up-by-the-arms" },
  { course: "ABPTSONC", slug: "twenty-percent-smaller-by-a-different-tape" },
];

// Professional-ethics conversations (session screen, level 2) for the nursing
// professional units; screens are not profession-locked (lead decision, round 1117b).
export const REQ334_SESSION: readonly { course: string; slug: string }[] = [
  { course: "BSNRN", slug: "coworker-asks-for-your-login-famous-patient" },
  { course: "BSNRN", slug: "handover-argument-skip-the-pump-check" },
  { course: "BSNRN", slug: "quality-project-really-a-study" },
  { course: "CCRNNEO", slug: "consent-through-the-twelve-year-old" },
  { course: "CCRNPEDS", slug: "bed-manager-wants-unstable-child-moved" },
];

// Sensitive topics behind the per-sim 18+ gate (REQ-327).
const MATURE = new Set(["after-amputation-im-done-adn", "rehab-resident-no-use-to-anyone-lpn", "bruises-in-stages-son-wont-leave", "second-stress-fracture-no-period"]);

// The robust target (round-1117b.md): 8 sims for 60 or more objectives, 4 otherwise.
const TARGET: Readonly<Record<string, number>> = {
  ADNRN: 8, BSNRN: 8, LPNVN: 8, CCRNNEO: 8, CCRNPEDS: 8,
  ABPTSCCS: 4, ABPTSECS: 4, ABPTSGCS: 4, ABPTSONC: 4, ABPTSPCS: 4, ABPTSPWCS: 4, ABPTSSCS: 4, ABPTSWMS: 4, ABPTSNCS: 4, ABPTSOCS: 4,
};

const BAND_PATCH_KEYS = ["brief", "objective", "secondaryObjectives", "sources"];
// The specialist letters and the certifying body's marks (REQ-309/319).
const SPECIALTY_MARKS = /\b(ABPTS|APTA|OCS|NCS|CCS|PCS|SCS|ECS|PWCS|WMS)\b/;
// A dose is a number followed by a dosing unit; none may appear in learner
// text. Lab values in mg/dL and feed or fluid volumes in mL are not doses.
const DOSE = /\b\d+(\.\d+)?\s?(mg(?!\/dL)|mcg|micrograms?|units?|g\/kg|mEq\/kg|mL\/kg(?!\/(h|day)))\b/i;

interface GoldenPath { id: string; expect: { ending: string; rating: string; criteria: Record<string, string> } }

const entryOf = (course: string, slug: string) => ALL_DOCUMENTS.find((e) => e.course === course && e.slug === slug);
const jsonbOrder = (a: string, b: string): number => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
const visibleText = (course: string, slug: string): string => {
  const doc = loadDocument(entryOf(course, slug)!);
  return JSON.stringify({ ...doc, objective: "", secondaryObjectives: [], sources: [], slug: "", params: {} }, (k, v) => (k === "source" ? undefined : v));
};

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

function checkLearnerText(course: string, slug: string, newCase: boolean): void {
  const e = entryOf(course, slug)!;
  const doc = loadDocument(e);
  assert.deepEqual(certMarkProblems(doc), [], "no permission-only body's mark (REQ-309)");
  const visible = visibleText(course, slug);
  assert.doesNotMatch(visible, SPECIALTY_MARKS, "no specialist letters or the board's marks in sim text");
  if (newCase) assert.doesNotMatch(visible, DOSE, "drugs appear as 'the ordered' drug, with no dose");
  assert.doesNotMatch(readFileSync(e.file, "utf8"), /\b(expert|clinician|nurse educator|subject matter)s?\b.{0,40}\b(review|approv)/i, "no claim of a review by clinicians or experts");
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

function checkCase(course: string, slug: string, screen: string, profile: string): void {
  const e = entryOf(course, slug);
  assert.ok(e, "registered in ALL_DOCUMENTS");
  assert.equal(e!.kind, "scenario");
  const parsed = scenarioSchema.safeParse(JSON.parse(readFileSync(e!.file, "utf8")));
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
  const doc = loadDocument(e!);
  assert.equal(doc.screen.type, screen);
  assert.equal(doc.outcome.profile, profile);
  assert.deepEqual(doc.engine, { major: 1, minor: 2 });
  const session = screen === "session";
  if (!session) assert.ok(Object.values(doc.phases).some((p) => p.clock === "running"), "a running phase");
  const keys = Object.keys((doc as unknown as { teaching?: Record<string, unknown> }).teaching ?? {});
  // The session template teaches through its conversation and debrief, not timed prompts.
  if (!session) assert.ok(keys.length >= 2, "two sourced teaching prompts");
  assert.deepEqual(keys, [...keys].sort(jsonbOrder), "teaching keys in jsonb order (FAIL-1362)");
  const critical = doc.scoring.criteria.filter((c) => c.critical);
  assert.ok(critical.length >= 3 && critical.length <= 4, "three or four critical criteria");
  assert.ok(Object.values(doc.endings).some((x) => x.class === "harm" && x.when), "a conditional harm ending");
  assert.equal(doc.mature === true, MATURE.has(slug), MATURE.has(slug) ? "marked mature (REQ-327)" : "not marked mature");
}

for (const b of REQ334_BANDS) {
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
    assert.equal(doc.mature === true, base.mature === true, "the band keeps the base's 18+ flag");
    assert.equal(doc.mature === true, MATURE.has(b.slug), "18+ exactly where the topic is sensitive");
  });
  test(`${b.course}/${b.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(b.course, b.slug));
  test(`${b.course}/${b.slug}: sources are dated and say how they were read`, () => checkSources(b.course, b.slug));
  test(`${b.course}/${b.slug}: learner text names no permission-only mark`, () => checkLearnerText(b.course, b.slug, false));
  test(`${b.course}/${b.slug}: goldens cover Good, Mediocre and Bad and all three outcome classes`, () => checkGoldens(b.course, b.slug, false));
}

for (const r of REQ334_BEDSIDE) {
  test(`${r.course}/${r.slug}: registered, valid, a running bedside case on engine 1.2`, () => checkCase(r.course, r.slug, "bedside", "clinical"));
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text names no permission-only mark, no specialist letters, no dose, no review claim`, () => checkLearnerText(r.course, r.slug, true));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
}

for (const r of REQ334_TREATMENT) {
  test(`${r.course}/${r.slug}: registered, valid, a running treatment session on engine 1.2`, () => checkCase(r.course, r.slug, "treatment-session", "physical-therapy"));
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text names no permission-only mark, no specialist letters, no dose, no review claim`, () => checkLearnerText(r.course, r.slug, true));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
}

for (const r of REQ334_SESSION) {
  test(`${r.course}/${r.slug}: registered, valid, a level 2 professional-ethics conversation on engine 1.2`, () => {
    checkCase(r.course, r.slug, "session", "professional-ethics");
    assert.equal((loadDocument(entryOf(r.course, r.slug)!).screen as { level?: number }).level, 2);
  });
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated and say how they were read`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text names no permission-only mark, no specialist letters, no dose, no review claim`, () => checkLearnerText(r.course, r.slug, true));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
}

test("the robust target: every course in scope has at least its target count of sims", () => {
  for (const [course, n] of Object.entries(TARGET)) {
    const count = ALL_DOCUMENTS.filter((e) => e.course === course).length;
    assert.ok(count >= n, `${course}: ${count} sims, target ${n}`);
  }
});

test("a band never crosses setting: nursing bands come from nursing cases of the same license level", () => {
  const level: Record<string, string> = { ADNRN: "RN", BSNRN: "RN", NCLEXRN: "RN", LPNVN: "PN", NCLEXPN: "PN", ABPTSGCS: "PT", DPT: "PT" };
  for (const b of REQ334_BANDS) assert.equal(level[b.base.split("/")[0]], level[b.course], `${b.course}/${b.slug} from ${b.base}`);
});
