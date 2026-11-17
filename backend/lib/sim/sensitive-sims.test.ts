// REQ-329 (docs/sims.md 22.36): sims on sensitive objectives (suicide and
// homicide risk, behavioral emergencies) that were held back until the
// per-sim 18+ gate existed (REQ-327). Every case is on the session screen
// (clinical-session profile) and marked `mature: true`, whatever its course.
// Content stays at the pattern level: a validated screening tool, direct
// questions about ideation, plan and intent, means safety without naming any
// means, observation, safety planning, handoff and escalation. Documents are
// selected by slug from this file's own lists (FAIL-2002).
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

// Each case: its course, slug, and the golden path ids that reach the
// target, the harm-by-omission and the walk-out endings.
export const REQ329_CASES: readonly { course: string; slug: string; harmPath: string }[] = [
  { course: "CEN", slug: "ed-screen-positive-wants-to-go-home", harmPath: "neverScreened" },
  { course: "CEN", slug: "ed-threat-against-former-supervisor", harmPath: "secretAndSent" },
  { course: "PCCN", slug: "new-heart-failure-better-off-without-me", harmPath: "leftForDay" },
  { course: "FNPAANP", slug: "clinic-depression-follow-up-item-nine", harmPath: "listOnly" },
  { course: "FNPANCC", slug: "clinic-widower-thoughts-right-now", harmPath: "nextWeek" },
  { course: "CCRNADULT", slug: "sah-day-six-not-herself-on-levetiracetam", harmPath: "writtenOff" },
  { course: "CCRNADULT", slug: "icu-threatens-staff-pulls-cannula", harmPath: "restrainedFirst" },
];

export const REQ329_BANDS: readonly { course: string; slug: string; base: string }[] = [
  { course: "FNPANCC", slug: "clinic-depression-follow-up-item-nine-fnp-role", base: "FNPAANP/clinic-depression-follow-up-item-nine" },
  { course: "FNPAANP", slug: "clinic-widower-thoughts-right-now-fnp-clinical", base: "FNPANCC/clinic-widower-thoughts-right-now" },
];

const BAND_PATCH_KEYS = ["objective", "secondaryObjectives", "sources"];
// Specialist letters and the boards' marks (REQ-309/319), as in health-sims-4.
const MARKS = /\b(BCEN|CEN|PCCN|CMSRN|MSNCB|AACN|ANCC|AANPCB|FNP-BC|CCRN|NCSBN|NCLEX|ASQ)\b/;
// Pattern level only (Nick's content rules for REQ-329): no method, no named
// means and no lethality information anywhere a learner reads. "Lethal means
// counseling" names the intervention, so that phrase alone is allowed.
const METHOD_WORDS =
  /\b(guns?|firearms?|rifles?|pistols?|shoot\w*|bullets?|ammunition|weapons?|knife|knives|blades?|razors?|pills?|tablets?|overdos\w*|stockpil\w*|poison\w*|hang\w*|nooses?|ropes?|cords?|ligatures?|belts?|jump\w*|bridges?|rooftops?|ledges?|drown\w*|suffocat\w*|strangl\w*|carbon monoxide|exhaust|trains?|cutting|wrists?|lethal dose|fatal dose|toxic dose)\b/i;
const LETHALITY = /\blethal(ity)?\b(?! means)/i;

const entryOf = (course: string, slug: string) => ALL_DOCUMENTS.find((e) => e.course === course && e.slug === slug);

// Everything a learner can see: the document less its catalog objective
// titles, its citations and its slug.
function learnerText(doc: ScenarioDoc): string {
  return JSON.stringify({ ...doc, objective: "", secondaryObjectives: [], sources: [], slug: "" }, (k, v) => (k === "source" ? undefined : v));
}

function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out));
  else if (x && typeof x === "object") for (const v of Object.values(x)) strings(v, out);
  return out;
}

export function patternLevelProblems(doc: ScenarioDoc): string[] {
  const visible = JSON.parse(learnerText(doc)) as unknown;
  const out: string[] = [];
  for (const s of strings(visible)) {
    const m = s.match(METHOD_WORDS) ?? s.match(LETHALITY);
    if (m) out.push(`"${m[0]}" in: ${s.slice(0, 120)}`);
  }
  return out;
}

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
  const doc = loadDocument(entryOf(course, slug)!);
  for (const s of doc.sources) {
    assert.match(s.checkedAt ?? "", /^\d{4}-\d{2}-\d{2}$/, `${s.cite}: dated`);
    if (s.url) assert.match(s.note ?? "", /^(Read|Relayed)/, `${s.cite}: note starts with how it was read (FAIL-1981)`);
  }
  const cites = doc.sources.map((s) => s.cite).join(" | ");
  assert.match(cites, /Ask Suicide-Screening Questions|Columbia|Broset|de-escalation/i, "names a validated tool or consensus method with its source");
}

function checkLearnerText(course: string, slug: string): void {
  const e = entryOf(course, slug)!;
  const doc = loadDocument(e);
  assert.deepEqual(certMarkProblems(doc), [], "no permission-only body's mark (REQ-309)");
  const visible = learnerText(doc);
  assert.doesNotMatch(visible, MARKS, "no specialist letters, the boards' marks or the screening tool's acronym in sim text");
  assert.doesNotMatch(readFileSync(e.file, "utf8"), /\b(expert|clinician|nurse educator|subject matter)s?\b.{0,40}\b(review|approv)/i, "no claim of a review by clinicians or experts");
  assert.doesNotMatch(visible, /\b\d+(\.\d+)?\s?(mg|mcg|microgram|units?\/kg|mg\/kg|mL\/kg|g)\b(?!\/d?L)/i, "no dose in learner text");
  assert.deepEqual(patternLevelProblems(doc), [], "no method, means or lethality detail in learner text");
}

function goldenOf(course: string, slug: string): GoldenFile {
  return JSON.parse(readFileSync(entryOf(course, slug)!.golden!, "utf8")) as GoldenFile;
}

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

// Ends the conversation at once and documents the target disposition without
// screening: a run like that must never be safe.
function documentWithoutScreening(doc: ScenarioDoc): string | null {
  const run = createRun(doc, 1);
  let seq = 0;
  const send = (c: Record<string, unknown>): void => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  send({ type: "act", action: "endSession" });
  if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true });
  const form = doc.actions.document.params![0] as { fields: { id: string; options: { value: string }[] }[] };
  const safe = Object.entries(doc.endings).find(([, x]) => x.class === "target")![1].when!;
  const dispo = form.fields[1].options.map((o) => o.value).find((v) => safe.includes(`dispo == "${v}"`))!;
  const risk = form.fields[0].options.map((o) => o.value).find((v) => safe.includes(`riskDoc == "${v}"`))!;
  send({ type: "act", action: "document", params: { risk, disposition: dispo } });
  return run.state.ended?.ending ?? null;
}

for (const r of REQ329_CASES) {
  test(`${r.course}/${r.slug}: registered, valid, a session case on engine 1.2, marked 18+`, () => {
    const e = entryOf(r.course, r.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "scenario");
    const parsed = scenarioSchema.safeParse(JSON.parse(readFileSync(e!.file, "utf8")));
    assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)));
    const doc = loadDocument(e!);
    assert.equal(doc.mature, true, "mature: true (REQ-327)");
    assert.equal(doc.screen.type, "session");
    assert.equal(doc.outcome.profile, "clinical-session");
    assert.deepEqual(doc.engine, { major: 1, minor: 2 });
    assert.equal(doc.scoring.criteria.filter((c) => c.critical).length, 3, "three critical criteria");
    assert.ok(doc.endings.unsafe?.class === "harm" && doc.endings.walkout?.class === "harm", "harm endings for an unsafe disposition and a walk-out");
  });
  test(`${r.course}/${r.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(r.course, r.slug));
  test(`${r.course}/${r.slug}: sources are dated, say how they were read and name a validated tool`, () => checkSources(r.course, r.slug));
  test(`${r.course}/${r.slug}: learner text is pattern level, with no mark, no dose and no method or means`, () => checkLearnerText(r.course, r.slug));
  test(`${r.course}/${r.slug}: goldens cover Good, Mediocre and Bad, every ending but time_up, every criterion met and missed`, () => checkGoldens(r.course, r.slug, true));
  test(`${r.course}/${r.slug}: behavior: the expert path is safe, skipping the screen is harm, a rupture is a walk-out`, () => {
    const doc = loadDocument(entryOf(r.course, r.slug)!);
    const g = goldenOf(r.course, r.slug);
    const want: Record<string, string> = { expert: "safe", [r.harmPath]: "unsafe", rupture: "walkout" };
    for (const [id, ending] of Object.entries(want)) {
      const p = g.paths.find((x) => x.id === id);
      assert.ok(p, `golden path ${id}`);
      const res = replayGoldenPath(doc, p!);
      assert.equal(res.error, null, `${id} replays`);
      assert.equal(res.debrief.ending, ending, `${id} ends ${ending}`);
    }
    assert.equal(documentWithoutScreening(doc), "unsafe", "documenting the right disposition without ever screening is still harm");
  });
}

for (const b of REQ329_BANDS) {
  test(`${b.course}/${b.slug}: a band of ${b.base}, registered, compiled and marked 18+`, () => {
    const e = entryOf(b.course, b.slug);
    assert.ok(e, "registered in ALL_DOCUMENTS");
    assert.equal(e!.kind, "band");
    const raw = JSON.parse(readFileSync(e!.file, "utf8")) as { base: { course: string; slug: string }; slug: string; patch: Record<string, unknown> };
    assert.equal(`${raw.base.course}/${raw.base.slug}`, b.base);
    assert.notEqual(raw.base.course, b.course, "a band registers another course's case");
    for (const k of Object.keys(raw.patch)) assert.ok(BAND_PATCH_KEYS.includes(k), `patch changes only ${BAND_PATCH_KEYS.join(", ")}: ${k}`);
    const doc = loadDocument(e!);
    assert.equal(doc.mature, true, "the band inherits mature: true");
    const [bc, bs] = b.base.split("/");
    const base = loadDocument(entryOf(bc, bs)!);
    assert.deepEqual(doc.scoring, base.scoring, "scoring is the base's");
    assert.deepEqual(doc.endings, base.endings, "endings are the base's");
  });
  test(`${b.course}/${b.slug}: objective and secondary objectives are the course's own`, () => checkObjectives(b.course, b.slug));
  test(`${b.course}/${b.slug}: sources are dated, say how they were read and name a validated tool`, () => checkSources(b.course, b.slug));
  test(`${b.course}/${b.slug}: learner text is pattern level, with no mark and no method or means`, () => checkLearnerText(b.course, b.slug));
  test(`${b.course}/${b.slug}: goldens cover Good, Mediocre and Bad and all three outcome classes`, () => checkGoldens(b.course, b.slug, false));
}

test("REQ-329: every case and band of this round is marked mature", () => {
  const all = [...REQ329_CASES, ...REQ329_BANDS];
  assert.ok(all.length > 0);
  const unmarked = all.filter((r) => loadDocument(entryOf(r.course, r.slug)!).mature !== true).map((r) => `${r.course}/${r.slug}`);
  assert.deepEqual(unmarked, []);
});

test("REQ-329: the pattern-level check catches a method or a named means and allows lethal means counseling", () => {
  const base = loadDocument(entryOf(REQ329_CASES[0].course, REQ329_CASES[0].slug)!);
  assert.deepEqual(patternLevelProblems(base), []);
  const withBrief = (s: string) => ({ ...base, brief: { ...base.brief, situation: s } }) as ScenarioDoc;
  assert.equal(patternLevelProblems(withBrief("He says he has a firearm at home.")).length, 1);
  assert.equal(patternLevelProblems(withBrief("She has saved up pills.")).length, 1);
  assert.equal(patternLevelProblems(withBrief("The lethality of the plan.")).length, 1);
  assert.deepEqual(patternLevelProblems(withBrief("Lethal means counseling with her sister.")), []);
});
