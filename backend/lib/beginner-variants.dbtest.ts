// REQ-262 (migration 083): writing a beginner version end to end against a real
// Postgres, with the writer, the fact-checker and the consistency checker
// replaced by fakes. No model is called anywhere in this suite.
//
//   - a checked variant is stored from the standard lesson, its Solo check is
//     the standard one byte for byte, and it is then served to a New learner
//     only when the course's switch is on;
//   - a variant written from the same standard lesson is kept (no model call);
//     one written from an older lesson is replaced;
//   - a clinical course, a learner's own course and a switched-off course are
//     refused BEFORE any model call;
//   - held back: nothing stored, a lesson_variant holdback logged;
//   - generating never turns a switch on.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { saveLesson, SHARED } from "./lesson-store";
import type { LessonContent } from "./lesson-store";
import { BeginnerVariantRefused, parseTeachSteps, resolveLesson, standardLessonHash } from "./lesson-variant";
import { generateBeginnerVariant, type VariantDeps } from "./beginner-variants";
import { HeldForAccuracyError } from "./generation-gate";
import type { CheckVerdict, FactChecker } from "./fact-check";

const run = Date.now().toString(36);
const users: string[] = [];
const tracks: string[] = [];

const stepCheck = (q: string, right: string, wrong: string[]) => ({
  question: q,
  choices: [right, ...wrong],
  correctIndex: 0,
  reasons: [`Right: ${right} is correct here.`, ...wrong.map((w) => `Wrong: ${w} does not fit this idea.`)],
});
const draft = () => ({
  steps: [
    { title: "A variable is a name", plain: "A variable is a name you give to a value so you can use it again.", example: "Like a sticky label on a jar.", precise: "In Python a variable is a name bound to a value.", check: stepCheck("What is a variable in Python?", "A name for a value", ["A kind of loop", "A saved file", "A kind of error"]) },
    { title: "Names can change what they hold", plain: "The same name can point to a number now and to words later.", example: "The label stays but the jar's contents change.", precise: "This is called dynamic typing.", check: stepCheck("What does dynamic typing allow?", "A name can hold different types", ["A name is locked to a number", "A name must be declared first", "A name keeps its first type"]) },
    { title: "Decimals are floats", plain: "A number with a decimal point is a different kind of number.", example: "A price of 2.50 has a point, a count of 3 apples does not.", precise: "A number with a decimal point is a float.", check: stepCheck("Which type is the value 2.5?", "float", ["int", "str", "bool"]) },
  ],
  fadeProblem: "BEGINNER guided: x = 2.5. Which type does Python report for x?",
  fadeChoices: ["float", "int", "str", "bool"],
  fadeCorrectIndex: 0,
  fadeWhy: "2.5 has a decimal point, so it is a float.",
  fadeOptionReasons: ["Right: a decimal makes a float.", "Wrong: int is a whole number.", "Wrong: str is text.", "Wrong: bool is True or False."],
  confidence: "high" as const,
  uncertainClaims: [] as string[],
});

const standardContent = (suffix = ""): LessonContent =>
  ({
    guessPrompt: "What is a variable?",
    teach: `A variable is a name for a value.${suffix}`,
    teachCards: { cards: [{ kind: "definition", title: "What it is", body: "A name for a value." }, { kind: "why", title: "Why it matters", body: "Code reads better." }, { kind: "example", title: "Worked example", body: "x = 3", steps: ["one", "two"] }, { kind: "mistake", title: "Common mistake", body: "Forgetting =." }], selfExplain: null },
    fadeProblem: "STANDARD guided: which is a variable?", fadeChoices: ["a name for a value", "a loop", "a file", "a bug"], fadeCorrectIndex: 0, fadeWhy: "Because.",
    fadeOptionReasons: ["r1", "r2", "r3", "r4"],
    soloCheck: "Solo: what does type(3.0) show?", soloChoices: ["float", "int", "str", "bool"], soloCorrectIndex: 0, soloWhy: "3.0 has a decimal point.",
    soloOptionReasons: ["s1", "s2", "s3", "s4"],
  }) as unknown as LessonContent;

async function subcategory(slug: string): Promise<string> {
  const r = await queryOne<{ id: string }>(`select es.id from education_subcategories es join education_categories ec on ec.id = es.category_id where ec.slug = $1 order by es.sort_order limit 1`, [slug]);
  assert.ok(r, `the seed has a subcategory under ${slug}`);
  return r.id;
}

async function fixture(o: { cat?: string | null; switchOn?: boolean; owner?: string } = {}) {
  const trackId = randomUUID(), unitId = randomUUID(), objectiveId = randomUUID();
  tracks.push(trackId);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id, beginner_variants) values ($1, $2, 'Variant gen test', 'certification', $3, $4, $5)`,
    [trackId, `VGN${run}${tracks.length}`, o.owner ?? null, o.cat === undefined ? await subcategory("it-software") : o.cat ? await subcategory(o.cat) : null, o.switchOn === true]
  );
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [unitId, trackId]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Variables', 1)`, [objectiveId, unitId]);
  const standard = await saveLesson(SHARED, objectiveId, standardContent(), "test-model");
  return { trackId, unitId, objectiveId, standard };
}

const verdict = (key: string, outcome: CheckVerdict["outcome"], claims: string[] = []): CheckVerdict => ({ key, publish: outcome === "agree" && !claims.length, answer: null, unsupportedClaims: claims, outcome });

function deps(over: Partial<VariantDeps> = {}) {
  const calls = { write: 0, check: 0, consistency: 0 };
  const d: VariantDeps = {
    write: async () => { calls.write++; return draft(); },
    checkConsistency: async () => { calls.consistency++; return { consistent: true, contradictions: [] }; },
    factCheck: (async (items) => { calls.check++; return items.map((i) => verdict(i.key, "agree")); }) as FactChecker,
    model: "test-model",
    userId: null,
    log: () => {},
    ...over,
  };
  return { d, calls };
}

const variantRow = (objectiveId: string) => queryOne<Record<string, unknown>>(`select * from lesson_content_variants where objective_id = $1 and level = 'new'`, [objectiveId]);
const switchOf = async (trackId: string) => (await queryOne<{ b: boolean }>(`select beginner_variants as b from subject_tracks where id = $1`, [trackId]))!.b;

after(async () => {
  await query(`delete from item_holdbacks where objective_id in (select o.id from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = any($1::uuid[]))`, [tracks]).catch(() => undefined);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [tracks]);
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("storing a checked variant", () => {
  test("it is stored from the standard lesson; the Solo check is the standard one; the steps parse", async () => {
    const f = await fixture({ switchOn: true });
    const { d, calls } = deps();
    const out = await generateBeginnerVariant(f.objectiveId, d);
    assert.deepEqual(out, { status: "stored", retried: false });
    assert.deepEqual([calls.write, calls.check, calls.consistency], [1, 1, 1]);
    const v = (await variantRow(f.objectiveId))!;
    assert.equal(v.source_lesson_hash, standardLessonHash(f.standard));
    assert.equal(v.solo_check, f.standard.solo_check);
    assert.deepEqual(v.solo_choices, f.standard.solo_choices);
    assert.equal(v.solo_correct_index, f.standard.solo_correct_index);
    assert.equal(v.teach, f.standard.teach);
    assert.equal(parseTeachSteps(v.teach_steps)?.length, 3);
    assert.deepEqual(v.consistency, { consistent: true, contradictions: [] });
    const choices = v.fade_choices as string[];
    assert.equal(choices[v.fade_correct_index as number], "float", "the Guided key moved with its option");
  });
  test("a New learner is served it only while the switch is on; generating never turns the switch on", async () => {
    const f = await fixture({ switchOn: false });
    const u = randomUUID();
    users.push(u);
    await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
    await query(`insert into learner_course_profiles (user_id, track_id, level, level_source) values ($1, $2, 'new', 'self')`, [u, f.trackId]);
    // switched off: writing is refused, nothing stored, the switch is still off
    const { d, calls } = deps();
    await assert.rejects(generateBeginnerVariant(f.objectiveId, d), BeginnerVariantRefused);
    assert.equal(calls.write + calls.check + calls.consistency, 0, "no model call for a switched-off course");
    assert.equal(await variantRow(f.objectiveId), null);
    // a row written elsewhere (switch bypassed for the test) is still not served while off
    await generateBeginnerVariant(f.objectiveId, d, { requireSwitch: false });
    assert.equal(await switchOf(f.trackId), false, "generating did not switch the course on");
    const served = await resolveLesson(u, f.objectiveId, { serve: { variantAware: true } });
    assert.equal(served?.version, "standard");
    await query(`update subject_tracks set beginner_variants = true where id = $1`, [f.trackId]);
    const on = await resolveLesson(u, f.objectiveId, { serve: { variantAware: true } });
    assert.equal(on?.version, "beginner");
  });
  test("a variant from the same standard lesson is kept with no model call; one from an older lesson is replaced", async () => {
    const f = await fixture({ switchOn: true });
    const first = deps();
    await generateBeginnerVariant(f.objectiveId, first.d);
    const again = deps();
    assert.deepEqual(await generateBeginnerVariant(f.objectiveId, again.d), { status: "kept", reason: "already_current" });
    assert.equal(again.calls.write + again.calls.check + again.calls.consistency, 0);
    const oldHash = (await variantRow(f.objectiveId))!.source_lesson_hash;
    // a correction to the standard lesson (the same edit a lesson fix makes)
    await query(`update lesson_content set teach = teach || ' It can be reassigned.' where objective_id = $1`, [f.objectiveId]);
    const next = deps();
    assert.deepEqual(await generateBeginnerVariant(f.objectiveId, next.d), { status: "stored", retried: false });
    assert.notEqual((await variantRow(f.objectiveId))!.source_lesson_hash, oldHash);
  });
  test("the standard lesson corrected while the variant was being written: kept as it was, nothing stored", async () => {
    const f = await fixture({ switchOn: true });
    const { d } = deps({
      write: async () => {
        await query(`update lesson_content set teach = teach || ' Corrected.' where objective_id = $1`, [f.objectiveId]);
        return draft();
      },
    });
    assert.deepEqual(await generateBeginnerVariant(f.objectiveId, d), { status: "kept", reason: "lesson_changed" });
    assert.equal(await variantRow(f.objectiveId), null);
  });
});

describe("refused before any model call", () => {
  test("a clinical course is refused even with its switch on", async () => {
    for (const slug of ["healthcare-nursing", "mental-health"]) {
      const f = await fixture({ cat: slug, switchOn: true });
      const { d, calls } = deps();
      await assert.rejects(generateBeginnerVariant(f.objectiveId, d, { requireSwitch: false }), BeginnerVariantRefused, slug);
      assert.equal(calls.write + calls.check + calls.consistency, 0, slug);
      assert.equal(await variantRow(f.objectiveId), null, slug);
    }
  });
  test("a learner's own course is refused", async () => {
    const owner = randomUUID();
    users.push(owner);
    await query(`insert into app_users (id, email) values ($1, $2)`, [owner, `${owner}@example.test`]);
    const f = await fixture({ switchOn: true, owner });
    const { d, calls } = deps();
    await assert.rejects(generateBeginnerVariant(f.objectiveId, d), BeginnerVariantRefused);
    assert.equal(calls.write, 0);
  });
  test("an objective with no standard lesson yet is skipped", async () => {
    const f = await fixture({ switchOn: true });
    await query(`delete from lesson_content where objective_id = $1`, [f.objectiveId]);
    const { d, calls } = deps();
    assert.deepEqual(await generateBeginnerVariant(f.objectiveId, d), { status: "skipped", reason: "no_lesson" });
    assert.equal(calls.write, 0);
  });
});

describe("held back", () => {
  test("a fact-check disagreement twice stores nothing and logs lesson_variant holdbacks", async () => {
    const f = await fixture({ switchOn: true });
    const { d } = deps({ factCheck: (async (items) => items.map((i) => verdict(i.key, i.key === "step_1_check" ? "disagree" : "agree", i.key === "step_1_check" ? ["the keyed answer is wrong"] : []))) as FactChecker });
    await assert.rejects(generateBeginnerVariant(f.objectiveId, d), HeldForAccuracyError);
    assert.equal(await variantRow(f.objectiveId), null);
    const held = await query<{ item_kind: string; reason: string }>(`select item_kind, reason from item_holdbacks where objective_id = $1 order by created_at`, [f.objectiveId]);
    assert.deepEqual(held.map((h) => [h.item_kind, h.reason]), [["lesson_variant", "fact_check"], ["lesson_variant", "fact_check"]]);
  });
  test("a consistency contradiction stores nothing", async () => {
    const f = await fixture({ switchOn: true });
    const { d } = deps({ checkConsistency: async () => ({ consistent: false, contradictions: ["step 2 says names cannot change"] }) });
    await assert.rejects(generateBeginnerVariant(f.objectiveId, d), HeldForAccuracyError);
    assert.equal(await variantRow(f.objectiveId), null);
  });
});
