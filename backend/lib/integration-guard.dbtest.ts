// REQ-112 (f): the coach guard lists every kind of open item from one
// function, and each kind leaves the list once answered. Plus the account
// export's coverage of per-learner tables. Real Postgres, every migration.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { OPEN_ITEM_KINDS, openItemsBlock, openItemsFor, type OpenItem } from "./coach-guard";
import { EXPORT_EXCLUDED_TABLES, EXPORT_SECTIONS } from "./account-export";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const [oLesson, oReview, oOther] = [randomUUID(), randomUUID(), randomUUID()];
const scenario = randomUUID();
const unitCheckItem = randomUUID();
const conceptSet = randomUUID();
const discItem = randomUUID();
const quizItem = randomUUID();
const examItem = randomUUID();
const reviewItem = randomUUID();
const users: string[] = [];

const Q = {
  lessonFade: "IG fade: which port does HTTPS use by default?",
  lessonSolo: "IG solo: name the protocol that replaced SSL",
  reviewSolo: "IG review solo: what does a WAF inspect?",
  pbq: "IG PBQ scenario: 1) segment the network 2) justify it",
  unitCheck: "IG unit check: a new incident, 1) name it 2) contain it",
  disc: "IG comparison: access is decided by the user's job role",
  quiz: "IG quiz: which control is detective?",
  exam: "IG exam: which service queues messages?",
  reviewSession: "IG review session: what does TLS provide?",
};

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `ig-${run}-${users.length}@example.test`]);
  return u;
}

// One learner with one open item of every kind.
async function learnerWithEverythingOpen(): Promise<string> {
  const u = await newUser();
  // lesson: an opened lesson, nothing answered
  await query(`insert into lesson_progress (user_id, objective_id, step, lesson_key) values ($1, $2, 'fade', 'k')`, [u, oLesson]);
  // review: an opened lesson whose Solo item was missed and is still in review
  await query(`insert into lesson_progress (user_id, objective_id, step, lesson_key) values ($1, $2, 'solo', 'k')`, [u, oReview]);
  const miss = await queryOne<{ id: string }>(
    `insert into attempts (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict)
     values ($1, $2, $3, 'lesson', 'solo', 'open', $4, 'a', 'incorrect') returning id`,
    [u, unit, oReview, Q.reviewSolo]
  );
  await query(
    `insert into error_log (user_id, unit_id, objective_id, attempt_id, topic, error_text, review_stage, next_review_at)
     values ($1, $2, $3, $4, 't', 'e', 0, current_date)`,
    [u, unit, oReview, miss!.id]
  );
  // studied in the unit (unit check, comparison card need it)
  await query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Guided', 2, 'e')`, [u, oOther]);
  // quiz: an open Quiz me turn
  await query(`insert into coach_quiz_turns (user_id, track_id, item_id) values ($1, $2, $3)`, [u, track, quizItem]);
  // exam: a sprint in progress
  const s = await queryOne<{ id: string }>(`insert into exam_sessions (user_id, track_id, mode) values ($1, $2, 'sprint') returning id`, [
    u,
    track,
  ]);
  await query(`insert into exam_session_items (session_id, position, item_id, objective_id, unit_id) values ($1, 0, $2, $3, $4)`, [
    s!.id,
    examItem,
    oOther,
    unit,
  ]);
  // review: a prepared Today's review question
  const rs = await queryOne<{ id: string }>(
    `insert into review_sessions (user_id, track_id, day, size_cap) values ($1, $2, current_date, 12) returning id`,
    [u, track]
  );
  await query(`insert into review_session_items (session_id, position, objective_id, review_item_id) values ($1, 0, $2, $3)`, [
    rs!.id,
    oOther,
    reviewItem,
  ]);
  return u;
}
const kinds = (items: OpenItem[]) => new Set(items.map((i) => i.kind));
const has = (items: OpenItem[], kind: string, q: string) => items.some((i) => i.kind === kind && i.question === q);

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'IG', 'certification', null)`, [
    track,
    `IG-${run}`,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order, gate_description) values ($1, $2, 'IG unit', 1, 'gate')`, [
    unit,
    track,
  ]);
  for (const [i, o] of [oLesson, oReview, oOther].entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `IG O${i}`, i]);
  }
  for (const [o, fade, solo] of [
    [oLesson, Q.lessonFade, Q.lessonSolo],
    [oReview, `${Q.reviewSolo} (fade)`, Q.reviewSolo],
  ]) {
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', 't', $2, '["443 by default","80","22","25"]', 0, 'w', $3, '["Transport Layer Security","x","y","z"]', 0, 'w', 'test')`,
      [o, fade, solo]
    );
  }
  await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'IG PBQ', $3, '["a","b"]', 't')`, [
    scenario,
    unit,
    Q.pbq,
  ]);
  await query(
    `insert into unit_check_items (id, unit_id, gate_hash, title, scenario, sub_parts, model) values ($1, $2, md5('gate'), 'UC', $3, '["a","b"]', 't')`,
    [unitCheckItem, unit, Q.unitCheck]
  );
  await query(
    `insert into concept_sets (id, track_id, source, set_key, how_to_tell, dimensions) values ($1, $2, 'generated', $3, 'h', '[]')`,
    [conceptSet, track, `mac|rbac-${run}`]
  );
  await query(
    `insert into concept_set_members (set_id, position, name, objective_id) values ($1, 0, 'Role-based access control', $2), ($1, 1, 'MAC', null)`,
    [conceptSet, oOther]
  );
  await query(`insert into discrimination_items (id, set_id, scenario, answer_position, why) values ($1, $2, $3, 0, 'w')`, [
    discItem,
    conceptSet,
    Q.disc,
  ]);
  await query(
    `insert into coach_quiz_items (id, objective_id, question, choices, correct_index, hints, explanation)
     values ($1, $2, $3, '["Audit log review","Firewall","Lock","Policy"]', 0, '["h1","h2"]', 'e')`,
    [quizItem, oOther, Q.quiz]
  );
  await query(
    `insert into exam_items (id, objective_id, item_format, stem, body, answer_key)
     values ($1, $2, 'multiple_choice', $3, '{"choices":["Simple Queue Service","SNS","S3","EC2"]}', '{"correct":[0]}')`,
    [examItem, oOther, Q.exam]
  );
  await query(
    `insert into review_items (id, objective_id, source_hash, question, choices, correct_index, why, model)
     values ($1, $2, 'h', $3, '["Confidentiality and integrity in transit","x","y","z"]', 0, 'w', 't')`,
    [reviewItem, oOther, Q.reviewSession]
  );
});

after(async () => {
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("coach guard: one list of every open item kind (REQ-112 f)", () => {
  test("a learner with one of each has every kind listed, with the answer key where there is one", async () => {
    const u = await learnerWithEverythingOpen();
    const items = await openItemsFor(u, track);
    assert.deepEqual([...kinds(items)].sort(), [...OPEN_ITEM_KINDS].sort());
    assert.ok(has(items, "lesson", Q.lessonFade) && has(items, "lesson", Q.lessonSolo));
    assert.ok(has(items, "review", Q.reviewSolo), "pending lesson retest");
    assert.ok(has(items, "review", Q.reviewSession), "prepared Today's review question");
    assert.ok(has(items, "pbq", Q.pbq));
    assert.ok(has(items, "unit_check", Q.unitCheck));
    assert.ok(has(items, "comparison", Q.disc));
    assert.ok(has(items, "quiz", Q.quiz));
    assert.ok(has(items, "exam", Q.exam));
    const key = (q: string) => items.find((i) => i.question === q)?.answerKey;
    assert.equal(key(Q.disc), "Role-based access control");
    assert.equal(key(Q.quiz), "Audit log review");
    assert.equal(key(Q.exam), "Simple Queue Service");
    assert.equal(key(Q.reviewSession), "Confidentiality and integrity in transit");
    // Every kind has its own wording in the prompt block.
    const block = openItemsBlock(items, []);
    for (const phrase of ["unit check scenario", "comparison-card question", "Quiz me question", "practice exam", "PBQ", "pending review retest", "lesson question"]) {
      assert.ok(block.includes(phrase), phrase);
    }
  });

  test("each kind leaves the list once it is answered or closed", async () => {
    const u = await learnerWithEverythingOpen();
    const ins = (cols: string, vals: unknown[]) =>
      query(`insert into attempts (user_id, unit_id, ${cols}) values ($1, $2, ${vals.map((_, i) => `$${i + 3}`).join(", ")})`, [u, unit, ...vals]);
    // lesson: both items answered
    for (const [stage, q] of [["fade", Q.lessonFade], ["solo", Q.lessonSolo]]) {
      await ins("objective_id, kind, stage, format, question, answer, verdict", [oLesson, "lesson", stage, "open", q, "a", "correct"]);
    }
    await ins("objective_id, kind, stage, format, question, answer, verdict", [oReview, "lesson", "fade", "open", `${Q.reviewSolo} (fade)`, "a", "correct"]);
    // review retest: resolved
    await query(`update error_log set resolved = true where user_id = $1`, [u]);
    // Today's review question: answered
    await query(`update review_session_items si set answered_at = now() from review_sessions s where s.id = si.session_id and s.user_id = $1`, [u]);
    // PBQ: answered correctly (and no other scenario left unseen)
    await ins("pbq_scenario_id, kind, format, question, answer, verdict", [scenario, "pbq", "pbq", "IG PBQ", "a", "correct"]);
    // unit check: answered
    await ins("unit_check_item_id, kind, format, question, answer, verdict, assessment_type", [unitCheckItem, "unitcheck", "pbq", "UC", "a", "correct", "unit_check"]);
    // comparison question: answered
    await ins("objective_id, kind, stage, format, question, answer, verdict, assessment_type", [oOther, "quiz", "discriminate", "mc", Q.disc, "a", "correct", "discrimination"]);
    // quiz: closed
    await query(`update coach_quiz_turns set status = 'correct' where user_id = $1`, [u]);
    // exam: submitted
    await query(`update exam_sessions set status = 'submitted' where user_id = $1`, [u]);
    assert.deepEqual(await openItemsFor(u, track), []);
  });

  test("PBQ: the scenario guarded is the one this learner would be served next, not the unit's newest (FAIL-233)", async () => {
    const u = await newUser();
    const newer = randomUUID();
    await query(
      `insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model, generated_at)
       values ($1, $2, 'IG newer', 'IG newer scenario', '["a"]', 't', now() + interval '1 minute')`,
      [newer, unit]
    );
    try {
      await query(
        `insert into attempts (user_id, unit_id, pbq_scenario_id, kind, format, question, answer, verdict) values ($1, $2, $3, 'pbq', 'pbq', 'x', 'a', 'correct')`,
        [u, unit, newer]
      );
      const items = await openItemsFor(u, track);
      assert.ok(has(items, "pbq", Q.pbq), "after answering the newest, the older unseen one is what GET /api/pbq serves");
    } finally {
      await query(`delete from pbq_scenarios where id = $1`, [newer]);
    }
  });
});

describe("account export covers every per-learner table (REQ-112)", () => {
  test("every table with a user_id is exported or excluded with a reason", async () => {
    const tables = await query<{ table_name: string }>(
      `select distinct c.table_name from information_schema.columns c
         join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
        where c.table_schema = 'public' and c.column_name = 'user_id' and t.table_type = 'BASE TABLE'
          and c.table_name not like 'pre%'
        order by 1`
    );
    const exported = Object.values(EXPORT_SECTIONS).join("\n");
    const missing = tables
      .map((t) => t.table_name)
      .filter((t) => !new RegExp(`\\bfrom ${t}\\b|\\bjoin ${t}\\b`).test(exported) && !(t in EXPORT_EXCLUDED_TABLES));
    assert.deepEqual(missing, []);
  });
});
