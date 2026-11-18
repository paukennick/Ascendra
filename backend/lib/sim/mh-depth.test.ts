// REQ-337 (docs/sims.md 22.41): mental health depth of the 2026-11-17 round
// (depth-mh). Client sessions for EPPP, NCE, NCMHCE, ASWB Clinical and
// Masters and the Washington psychology jurisprudence course, on the existing
// session screen and the clinical-session profile. Documents are selected by
// slug from this file's own lists (FAIL-2002, FAIL-2520).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { scenarioSchema } from "./schema.ts";
import { certMarkProblems } from "./lint.ts";
import { courseObjectives } from "./generator/course.ts";
import { selectionFor } from "./generator/selection.ts";
import { toUsSpelling } from "../us-spelling";
import { applyCommand, createRun } from "./engine/v1/engine.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";

// Each authored case: course, slug, its unit, whether it touches suicide,
// abuse or sexual misconduct (and so is marked 18+), the golden path that must
// end in harm, and that harm ending's id.
export const REQ337_CASES: readonly { course: string; slug: string; unit: string; mature: boolean; harmPath: string; harmEnding: string; legal: boolean }[] = [
  { course: "WAPSYCHJP", slug: "wajp-client-hired-by-your-practice", unit: "Rules of Ethical Conduct and Practice Standards", mature: false, harmPath: "breach", harmEnding: "breach", legal: true },
  { course: "WAPSYCHJP", slug: "wajp-adult-disclosure-children-at-risk", unit: "Mandatory Reporting", mature: true, harmPath: "missedKids", harmEnding: "notReported", legal: true },
  { course: "WAPSYCHJP", slug: "wajp-former-psychologist-misconduct", unit: "Discipline Under the Uniform Disciplinary Act", mature: true, harmPath: "reported", harmEnding: "breach", legal: true },
  { course: "EPPP", slug: "eppp-video-session-client-out-of-state", unit: "Treatment, Intervention, Prevention, and Supervision", mature: false, harmPath: "asUsual", harmEnding: "unauthorized", legal: true },
  { course: "EPPP", slug: "eppp-driving-fear-came-back", unit: "Cognitive-Affective Bases of Behavior", mature: false, harmPath: "relax", harmEnding: "abandoned", legal: false },
  { course: "EPPP", slug: "eppp-memory-worries-after-his-wife-died", unit: "Growth and Lifespan Development", mature: false, harmPath: "dismissed", harmEnding: "dismissed", legal: false },
  { course: "EPPP", slug: "eppp-herbal-booster-on-sertraline", unit: "Biological Bases of Behavior", mature: false, harmPath: "anxiety", harmEnding: "missedMedical", legal: false },
  { course: "NCE", slug: "nce-stress-and-insomnia-after-the-shop-closed", unit: "Areas of Clinical Focus", mature: true, harmPath: "neverAsked", harmEnding: "unassessed", legal: false },
  { course: "NCE", slug: "nce-text-in-session-brother-killed", unit: "Counseling Skills and Interventions", mature: false, harmPath: "drove", harmEnding: "unsafe", legal: false },
  { course: "NCE", slug: "nce-eight-weeks-flat-scores", unit: "Treatment Planning", mature: false, harmPath: "stalled", harmEnding: "stalled", legal: false },
  { course: "NCMHCE", slug: "ncmhce-panic-cbt-session-five", unit: "Counseling Skills and Interventions", mature: false, harmPath: "relaxed", harmEnding: "avoided", legal: false },
  { course: "ASWBCLINICAL", slug: "aswbc-walk-in-after-the-fire", unit: "Intervention and Practice", mature: true, harmPath: "listed", harmEnding: "noPlan", legal: false },
  { course: "ASWBCLINICAL", slug: "aswbc-refusing-admission-for-his-dog", unit: "Values and Ethics", mature: true, harmPath: "hold", harmEnding: "overridden", legal: true },
  { course: "ASWBMASTERS", slug: "aswbm-fifteen-asks-without-her-parents", unit: "Assessment and Planning", mature: false, harmPath: "signature", harmEnding: "turnedAway", legal: true },
  { course: "ASWBCLINICAL", slug: "aswbc-subpoena-in-a-custody-fight", unit: "Values and Ethics", mature: false, harmPath: "sent", harmEnding: "breach", legal: true },
];

// Bands (docs/sims.md 4.7): the same case on another course's objective. The
// ASWB bands also patch the brief, to give the learner that license's title.
export const REQ337_BANDS: readonly { course: string; slug: string; base: string; unit: string }[] = [
  { course: "EPPP", slug: "eppp-client-hired-by-your-practice", base: "WAPSYCHJP/wajp-client-hired-by-your-practice", unit: "Ethical, Legal, and Professional Issues" },
  { course: "EPPP", slug: "eppp-adult-disclosure-children-at-risk", base: "WAPSYCHJP/wajp-adult-disclosure-children-at-risk", unit: "Ethical, Legal, and Professional Issues" },
  { course: "NCMHCE", slug: "ncmhce-stress-and-insomnia-after-the-shop-closed", base: "NCE/nce-stress-and-insomnia-after-the-shop-closed", unit: "Areas of Clinical Focus" },
  { course: "ASWBMASTERS", slug: "aswbm-walk-in-after-the-fire", base: "ASWBCLINICAL/aswbc-walk-in-after-the-fire", unit: "Intervention and Practice" },
  { course: "ASWBMASTERS", slug: "aswbm-refusing-admission-for-his-dog", base: "ASWBCLINICAL/aswbc-refusing-admission-for-his-dog", unit: "Values and Ethics" },
  { course: "ASWBCLINICAL", slug: "aswbc-fifteen-asks-without-her-parents", base: "ASWBMASTERS/aswbm-fifteen-asks-without-her-parents", unit: "Assessment and Planning" },
  { course: "ASWBMASTERS", slug: "aswbm-subpoena-in-a-custody-fight", base: "ASWBCLINICAL/aswbc-subpoena-in-a-custody-fight", unit: "Values and Ethics" },
];

// Main objectives the keyword screen misses but that meet the rule on their
// substance (docs/sims.md 22.41, decisions for Nick): a person may overrule
// the screen (selection.ts).
export const SCREEN_OVERRIDES: Readonly<Record<string, string>> = {
  "Report suspected child abuse or neglect as a mandated reporter, on time and to the right agency":
    "time (48 hours), cues (reasonable cause), choices (report or not) and priorities (duty versus confidentiality); the screen has no word for 'report' or 'abuse'",
  "Distinguish normal cognitive aging from mild neurocognitive disorder and dementia":
    "cues (what is typical and what is not) and choices (workup before diagnosis); the screen has no word for 'distinguish'",
};

const BAND_PATCH_KEYS = ["objective", "secondaryObjectives", "sources", "brief"];
const REVIEW_CLAIM = /\b(expert|clinician|psychologist|counselor|social worker|subject matter)s?\b.{0,40}\b(review|approv|vett)/i;

// The REQ-329 pattern-level word list (lib/sim/sensitive-sims.test.ts), copied
// rather than imported so importing it does not register that file's tests.
const METHOD_WORDS =
  /\b(guns?|firearms?|rifles?|pistols?|shoot\w*|bullets?|ammunition|weapons?|knife|knives|blades?|razors?|pills?|tablets?|overdos\w*|stockpil\w*|poison\w*|hang\w*|nooses?|ropes?|cords?|ligatures?|belts?|jump\w*|bridges?|rooftops?|ledges?|drown\w*|suffocat\w*|strangl\w*|carbon monoxide|exhaust|trains?|cutting|wrists?|lethal dose|fatal dose|toxic dose)\b/i;
const LETHALITY = /\blethal(ity)?\b(?! means)/i;

function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out));
  else if (x && typeof x === "object") for (const v of Object.values(x)) strings(v, out);
  return out;
}

function patternLevelProblems(doc: ScenarioDoc): string[] {
  const out: string[] = [];
  for (const s of strings(JSON.parse(learnerText(doc)) as unknown)) {
    const m = s.match(METHOD_WORDS) ?? s.match(LETHALITY);
    if (m) out.push(`"${m[0]}" in: ${s.slice(0, 120)}`);
  }
  return out;
}

const entryOf = (course: string, slug: string) => ALL_DOCUMENTS.find((e) => e.course === course && e.slug === slug);

function learnerText(doc: ScenarioDoc): string {
  return JSON.stringify({ ...doc, objective: "", secondaryObjectives: [], sources: [], slug: "" }, (k, v) => (k === "source" ? undefined : v));
}

function checkObjectives(course: string, slug: string, unit: string): void {
  const doc = loadDocument(entryOf(course, slug)!);
  const objectives = courseObjectives(course);
  const ctx = objectives.find((o) => toUsSpelling(o.objective) === toUsSpelling(doc.objective));
  assert.ok(ctx, `objective in the ${course} catalog: ${doc.objective}`);
  assert.equal(ctx!.unitTitle, unit, "the main objective is in the unit this case covers");
  assert.ok(selectionFor(ctx!).qualifies || SCREEN_OVERRIDES[doc.objective], `"${doc.objective}" passes the selection screen or is a recorded override`);
  const titles = new Set(objectives.map((o) => toUsSpelling(o.objective)));
  for (const s of doc.secondaryObjectives ?? []) assert.ok(titles.has(toUsSpelling(s)), `secondary objective in the ${course} catalog: ${s}`);
  assert.ok(!(doc.secondaryObjectives ?? []).includes(doc.objective), "the main objective is not also secondary");
}

function checkSources(course: string, slug: string, legal: boolean): void {
  const doc = loadDocument(entryOf(course, slug)!);
  for (const s of doc.sources) {
    assert.match(s.checkedAt ?? "", /^\d{4}-\d{2}-\d{2}$/, `${s.cite}: dated`);
    if (s.url) assert.match(s.note ?? "", /^(Read|Relayed)/, `${s.cite}: note starts with how it was read (FAIL-1981)`);
  }
  const cites = doc.sources.map((s) => s.cite).join(" | ");
  assert.match(cites, /APA, Ethical Principles|APA Ethics Code|ACA Code of Ethics|NASW Code of Ethics/, "cites the profession's code of ethics");
  if (legal) assert.match(cites, /\b(RCW|WAC|CFR) \d/, "a legal case cites the statute or regulation itself");
}

function checkLearnerText(course: string, slug: string, mature: boolean): void {
  const e = entryOf(course, slug)!;
  const doc = loadDocument(e);
  assert.deepEqual(certMarkProblems(doc), [], "no permission-only body's mark (REQ-309)");
  const visible = learnerText(doc);
  assert.equal(toUsSpelling(visible), visible, "US spelling");
  assert.doesNotMatch(readFileSync(e.file, "utf8"), REVIEW_CLAIM, "no claim of a review by clinicians or experts");
  assert.doesNotMatch(visible, /\b\d+(\.\d+)?\s?(mg|mcg|microgram|units?\/kg|mg\/kg|mL\/kg)\b/i, "no dose in learner text");
  if (mature) assert.deepEqual(patternLevelProblems(doc), [], "no method, means or lethality detail in an 18+ sim");
}

const goldenOf = (course: string, slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(course, slug)!.golden!, "utf8")) as GoldenFile;

function checkGoldens(course: string, slug: string, everyEnding: boolean): void {
  const g = goldenOf(course, slug);
  const ratings = new Set(g.paths.map((p) => p.expect.rating));
  for (const want of ["good", "mediocre", "bad"]) assert.ok(ratings.has(want as never), `a ${want} path`);
  const doc = loadDocument(entryOf(course, slug)!);
  const reached = new Set(g.paths.map((p) => p.expect.ending));
  const conditional = Object.entries(doc.endings).filter(([, x]) => x.when).map(([id]) => id);
  assert.deepEqual([...(doc.endingOrder ?? [])].sort(), [...conditional].sort(), "endingOrder lists every conditional ending");
  for (const c of ["target", "recovered", "harm"]) assert.ok(Object.entries(doc.endings).some(([id, x]) => reached.has(id) && x.class === c), `a golden path reaches a ${c} ending`);
  if (!everyEnding) return;
  for (const id of Object.keys(doc.endings)) if (id !== "time_up") assert.ok(reached.has(id), `ending ${id} reached`);
  for (const c of doc.scoring.criteria) {
    const scores = new Set(g.paths.map((p) => (p.expect.criteria as Record<string, string>)[c.id]));
    assert.ok(scores.has("met") && scores.has("missed"), `${c.id} met and missed`);
  }
}

// Ends the session at once and documents the first option of every field of
// the note (the right answer on paper): with nothing done in the session the
// run must not reach the target ending.
function documentOnly(doc: ScenarioDoc): string | null {
  const run = createRun(doc, 1);
  let seq = 0;
  const send = (c: Record<string, unknown>): void => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  if (run.state.openPrompt) send({ type: "choose", prompt: run.state.openPrompt, choice: doc.prompts![run.state.openPrompt].choices[0].id });
  send({ type: "act", action: "endSession" });
  if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true });
  const form = doc.actions.document.params![0] as { fields: { id: string; options: { value: string }[] }[] };
  send({ type: "act", action: "document", params: Object.fromEntries(form.fields.map((f) => [f.id, f.options[0].value])) });
  return run.state.ended?.ending ?? null;
}

for (const r of REQ337_CASES) {
  test(`${r.course}/${r.slug}: registered, valid, a session case on engine 1.2${r.mature ? ", marked 18+" : ""}`, () => {
    const e = entryOf(r.course, r.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "scenario");
    const parsed = scenarioSchema.safeParse(JSON.parse(readFileSync(e!.file, "utf8")));
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
    const doc = loadDocument(e!);
    assert.equal(doc.mature === true, r.mature, r.mature ? "mature: true (REQ-327)" : "not marked: no suicide, abuse or self-harm content");
    assert.equal(doc.screen.type, "session");
    assert.equal(doc.outcome.profile, "clinical-session");
    assert.deepEqual(doc.engine, { major: 1, minor: 2 });
    assert.ok(doc.scoring.criteria.filter((c) => c.critical).length >= 3, "at least three critical criteria");
    assert.equal(doc.endings.walkout?.class, "harm", "a walk-out is harm");
    assert.equal(Object.keys(doc.prompts ?? {}).length, 1, "one unscored prediction card (22.5 finding 3)");
    assert.equal(Object.keys(doc.reasoning ?? {}).length, 1, "one written-reasoning moment");
  });
  test(`${r.course}/${r.slug}: objective in its unit, secondary objectives the course's own`, () => checkObjectives(r.course, r.slug, r.unit));
  test(`${r.course}/${r.slug}: sources are dated, say how they were read, and cite the code${r.legal ? " and the law" : ""}`, () => checkSources(r.course, r.slug, r.legal));
  test(`${r.course}/${r.slug}: learner text: no mark, US spelling, no review claim, no dose${r.mature ? ", pattern level" : ""}`, () => checkLearnerText(r.course, r.slug, r.mature));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
  test(`${r.course}/${r.slug}: behavior: the expert path reaches the target, ${r.harmPath} is harm, a rupture is a walk-out, paperwork alone is not enough`, () => {
    const doc = loadDocument(entryOf(r.course, r.slug)!);
    const g = goldenOf(r.course, r.slug);
    const target = Object.entries(doc.endings).find(([, x]) => x.class === "target")![0];
    for (const [id, ending] of Object.entries({ expert: target, [r.harmPath]: r.harmEnding, walkout: "walkout" })) {
      const p = g.paths.find((x) => x.id === id);
      assert.ok(p, `golden path ${id}`);
      const res = replayGoldenPath(doc, p!);
      assert.equal(res.error, null, `${id} replays`);
      assert.equal(res.debrief.ending, ending, `${id} ends ${ending}`);
    }
    assert.notEqual(documentOnly(doc), target, "documenting the right answers without the session's work does not reach the target");
  });
}

for (const b of REQ337_BANDS) {
  test(`${b.course}/${b.slug}: a band of ${b.base}, registered and compiled, scoring and endings the base's`, () => {
    const e = entryOf(b.course, b.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "band");
    const raw = JSON.parse(readFileSync(e!.file, "utf8")) as { base: { course: string; slug: string }; patch: Record<string, unknown> };
    assert.equal(`${raw.base.course}/${raw.base.slug}`, b.base);
    assert.notEqual(raw.base.course, b.course, "a band registers another course's case");
    for (const k of Object.keys(raw.patch)) assert.ok(BAND_PATCH_KEYS.includes(k), `patch changes only ${BAND_PATCH_KEYS.join(", ")}: ${k}`);
    const doc = loadDocument(e!);
    const [bc, bs] = b.base.split("/");
    const base = loadDocument(entryOf(bc, bs)!);
    assert.equal(doc.mature, base.mature, "the 18+ mark comes from the base");
    assert.deepEqual(doc.scoring, base.scoring, "scoring is the base's");
    assert.deepEqual(doc.endings, base.endings, "endings are the base's");
  });
  test(`${b.course}/${b.slug}: objective in its unit, secondary objectives the course's own`, () => checkObjectives(b.course, b.slug, b.unit));
  test(`${b.course}/${b.slug}: learner text: no mark, US spelling, no review claim`, () => {
    const base = REQ337_CASES.find((c) => `${c.course}/${c.slug}` === b.base)!;
    checkLearnerText(b.course, b.slug, base.mature);
  });
  test(`${b.course}/${b.slug}: goldens cover Good, Mediocre and Bad and all three outcome classes`, () => checkGoldens(b.course, b.slug, false));
}

test("REQ-337: every course in scope meets the round's target (4 sims under 60 objectives, 8 at 60 or more)", () => {
  const target = (code: string) => (courseObjectives(code).length >= 60 ? 8 : 4);
  for (const code of ["WAPSYCHJP", "EPPP", "NCE", "NCMHCE", "ASWBCLINICAL", "ASWBMASTERS"]) {
    const n = ALL_DOCUMENTS.filter((e) => e.course === code).length;
    assert.ok(n >= target(code), `${code}: ${n} sims, target ${target(code)}`);
  }
});

test("REQ-337: the case list matches the registry block", () => {
  const src = readFileSync(new URL("./documents.ts", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("// ---- REQ-337"), src.indexOf("// ---- end REQ-337 ----"));
  const registered = [...block.matchAll(/(entry|band)\("([A-Z0-9_]+)", "([a-z0-9-]+)"\)/g)].map((m) => `${m[2]}/${m[3]}`).sort();
  const listed = [...REQ337_CASES, ...REQ337_BANDS].map((r) => `${r.course}/${r.slug}`).sort();
  assert.deepEqual(registered, listed);
});
