// REQ-262 (migration 083), against a real Postgres with every migration
// applied and the seed run. No model call is made anywhere in this suite.
//
//   1. Off by default: no course is switched on, and with the switch off every
//      path returns exactly the standard lesson.
//   2. The resolver: on + level New + an aware app + a fresh variant serves it;
//      every other combination serves the standard lesson; a clinical course
//      never does, whatever its switch says.
//   3. The right key: a Guided answer to a beginner version is graded against
//      THAT version's key and recorded with it; a standard answer is not; a
//      version that is gone is a 409; Solo is the same in both.
//   4. Reports, the coach guard, the exam-bank copy and deletion.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { getLessonFor, saveLesson, SHARED } from "./lesson-store";
import type { LessonContent } from "./lesson-store";
import { BEGINNER_LAUNCH_SET, resolveLesson, standardLessonHash, isClinicalCourse } from "./lesson-variant";
import { lessonCheckFor } from "./grading-service";
import { openItemsFor } from "./coach-guard";
import { copyAnsweredLessonChecks } from "./exam-items";
import { resolveReport } from "./item-report";
import { lessonItemId } from "./item-quality";
import { GET as lessonGet } from "../app/api/objectives/[id]/lesson/route";
import { POST as gradePost } from "../app/api/grade/route";
import { POST as hintPost } from "../app/api/objectives/[id]/hint/route";

const run = Date.now().toString(36);
const users: string[] = [];
const tracks: string[] = [];

interface Fixture { trackId: string; unitId: string; objectiveId: string }

const STD_GUIDED = { q: "STANDARD guided: which is a variable?", choices: ["a name for a value", "a loop", "a file", "a bug"], key: 0 };
const VAR_GUIDED = { q: "BEGINNER guided: finish the last step", choices: ["step A", "step B", "step C", "step D"], key: 2 };
const SOLO = { q: "Solo: what does type(3.0) show?", choices: ["float", "int", "str", "bool"], key: 0 };
const standardContent = (): LessonContent =>
  ({
    guessPrompt: "What is a variable?",
    teach: "A variable is a name for a value.",
    teachCards: { cards: [{ kind: "definition", title: "What it is", body: "A name for a value." }, { kind: "why", title: "Why it matters", body: "Code reads better." }, { kind: "example", title: "Worked example", body: "x = 3", steps: ["one", "two"] }, { kind: "mistake", title: "Common mistake", body: "Forgetting =." }], selfExplain: null },
    fadeProblem: STD_GUIDED.q, fadeChoices: STD_GUIDED.choices, fadeCorrectIndex: STD_GUIDED.key, fadeWhy: "Because.",
    fadeOptionReasons: ["r1", "r2", "r3", "r4"],
    soloCheck: SOLO.q, soloChoices: SOLO.choices, soloCorrectIndex: SOLO.key, soloWhy: "3.0 has a decimal point.",
    soloOptionReasons: ["s1", "s2", "s3", "s4"],
  }) as unknown as LessonContent;

const step = (n: number) => ({
  title: `Step ${n}`, plain: "plain", example: "everyday", precise: "exam wording",
  check: { question: `Quick check ${n}?`, choices: ["right", "wrong 1", "wrong 2", "wrong 3"], correctIndex: 0, reasons: ["Yes.", "No 1.", "No 2.", "No 3."] },
});

async function category(slug: string): Promise<string> {
  const r = await queryOne<{ id: string }>(
    `select es.id from education_subcategories es join education_categories ec on ec.id = es.category_id where ec.slug = $1 order by es.sort_order limit 1`,
    [slug]
  );
  assert.ok(r, `the seed has a subcategory under ${slug}`);
  return r.id;
}

async function fixture(cat: string | null, opts: { switchOn?: boolean; variant?: boolean } = {}): Promise<Fixture> {
  const trackId = randomUUID(), unitId = randomUUID(), objectiveId = randomUUID();
  tracks.push(trackId);
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id, beginner_variants) values ($1, $2, 'Variant test', 'certification', null, $3, $4)`,
    [trackId, `VAR${run}${tracks.length}`, cat ? await category(cat) : null, opts.switchOn === true]
  );
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [unitId, trackId]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Variables', 1)`, [objectiveId, unitId]);
  const row = await saveLesson(SHARED, objectiveId, standardContent(), "test-model");
  if (opts.variant !== false) await insertVariant(objectiveId, row);
  return { trackId, unitId, objectiveId };
}

async function insertVariant(objectiveId: string, standard: Awaited<ReturnType<typeof saveLesson>>, hash = standardLessonHash(standard)) {
  await query(
    `insert into lesson_content_variants
      (objective_id, level, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, fade_option_reasons, solo_option_reasons, teach_cards,
       teach_steps, source_lesson_hash, consistency, model)
     values ($1, 'new', $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17::jsonb, 'test-model')`,
    [
      objectiveId, standard.guess_prompt, standard.teach, VAR_GUIDED.q, JSON.stringify(VAR_GUIDED.choices), VAR_GUIDED.key, "Variant why.",
      standard.solo_check, JSON.stringify(standard.solo_choices), standard.solo_correct_index, standard.solo_why,
      JSON.stringify(["v1", "v2", "v3", "v4"]), JSON.stringify(standard.solo_option_reasons), JSON.stringify(standard.teach_cards),
      JSON.stringify([step(1), step(2), step(3)]), hash, JSON.stringify({ consistent: true, contradictions: [] }),
    ]
  );
}

async function newUser(level: "new" | "some" | "experienced" | null, f?: Fixture): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  if (level && f) await query(`insert into learner_course_profiles (user_id, track_id, level, level_source) values ($1, $2, $3, 'self')`, [u, f.trackId, level]);
  return u;
}

const auth = (u: string, protocol?: number) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
  "content-type": "application/json",
  ...(protocol ? { "x-ascendra-client": String(protocol) } : {}),
});
const lessonReq = async (u: string, f: Fixture, protocol?: number) =>
  (await lessonGet(new Request("http://t", { headers: auth(u, protocol) }), { params: Promise.resolve({ id: f.objectiveId }) })) as Response;
const grade = async (u: string, f: Fixture, body: Record<string, unknown>) =>
  (await gradePost(new Request("http://t/api/grade", { method: "POST", headers: auth(u, 3), body: JSON.stringify({ objectiveId: f.objectiveId, ...body }) }))) as Response;

after(async () => {
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [tracks]);
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("off by default", () => {
  test("no course in the database is switched on, and the launch set is in the catalog and not clinical", async () => {
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from subject_tracks where beginner_variants`))?.n, 0);
    for (const c of BEGINNER_LAUNCH_SET) {
      const t = await queryOne<{ cat: string | null; sub: string | null; on: boolean }>(
        `select ec.slug as cat, es.slug as sub, st.beginner_variants as on
           from subject_tracks st left join education_subcategories es on es.id = st.subcategory_id left join education_categories ec on ec.id = es.category_id
          where st.code = $1 and st.user_id is null`,
        [c.code]
      );
      assert.ok(t, `${c.code} is in the seeded catalog`);
      assert.equal(isClinicalCourse(t.cat, t.sub), false, c.code);
      assert.equal(t.on, false, c.code);
    }
  });

  test("a new course starts with the switch off", async () => {
    const f = await fixture("development", { variant: false });
    assert.equal((await queryOne<{ b: boolean }>(`select beginner_variants as b from subject_tracks where id = $1`, [f.trackId]))?.b, false);
  });

  test("with the switch off, a stored variant is never served and the payload is the standard one", async () => {
    const f = await fixture("development"); // variant stored, switch off
    const u = await newUser("new", f);
    const body = await (await lessonReq(u, f, 3)).json();
    assert.equal(body.lesson.fadeProblem, STD_GUIDED.q);
    assert.equal(body.lesson.version, undefined);
    assert.equal(body.lesson.teachSteps, undefined);
    const std = await getLessonFor(u, f.objectiveId);
    const resolved = await resolveLesson(u, f.objectiveId, { serve: { variantAware: true } });
    assert.deepEqual(resolved?.row, std?.row);
    assert.equal(resolved?.version, "standard");
  });
});

describe("the resolver", () => {
  test("switch on + level New + an aware app + a fresh variant serves the beginner version", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    const body = await (await lessonReq(u, f, 3)).json();
    assert.equal(body.lesson.version, "beginner");
    assert.equal(body.lesson.teachSteps.length, 3);
    assert.equal(body.lesson.fadeProblem, VAR_GUIDED.q);
    assert.equal(body.lesson.soloCheck, SOLO.q, "Solo is the standard Solo check");
    assert.equal(body.lesson.fadeCorrectIndex, undefined, "no key in the payload");
    assert.deepEqual(body.lesson.soloChoices, []);
    assert.ok(body.lesson.teachCards, "the standard cards (the worked example) still come with it");
  });

  test("Some background, Experienced, no level yet (suggestion), an older app, and a regenerated lesson all get the standard lesson", async () => {
    const f = await fixture("development", { switchOn: true });
    const some = await newUser("some", f);
    const exp = await newUser("experienced", f);
    const fresh = await newUser(null, f);
    const nu = await newUser("new", f);
    for (const u of [some, exp, fresh]) assert.equal((await (await lessonReq(u, f, 3)).json()).lesson.fadeProblem, STD_GUIDED.q);
    assert.equal((await (await lessonReq(nu, f, 2)).json()).lesson.fadeProblem, STD_GUIDED.q, "protocol 2");
    assert.equal((await (await lessonReq(nu, f)).json()).lesson.fadeProblem, STD_GUIDED.q, "no protocol header");
    await saveLesson({ kind: "user", userId: nu }, f.objectiveId, { ...standardContent(), fadeProblem: "MY OWN regenerated guided question?" } as LessonContent, "m");
    assert.equal((await (await lessonReq(nu, f, 3)).json()).lesson.fadeProblem, "MY OWN regenerated guided question?");
  });

  test("a goal that suggests New (career change) is enough; a unit set to Some overrides a New course", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser(null, f);
    await query(`insert into learner_course_profiles (user_id, track_id, goal, level, level_source) values ($1, $2, 'career_change', 'new', 'default')`, [u, f.trackId]);
    assert.equal((await (await lessonReq(u, f, 3)).json()).lesson.version, "beginner");
    await query(`insert into learner_unit_levels (user_id, unit_id, track_id, level, source) values ($1, $2, $3, 'some', 'self')`, [u, f.unitId, f.trackId]);
    assert.equal((await (await lessonReq(u, f, 3)).json()).lesson.version, undefined);
  });

  test("a clinical course never serves one, whatever its switch says, and the answer path refuses it", async () => {
    for (const slug of ["healthcare-nursing", "mental-health"]) {
      const f = await fixture(slug, { switchOn: true });
      const u = await newUser("new", f);
      // (the lesson route would first ask a clinical learner for the study notice or the 18+ acknowledgment)
      const r = await resolveLesson(u, f.objectiveId, { serve: { variantAware: true } });
      assert.equal(r?.version, "standard", slug);
      assert.equal(r?.row.fade_problem, STD_GUIDED.q, slug);
      await assert.rejects(resolveLesson(u, f.objectiveId, { answered: "beginner" }), /updated while you had it open/);
    }
  });

  test("a learner's own course never serves one", async () => {
    const f = await fixture("development", { switchOn: true });
    const owner = await newUser("new", f);
    await query(`update subject_tracks set user_id = $2 where id = $1`, [f.trackId, owner]);
    const r = await resolveLesson(owner, f.objectiveId, { serve: { variantAware: true } });
    assert.equal(r?.version, "standard");
  });

  test("a variant written from an older standard lesson is not served (stale)", async () => {
    const f = await fixture("development", { switchOn: true, variant: false });
    const std = (await getLessonFor(await newUser("new", f), f.objectiveId))!.row;
    await insertVariant(f.objectiveId, std as never, "0".repeat(64));
    const u = await newUser("new", f);
    assert.equal((await resolveLesson(u, f.objectiveId, { serve: { variantAware: true } }))?.version, "standard");
    await assert.rejects(resolveLesson(u, f.objectiveId, { answered: "beginner" }), /Reload it/);
  });

  test("a pulled beginner Guided item is not served", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    assert.equal((await resolveLesson(u, f.objectiveId, { serve: { variantAware: true } }))?.version, "beginner");
    await query(
      `insert into item_status (item_kind, item_id, objective_id, question, status, reason) values ('lesson', $1, $2, $3, 'quarantined', 'flags')`,
      [lessonItemId(f.objectiveId, "fade", VAR_GUIDED.q), f.objectiveId, VAR_GUIDED.q]
    );
    assert.equal((await resolveLesson(u, f.objectiveId, { serve: { variantAware: true } }))?.version, "standard");
  });

  test("a malformed variant (two steps) cannot be stored, and one with bad steps JSON is not served", async () => {
    const f = await fixture("development", { switchOn: true, variant: false });
    const std = (await getLessonFor(await newUser("new", f), f.objectiveId))!.row;
    await assert.rejects(
      query(`insert into lesson_content_variants (objective_id, level, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, teach_steps, source_lesson_hash, model)
             values ($1, 'new', 'g', 't', 'f', '[]', 0, 'w', 's', '[]', 0, 'w', '[1,2]', $2, 'm')`, [f.objectiveId, standardLessonHash(std)]),
      /lesson_content_variants_steps_083/
    );
    await assert.rejects(
      query(`insert into lesson_content_variants (objective_id, level, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, teach_steps, source_lesson_hash, model)
             values ($1, 'experienced', 'g', 't', 'f', '[]', 0, 'w', 's', '[]', 0, 'w', '[1,2,3]', $2, 'm')`, [f.objectiveId, standardLessonHash(std)]),
      /level_check|violates check/
    );
  });
});

describe("the right key (grading, hint, report)", () => {
  test("a Guided answer to the beginner version is graded against ITS key and recorded as such", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    const lesson = (await (await lessonReq(u, f, 3)).json()).lesson;
    const shown: string[] = lesson.fadeChoices;
    const pick = shown.indexOf(VAR_GUIDED.choices[VAR_GUIDED.key]);
    const res = await grade(u, f, { format: "mc", stage: "fade", chosenIndex: pick, lessonVariant: "new" });
    const out = await res.json();
    assert.equal(res.status, 200, JSON.stringify(out));
    assert.equal(out.verdict, "correct");
    assert.equal(out.correctAnswer, VAR_GUIDED.choices[VAR_GUIDED.key]);
    const a = await queryOne<{ lesson_variant: string | null; question: string; answer: string }>(
      `select lesson_variant, question, answer from attempts where user_id = $1 and objective_id = $2 and stage = 'fade'`,
      [u, f.objectiveId]
    );
    assert.equal(a?.lesson_variant, "new");
    assert.equal(a?.question, VAR_GUIDED.q);
    assert.equal(a?.answer, VAR_GUIDED.choices[VAR_GUIDED.key]);
  });

  test("the same pick graded as the standard lesson uses the standard key, and records no version", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("some", f);
    const lesson = (await (await lessonReq(u, f, 3)).json()).lesson;
    const pick = (lesson.fadeChoices as string[]).indexOf(STD_GUIDED.choices[STD_GUIDED.key]);
    const out = await (await grade(u, f, { format: "mc", stage: "fade", chosenIndex: pick })).json();
    assert.equal(out.verdict, "correct");
    const a = await queryOne<{ lesson_variant: string | null; question: string }>(`select lesson_variant, question from attempts where user_id = $1 and stage = 'fade'`, [u]);
    assert.equal(a?.lesson_variant, null);
    assert.equal(a?.question, STD_GUIDED.q);
  });

  test("a wrong pick on the beginner version is incorrect by the beginner key even if it matches the standard key's text", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    const lesson = (await (await lessonReq(u, f, 3)).json()).lesson;
    const wrong = (lesson.fadeChoices as string[]).indexOf("step A");
    const out = await (await grade(u, f, { format: "mc", stage: "fade", chosenIndex: wrong, lessonVariant: "new" })).json();
    assert.equal(out.verdict, "incorrect");
    assert.equal(out.correctAnswer, "step C");
  });

  test("Solo is the same question and key in both versions; the version is still recorded", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    const hint = await hintPost(new Request("http://t", { method: "POST", headers: auth(u, 3), body: JSON.stringify({ stage: "solo", lessonVariant: "new" }) }), { params: Promise.resolve({ id: f.objectiveId }) });
    const choices: string[] = (await hint.json()).choices;
    assert.deepEqual([...choices].sort(), [...SOLO.choices].sort());
    const out = await (await grade(u, f, { format: "mc", stage: "solo", chosenIndex: choices.indexOf("float"), lessonVariant: "new" })).json();
    assert.equal(out.verdict, "correct");
    assert.equal((await queryOne<{ v: string | null }>(`select lesson_variant as v from attempts where user_id = $1 and stage = 'solo'`, [u]))?.v, "new");
    const std = await lessonCheckFor(u, f.objectiveId, "solo");
    const beg = await lessonCheckFor(u, f.objectiveId, "solo", "beginner");
    assert.ok(std.status === "ok" && beg.status === "ok");
    if (std.status === "ok" && beg.status === "ok") {
      assert.deepEqual({ ...std.check, version: 0 }, { ...beg.check, version: 0 });
      assert.equal(beg.check.version, "beginner");
    }
  });

  test("naming a beginner version that is not available is a 409 'lesson_changed', and nothing is recorded", async () => {
    const f = await fixture("development", { variant: true }); // switch OFF
    const u = await newUser("new", f);
    const res = await grade(u, f, { format: "mc", stage: "fade", chosenIndex: 0, lessonVariant: "new" });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, "lesson_changed");
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1`, [u]))?.n, 0);
  });

  test("an unknown version name is a 400", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    for (const v of ["beginner", "NEW", 1, true]) assert.equal((await grade(u, f, { format: "mc", stage: "fade", chosenIndex: 0, lessonVariant: v })).status, 400, String(v));
  });

  test("a report on the beginner Guided item names that item, not the standard one", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    const b = await resolveReport(u, { kind: "lesson", objectiveId: f.objectiveId, stage: "fade", lessonVariant: "new", reason: "wrong_answer" });
    assert.equal(b.ref.question, VAR_GUIDED.q);
    assert.equal(b.ref.itemId, lessonItemId(f.objectiveId, "fade", VAR_GUIDED.q));
    const s = await resolveReport(u, { kind: "lesson", objectiveId: f.objectiveId, stage: "fade", reason: "wrong_answer" });
    assert.equal(s.ref.question, STD_GUIDED.q);
  });
});

describe("around the edges", () => {
  test("the attempts check refuses an unknown version and every existing attempt reads as the standard lesson", async () => {
    const f = await fixture("development");
    const u = await newUser("new", f);
    await assert.rejects(
      query(`insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict, lesson_variant) values ($1, $2, 'lesson', 'fade', 'mc', 'q', 'a', 'correct', 'beginner')`, [u, f.objectiveId]),
      /attempts_lesson_variant_083/
    );
    await query(`insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict) values ($1, $2, 'lesson', 'fade', 'mc', 'q', 'a', 'correct')`, [u, f.objectiveId]);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from attempts where lesson_variant is not null and user_id = $1`, [u]))?.n, 0);
  });

  test("the coach guard protects the beginner Guided question as well as the standard one", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    await query(`insert into lesson_progress (user_id, objective_id, step, lesson_key) values ($1, $2, 'fade', 'k')`, [u, f.objectiveId]);
    const open = await openItemsFor(u, f.trackId);
    const qs = open.map((i) => i.question);
    assert.ok(qs.includes(STD_GUIDED.q) && qs.includes(VAR_GUIDED.q) && qs.includes(SOLO.q), JSON.stringify(qs));
    assert.equal(open.find((i) => i.question === VAR_GUIDED.q)?.answerKey, "step C");
  });

  test("the exam-bank copy takes the shared Solo check but never copies the beginner Guided item against the standard key", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    for (const [stage, q, a] of [["fade", VAR_GUIDED.q, "step C"], ["solo", SOLO.q, "float"]]) {
      await query(`insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict, lesson_variant) values ($1, $2, 'lesson', $3, 'mc', $4, $5, 'correct', 'new')`, [u, f.objectiveId, stage, q, a]);
    }
    await copyAnsweredLessonChecks(u, [f.objectiveId]);
    const stems = (await query<{ stem: string }>(`select stem from exam_items where objective_id = $1`, [f.objectiveId])).map((r) => r.stem);
    assert.ok(stems.includes(SOLO.q));
    assert.ok(!stems.includes(VAR_GUIDED.q));
    assert.ok(!stems.includes(STD_GUIDED.q), "the standard Guided item was never answered, so it is not copied");
  });

  test("deleting a course removes its variants and keeps the attempts, version marker included, unreferenced", async () => {
    const f = await fixture("development", { switchOn: true });
    const u = await newUser("new", f);
    await query(`insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict, lesson_variant) values ($1, $2, 'lesson', 'fade', 'mc', 'q', 'a', 'correct', 'new')`, [u, f.objectiveId]);
    await query(`delete from subject_tracks where id = $1`, [f.trackId]);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from lesson_content_variants where objective_id = $1`, [f.objectiveId]))?.n, 0);
    const a = await queryOne<{ objective_id: string | null; lesson_variant: string | null }>(`select objective_id, lesson_variant from attempts where user_id = $1`, [u]);
    assert.equal(a?.objective_id, null);
    assert.equal(a?.lesson_variant, "new");
  });
});
