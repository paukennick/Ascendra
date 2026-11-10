// REQ-108: the review loop against a real Postgres with every migration
// applied -- enrolment, the daily session, server-side grading of review
// answers as spaced evidence, the schedule, term coverage, shared caching and
// unit gate checks. Route handlers are called directly; the model is a fake
// client that records each call and answers by what the prompt asks for.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
// REQ-114: the second-model fact-check gate has its own tests
// (lib/item-quality.dbtest.ts); here the fake model answers only the
// feature's own calls, so the gate is off, as it was before REQ-114.
process.env.ITEM_FACT_CHECK = "off";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { ownerUrl } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { presentationOrder, presentationSeed } from "./choice-order";
import { addDays, utcDay } from "./review-scheduler";
import { buildAccountExport } from "./account-export";
import { checkSchema } from "./schema-status";
import { openItemsFor } from "./coach-guard";
import { POST as sessionsPost } from "../app/api/review/sessions/route";
import { GET as sessionGet, PATCH as sessionPatch } from "../app/api/review/sessions/[id]/route";
import { POST as choicesPost } from "../app/api/review/sessions/[id]/items/[position]/choices/route";
import { POST as answerPost } from "../app/api/review/sessions/[id]/items/[position]/answer/route";
import { GET as todayGet } from "../app/api/review/today/route";
import { GET as coverageGet } from "../app/api/review/coverage/route";
import { GET as checkGet, POST as checkPost } from "../app/api/units/[id]/check/route";

const MIGRATIONS = join(__dirname, "../supabase/migrations");
const run = Date.now().toString(36);
const track = randomUUID();
const unitA = randomUUID();
const unitB = randomUUID();
const objsA: string[] = [randomUUID(), randomUUID(), randomUUID()];
const objsB: string[] = [randomUUID(), randomUUID()];
const all = [...objsA, ...objsB];
const TITLES: Record<string, string> = {
  [objsA[0]]: "Malware types: ransomware, trojan, worm, spyware",
  [objsA[1]]: "Access control models: MAC, DAC, RBAC",
  [objsA[2]]: "Choosing a firewall placement",
  [objsB[0]]: "Messaging services: SQS, SNS",
  [objsB[1]]: "Designing for failure",
};
const users: string[] = [];
const today = () => utcDay(new Date());

// ---- fake model ------------------------------------------------------------
type Call = { kind: "batch" | "grade" | "unitgen" | "pbqgrade"; body: any };
const calls: Call[] = [];
let gradeVerdict: "correct" | "partial" | "incorrect" = "correct";
// REQ-113: what the fake PBQ grader returns per sub-part (unit checks).
let pbqParts: { part: string; score: string; comment: string }[] | undefined;
let pbqMissed: string[] = [];
let generated = 0;
function systemText(body: any): string {
  return Array.isArray(body.system) ? body.system.map((b: any) => b.text).join("\n") : String(body.system);
}
function fakeParse(body: any) {
  const sys = systemText(body);
  const user = body.messages[body.messages.length - 1].content as string;
  const reply = (parsed: unknown) => ({ parsed_output: parsed, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  if (sys.includes("spaced-review questions")) {
    calls.push({ kind: "batch", body });
    const blocks = [...user.matchAll(/<objective key="([^"]+)">([\s\S]*?)<\/objective>/g)];
    return reply({
      items: blocks.map(([, key, text]) => {
        generated++;
        const target = /Test these terms in particular: (.*)/.exec(text)?.[1]?.split("; ") ?? [];
        const extract = text.includes("TERMS: extract");
        return {
          key,
          terms: extract ? ["failure domain", "blast radius", "graceful degradation"] : [],
          question: `Fresh question #${generated} (${key})`,
          choices: [`right-${generated}`, `wrong-a-${generated}`, `wrong-b-${generated}`, `wrong-c-${generated}`],
          correctIndex: 0,
          why: `why-${generated}`,
          testedTerms: target.length ? target : extract ? ["blast radius"] : [],
        };
      }),
    });
  }
  if (sys.includes("short unit check")) {
    calls.push({ kind: "unitgen", body });
    return reply({ title: `Unit check ${calls.length}`, scenario: "A new situation. 1) do this 2) do that", subParts: ["this", "that"] });
  }
  if (sys.includes("PBQ-style multi-part answer")) {
    calls.push({ kind: "pbqgrade", body });
    return reply({ verdict: gradeVerdict, feedback: `fake ${gradeVerdict}`, classification: "none", missedParts: pbqMissed, parts: pbqParts });
  }
  calls.push({ kind: "grade", body });
  return reply({ verdict: gradeVerdict, feedback: `fake ${gradeVerdict}`, classification: "none", missedParts: [] });
}

// ---- helpers ------------------------------------------------------------------
async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `rl-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u); // REQ-205: model routes need the notice
  return u;
}
const auth = (u: string) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
  "content-type": "application/json",
});
async function call(handler: Function, u: string, opts: { body?: unknown; params?: Record<string, string>; url?: string; method?: string } = {}) {
  const req = new Request(opts.url ?? "http://t/x", {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers: auth(u),
    ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
  });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  return { status: res.status as number, body: (await res.json()) as Record<string, any> };
}
const start = (u: string, trackId: string | null = track) => call(sessionsPost, u, { body: { trackId } });
const answer = (u: string, sid: string, pos: number, body: Record<string, unknown>) =>
  call(answerPost, u, { body, params: { id: sid, position: String(pos) } });
const showChoices = (u: string, sid: string, pos: number) =>
  call(choicesPost, u, { body: {}, params: { id: sid, position: String(pos) } });

// A lesson answer through the live grading path: Solo free response, correct
// and unassisted, so the objective reaches at least Guided and is enrolled.
async function study(u: string, o: string, verdict: "correct" | "incorrect" = "correct") {
  await recordAttemptAndUpdateMastery({
    userId: u,
    unitId: objsA.includes(o) ? unitA : unitB,
    objectiveId: o,
    kind: "lesson",
    stage: "solo",
    format: "open",
    question: `solo-${randomUUID()}`,
    answer: "a",
    verdict,
  });
}
const makeDue = (u: string, objectives = all) =>
  query(`update review_schedule set due_on = current_date where user_id = $1 and objective_id = any($2::uuid[])`, [u, objectives]);
const sched = (u: string, o: string) =>
  queryOne<{ step: number; due_on: string; reps: number; lapses: number }>(
    `select step, to_char(due_on, 'YYYY-MM-DD') as due_on, reps, lapses from review_schedule where user_id = $1 and objective_id = $2`,
    [u, o]
  );
const batchCalls = () => calls.filter((c) => c.kind === "batch").length;

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'RL', 'certification', null)`, [
    track,
    `RL-${run}`,
  ]);
  await query(
    `insert into course_units (id, track_id, title, sort_order, gate_description)
     values ($1, $3, 'Unit A', 1, 'Given a new incident, name the threat and the control.'), ($2, $3, 'Unit B', 2, 'Pick a messaging design and defend it.')`,
    [unitA, unitB, track]
  );
  for (const [i, o] of all.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [
      o,
      objsA.includes(o) ? unitA : unitB,
      TITLES[o],
      i,
    ]);
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
         solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1, 'g', $2, 'f', '["a","b","c","d"]', 0, 'w', 's', '["a","b","c","d"]', 0, 'w', 'test')`,
      [o, `TEACH for ${TITLES[o]}`]
    );
  }
  setAiCallSink(async () => undefined);
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: any) => fakeParse(body),
    },
  });
});

beforeEach(() => {
  gradeVerdict = "correct";
  pbqParts = undefined;
  pbqMissed = [];
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("review loop (REQ-108)", () => {
  test("reaching Guided enrols an objective for review tomorrow; Introduced does not", async () => {
    const u = await newUser();
    await study(u, objsA[0]);
    const s = await sched(u, objsA[0]);
    assert.ok(s, "enrolled");
    assert.equal(s!.step, 0);
    assert.equal(s!.due_on, addDays(today(), 1));

    await study(u, objsA[1], "incorrect");
    assert.equal(await sched(u, objsA[1]), null, "Introduced is not scheduled (the miss is in error_log)");
  });

  test("037 and 037b re-run cleanly; 037b enrols existing Guided+ rows spread over a week", async () => {
    // Replays migration SQL: an owner job (REQ-207).
    const c = new Client({ connectionString: ownerUrl(), ssl: sslOption() });
    await c.connect();
    try {
      await c.query("begin");
      const u = randomUUID();
      await c.query(`insert into app_users (id, email) values ($1, $2)`, [u, `rl-${run}-bf@example.test`]);
      // Rows written before the trigger existed: insert, then drop the
      // trigger-made schedule rows to simulate them.
      for (const o of all) {
        await c.query(`insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Independent', 3)`, [u, o]);
      }
      await c.query(`delete from review_schedule where user_id = $1`, [u]);
      await c.query(readFileSync(join(MIGRATIONS, "037_review_loop.sql"), "utf8"));
      await c.query(readFileSync(join(MIGRATIONS, "037b_review_loop_backfill.sql"), "utf8"));
      const first = (await c.query(`select objective_id, due_on::text from review_schedule where user_id = $1 order by 1`, [u])).rows;
      assert.equal(first.length, all.length);
      for (const r of first) {
        const gap = (Date.parse(r.due_on) - Date.parse(today())) / 86_400_000;
        assert.ok(gap >= 1 && gap <= 7, `due ${r.due_on} within a week`);
      }
      await c.query(readFileSync(join(MIGRATIONS, "037b_review_loop_backfill.sql"), "utf8"));
      const second = (await c.query(`select objective_id, due_on::text from review_schedule where user_id = $1 order by 1`, [u])).rows;
      assert.deepEqual(second, first, "re-run changes nothing");
    } finally {
      await c.query("rollback");
      await c.end();
    }
  });

  test("a session: capped, mixed across units, no key or choices sent, questions written in ONE batch and cached", async () => {
    const u = await newUser();
    for (const o of all) await study(u, o);
    await makeDue(u);
    const before = batchCalls();
    const r = await start(u);
    assert.equal(r.status, 200);
    const s = r.body.session;
    assert.equal(s.total, all.length);
    assert.equal(batchCalls() - before, 1, "one batched call for the session");
    const text = JSON.stringify(r.body);
    assert.ok(!/right-|wrong-|why-/.test(text), "no choices, key or explanation before answering");
    const units = s.items.map((i: any) => i.unitTitle);
    for (let i = 1; i < units.length; i++) assert.notEqual(units[i], units[i - 1], `interleaved: ${units}`);

    const cached = await query(`select objective_id, terms, source_hash from review_items where objective_id = any($1::uuid[])`, [all]);
    assert.equal(cached.length, all.length);
    assert.ok(cached.every((c) => c.source_hash.length === 32));
    const terms = await query<{ objective_id: string; method: string; terms: string[] }>(
      `select objective_id, method, terms from objective_terms where objective_id = any($1::uuid[])`,
      [all]
    );
    const byObj = new Map(terms.map((t) => [t.objective_id, t]));
    assert.deepEqual(byObj.get(objsA[0])?.terms, ["ransomware", "trojan", "worm", "spyware"]);
    assert.equal(byObj.get(objsA[0])?.method, "title");
    assert.equal(byObj.get(objsB[1])?.method, "model", "a non-list title is extracted once by the model");
    const batch = calls.filter((c) => c.kind === "batch").at(-1)!;
    assert.equal(batch.body.model, "claude-haiku-5-5", "the cheap model writes questions");

    // Same day, same scope: the same session is resumed, nothing regenerated.
    const again = await start(u);
    assert.equal(again.body.session.id, s.id);
    assert.equal(batchCalls() - before, 1);
  });

  test("a correct unassisted typed answer when due: spaced evidence, schedule climbs, terms covered, log kept", async () => {
    const u = await newUser();
    await study(u, objsA[0]);
    // The lesson answer was days ago (spacing), and the review is due today.
    await query(`update attempts set created_at = now() - interval '3 days' where user_id = $1`, [u]);
    await makeDue(u, [objsA[0]]);
    const s = (await start(u)).body.session;
    const item = s.items[0];
    assert.equal(item.objectiveId, objsA[0]);
    const r = await answer(u, s.id, item.position, { format: "open", answer: "my own words", clientAttemptId: `c-${randomUUID()}` });
    assert.equal(r.status, 200);
    assert.equal(r.body.verdict, "correct");
    assert.equal(r.body.assisted, false);
    assert.equal(r.body.advanced, true);
    assert.equal(r.body.nextDueOn, addDays(today(), 3));
    assert.ok(r.body.termsCredited.length >= 1, "the question's terms are credited");
    const grade = calls.filter((c) => c.kind === "grade").at(-1)!;
    assert.equal(grade.body.model, "claude-haiku-5-5");

    const a = await queryOne(
      `select kind, stage, format, assessment_type, assisted from attempts where user_id = $1 and kind = 'review'`,
      [u]
    );
    assert.deepEqual(a, { kind: "review", stage: "review", format: "open", assessment_type: "free_response", assisted: false });
    const d = await queryOne<{ answers: number; direct_answers: number; formats: string[]; evidence: string }>(
      `select answers, direct_answers, formats, evidence from mastery_detail($1, $2)`,
      [u, objsA[0]]
    );
    assert.equal(d!.direct_answers, 2, "the review answer is direct evidence in the weighted model");
    assert.deepEqual(d!.formats, ["free_response"]);
    const log = await queryOne<{ was_due: boolean; step_before: number; step_after: number; elapsed_days: number; scheduled_days: number }>(
      `select was_due, step_before, step_after, elapsed_days, scheduled_days from review_log where user_id = $1`,
      [u]
    );
    assert.equal(log!.was_due, true);
    assert.equal(log!.step_before, 0);
    assert.equal(log!.step_after, 1);
    assert.ok(log!.elapsed_days >= 0);
    const cov = await query(`select term from learner_term_coverage where user_id = $1`, [u]);
    assert.ok(cov.length >= 1);

    const coverage = await call(coverageGet, u, { url: `http://t/x?trackId=${track}` });
    const row = coverage.body.objectives.find((o: any) => o.objectiveId === objsA[0]);
    assert.equal(row.terms.length, 4);
    assert.equal(row.terms.filter((t: any) => t.covered).length, cov.length);

    // Replayed submit (same client id) and a second submit of the same item
    // both return the stored result; one attempt.
    const again = await answer(u, s.id, item.position, { format: "open", answer: "different text" });
    assert.equal(again.body.replayed, true);
    const n = await queryOne<{ n: number }>(`select count(*) as n from attempts where user_id = $1 and kind = 'review'`, [u]);
    assert.equal(n!.n, 1);
  });

  test("typed after Show choices is a hint: no climb, no term credit; MC needs the choices first and is graded server-side", async () => {
    const u = await newUser();
    await study(u, objsA[1]);
    await study(u, objsA[2]);
    await makeDue(u, [objsA[1], objsA[2]]);
    const s = (await start(u)).body.session;
    const [first, second] = s.items;

    const early = await answer(u, s.id, first.position, { format: "mc", chosenIndex: 0 });
    assert.equal(early.status, 400, "no multiple choice before the choices were shown");

    const shown = await showChoices(u, s.id, first.position);
    assert.equal(shown.status, 200);
    assert.equal(shown.body.choices.length, 4);
    assert.ok(!("correctIndex" in shown.body));
    const typed = await answer(u, s.id, first.position, { format: "open", answer: "x" });
    assert.equal(typed.body.assisted, true);
    assert.equal(typed.body.advanced, false);
    assert.deepEqual(typed.body.termsCredited, []);
    const a = await queryOne(`select assisted, assist_reason from attempts where user_id = $1 and kind = 'review'`, [u]);
    assert.deepEqual(a, { assisted: true, assist_reason: "hint" });

    // MC: pick the right option in this learner's shuffle.
    const choices = (await showChoices(u, s.id, second.position)).body.choices as string[];
    const right = choices.findIndex((c) => c.startsWith("right-"));
    const mc = await answer(u, s.id, second.position, { format: "mc", chosenIndex: right });
    assert.equal(mc.body.verdict, "correct");
    assert.equal(mc.body.correctIndex, right);
    // REQ-117 (FAIL-343): a pick from the shown choices is helped too; it
    // used to be recorded as unaided recall and climb to the 60-day rung.
    assert.equal(mc.body.assisted, true);
    assert.equal(mc.body.advanced, false);
    assert.equal(mc.body.nextDueOn, addDays(today(), 3), "helped and due: up one rung (capped at a week), never left past due");
    assert.deepEqual(mc.body.termsCredited, []);
    const m = await queryOne(`select assessment_type, assist_reason from attempts where user_id = $1 and kind = 'review' and format = 'mc'`, [u]);
    assert.equal(m!.assessment_type, "multiple_choice");
    assert.equal(m!.assist_reason, "hint");

    // Every item answered: the session is finished.
    const view = await call(sessionGet, u, { params: { id: s.id } });
    assert.equal(view.body.session.answered, 2);
  });

  test("a miss steps back, logs a lapse and goes to the missed-question log; the shuffle is the learner's own", async () => {
    const u = await newUser();
    await study(u, objsB[0]);
    await query(`update review_schedule set step = 2, due_on = current_date where user_id = $1 and objective_id = $2`, [u, objsB[0]]);
    const s = (await start(u)).body.session;
    gradeVerdict = "incorrect";
    const r = await answer(u, s.id, s.items[0].position, { format: "open", answer: "no idea" });
    assert.equal(r.body.verdict, "incorrect");
    const sc = await sched(u, objsB[0]);
    assert.equal(sc!.step, 1);
    assert.equal(sc!.lapses, 1);
    assert.equal(sc!.due_on, addDays(today(), 3));
    const e = await queryOne(`select review_stage from error_log where user_id = $1 and objective_id = $2`, [u, objsB[0]]);
    assert.ok(e, "the miss is in error_log");
    // The shown correct index is this learner's shuffle of the stored key.
    const q = s.items[0].question;
    const order = presentationOrder(presentationSeed(u, objsB[0], "review", q), 4);
    assert.equal(r.body.correctIndex, order.indexOf(0));
  });

  test("questions are shared: another learner reuses them with no model call; a learner never gets one they answered", async () => {
    const u1 = await newUser();
    const u2 = await newUser();
    for (const u of [u1, u2]) {
      await study(u, objsB[0]);
      await makeDue(u, [objsB[0]]);
    }
    const s1 = (await start(u1)).body.session;
    const q1 = s1.items[0].question;
    // Cover every term so the choice is free.
    await query(`insert into learner_term_coverage (user_id, objective_id, term) values ($1, $2, 'sqs'), ($1, $2, 'sns') on conflict do nothing`, [
      u2,
      objsB[0],
    ]);
    const before = batchCalls();
    const s2 = (await start(u2)).body.session;
    assert.equal(batchCalls(), before, "no generation: the cached question is reused");
    assert.ok(s2.items[0].question.startsWith("Fresh question #"));

    // u1 answers; tomorrow's question for u1 must be a different one.
    await answer(u1, s1.id, s1.items[0].position, { format: "open", answer: "a" });
    await call(sessionPatch, u1, { method: "PATCH", body: { action: "finish" }, params: { id: s1.id } });
    await query(`update review_schedule set due_on = current_date where user_id = $1`, [u1]);
    await query(
      `update review_session_items set answered_at = answered_at - interval '1 day' where session_id = $1`,
      [s1.id]
    );
    const next = (await start(u1)).body.session;
    assert.ok(next, "due again");
    assert.notEqual(next.items[0].question, q1);
  });

  test("after a rough session the next one is shorter and opens with a likely win", async () => {
    const u = await newUser();
    for (const o of all) await study(u, o);
    // A rough earlier session: 4 answered, 1 right.
    const old = await queryOne<{ id: string }>(
      `insert into review_sessions (user_id, track_id, day, size_cap, created_at, finished_at)
       values ($1, $2, current_date - 1, 12, now() - interval '1 day', now() - interval '1 day') returning id`,
      [u, track]
    );
    for (const [i, v] of ["incorrect", "incorrect", "correct", "incorrect"].entries()) {
      await query(
        `insert into review_session_items (session_id, position, objective_id, verdict, answered_at) values ($1, $2, $3, $4, now() - interval '1 day')`,
        [old!.id, i, all[i], v]
      );
    }
    await makeDue(u);
    await query(`update review_schedule set step = 4 where user_id = $1 and objective_id = $2`, [u, objsB[1]]);
    const t = await call(todayGet, u, { url: `http://t/x?trackId=${track}` });
    assert.equal(t.body.dueCount, all.length);
    assert.equal(t.body.forToday, all.length);
    const s = (await start(u)).body.session;
    assert.equal(s.gentleStart, true);
    assert.equal(s.items[0].objectiveId, objsB[1], "opens with the best-remembered objective");
  });

  test("nothing due: no session, and Today says when the next one is", async () => {
    const u = await newUser();
    await study(u, objsA[0]);
    const r = await start(u);
    assert.equal(r.body.session, null);
    const t = await call(todayGet, u, { url: `http://t/x?trackId=${track}` });
    assert.equal(t.body.forToday, 0);
    assert.equal(t.body.nextDueOn, addDays(today(), 1));
  });

  test("unit check: offered once every objective is studied, cached and shared, recorded as unitcheck evidence", async () => {
    const u = await newUser();
    await study(u, objsB[0]);
    const notYet = await call(checkGet, u, { params: { id: unitB } });
    assert.equal(notYet.body.check, null);
    assert.equal(notYet.body.status.studied, 1);
    assert.equal(notYet.body.status.total, 2);

    await study(u, objsB[1]);
    const t = await call(todayGet, u, { url: `http://t/x?trackId=${track}` });
    assert.ok(t.body.unitChecks.some((c: any) => c.unitId === unitB), "Review lists the ready unit check");
    const gens = calls.filter((c) => c.kind === "unitgen").length;
    const got = await call(checkGet, u, { params: { id: unitB } });
    assert.equal(got.status, 200);
    assert.ok(got.body.check.id);
    assert.equal(calls.filter((c) => c.kind === "unitgen").length, gens + 1);
    assert.ok(systemText(calls.filter((c) => c.kind === "unitgen").at(-1)!.body).length);
    assert.ok(
      (calls.filter((c) => c.kind === "unitgen").at(-1)!.body.messages[0].content as string).includes("Pick a messaging design"),
      "written from the gate"
    );

    gradeVerdict = "incorrect";
    const miss = await call(checkPost, u, { body: { checkId: got.body.check.id, answer: "a" }, params: { id: unitB } });
    assert.equal(miss.body.verdict, "incorrect");
    const a = await queryOne(
      `select kind, format, objective_id, unit_id, assessment_type, unit_check_item_id from attempts where user_id = $1 and kind = 'unitcheck'`,
      [u]
    );
    assert.deepEqual(a, {
      kind: "unitcheck",
      format: "pbq",
      objective_id: null,
      unit_id: unitB,
      assessment_type: "unit_check",
      unit_check_item_id: got.body.check.id,
    });
    const err = await queryOne(`select 1 from error_log where user_id = $1 and attempt_id is not null and objective_id is null`, [u]);
    assert.equal(err, null, "a missed unit check is offered again from Review, not added to the missed-question log");

    // Second learner: the same stored check, no model call.
    const u2 = await newUser();
    for (const o of objsB) await study(u2, o);
    const before = calls.filter((c) => c.kind === "unitgen").length;
    const got2 = await call(checkGet, u2, { params: { id: unitB } });
    assert.equal(got2.body.check.id, got.body.check.id);
    assert.equal(calls.filter((c) => c.kind === "unitgen").length, before);
    // u has answered it, so u gets a new one.
    const got3 = await call(checkGet, u, { params: { id: unitB } });
    assert.notEqual(got3.body.check.id, got.body.check.id);
  });

  // REQ-112 (a): migration 041 made the rule's unit branch read every
  // unit_scope type, so this test now checks the result instead of the
  // proposed one-line widening it used to try inside a rolled-back transaction.
  test("unit check evidence counts in the unit branch like a PBQ (041)", async () => {
    const u = await newUser();
    for (const o of objsA) await study(u, o);
    await query(`update attempts set created_at = now() - interval '3 days' where user_id = $1`, [u]);
    const item = await queryOne<{ id: string }>(
      `insert into unit_check_items (unit_id, gate_hash, title, scenario, sub_parts, model) values ($1, 'h', 'T', 'S', '["a"]', 't') returning id`,
      [unitA]
    );
    await query(
      `insert into attempts (user_id, unit_id, kind, format, question, answer, verdict, assessment_type, unit_check_item_id)
       values ($1, $2, 'unitcheck', 'pbq', 'T', 'a', 'correct', 'unit_check', $3)`,
      [u, unitA, item!.id]
    );
    const after = await queryOne<{ formats: string[]; status: string }>(`select formats, status from mastery_detail($1, $2)`, [u, objsA[0]]);
    // REQ-117 (FAIL-340): unit-wide answers add accuracy only, never a format.
    assert.deepEqual(after!.formats, ["free_response"]);
    assert.equal(after!.status, "Independent", "a unit check is not a second format");
    const ev = await queryOne<{ answers: number; direct_answers: number }>(`select answers, direct_answers from mastery_detail($1, $2)`, [u, objsA[0]]);
    assert.equal(ev!.answers - ev!.direct_answers, 1, "but it is counted");
  });

  // REQ-113 (Audit 3 mobile H2, FAIL-251): a unit check is graded per
  // sub-part, as a PBQ is, and the scores are stored, returned and replayed.
  // Before, only missedParts came back and the app matched label text, so a
  // reworded label showed a missed part as covered beside a failing verdict.
  test("unit check: per-part scores lined up with the check's own labels, stored and replayed", async () => {
    const u = await newUser();
    for (const o of objsB) await study(u, o);
    const got = await call(checkGet, u, { params: { id: unitB } });
    const parts: string[] = got.body.check.sub_parts;
    assert.ok(parts.length >= 2);
    gradeVerdict = "partial";
    // The grader rewords the second label and lists it as missed in its own
    // words; matched by position, the second part is missed, not "covered".
    pbqParts = parts.map((p, i) => ({ part: i === 1 ? `Part 2: ${p}.` : p, score: i === 1 ? "missed" : "met", comment: `c${i}` }));
    pbqMissed = [`Part 2: ${parts[1]}.`];
    const clientAttemptId = randomUUID();
    const res = await call(checkPost, u, { body: { checkId: got.body.check.id, answer: "my answer", clientAttemptId }, params: { id: unitB } });
    assert.equal(res.status, 200);
    assert.equal(res.body.verdict, "partial");
    assert.deepEqual(
      res.body.partScores.map((p: any) => [p.part, p.score]),
      parts.map((p, i) => [p, i === 1 ? "missed" : "met"])
    );
    assert.equal(res.body.parts, undefined, "the raw grader list is not passed through");
    const stored = await queryOne<{ part_scores: any[] }>(`select part_scores from attempts where user_id = $1 and kind = 'unitcheck'`, [u]);
    assert.equal(stored!.part_scores[1].score, "missed");
    // A resend after a dropped connection returns the same scores, no new call.
    const grades = calls.filter((c) => c.kind === "pbqgrade").length;
    const again = await call(checkPost, u, { body: { checkId: got.body.check.id, answer: "my answer", clientAttemptId }, params: { id: unitB } });
    assert.equal(calls.filter((c) => c.kind === "pbqgrade").length, grades);
    assert.equal(again.body.partScores[1].score, "missed");
    // The grader is asked for the per-part list (the PBQ schema).
    const schema = JSON.stringify(calls.filter((c) => c.kind === "pbqgrade").at(-1)!.body);
    assert.match(schema, /"parts"/);
  });

  test("unit check: a grader list that can't be lined up gives no per-part scores (the app shows 'not scored')", async () => {
    const u = await newUser();
    for (const o of objsB) await study(u, o);
    const got = await call(checkGet, u, { params: { id: unitB } });
    gradeVerdict = "incorrect";
    pbqParts = [{ part: "something else entirely", score: "met", comment: "" }];
    // A real attempt: since REQ-115 a one-word answer to a check is graded
    // without a model call (every part missed), which never reaches this path.
    const res = await call(checkPost, u, { body: { checkId: got.body.check.id, answer: "I would isolate the host and then review the logs." }, params: { id: unitB } });
    assert.equal(res.status, 200);
    assert.equal(res.body.partScores, null);
  });

  test("account export carries the review data; schema probes pass", async () => {
    const u = await newUser();
    await study(u, objsA[0]);
    const out = await buildAccountExport(u, (sql, p) => query(sql, p));
    assert.equal((out.reviewSchedule as unknown[]).length, 1);
    for (const k of ["reviewLog", "reviewSessions", "reviewSessionItems", "termCoverage"]) assert.ok(k in out);
    const status = await checkSchema((sql) => query(sql) as Promise<Array<{ ok: boolean }>>);
    assert.deepEqual(status.missing, []);
  });

  test("the coach guard treats an unanswered review question as open, with its key", async () => {
    const u = await newUser();
    await study(u, objsA[2]);
    await makeDue(u, [objsA[2]]);
    const s = (await start(u)).body.session;
    const open = await openItemsFor(u, track);
    const item = open.find((i) => i.question === s.items[0].question);
    assert.ok(item, "listed");
    assert.equal(item!.kind, "review");
    assert.ok(item!.answerKey?.startsWith("right-"));
    await answer(u, s.id, s.items[0].position, { format: "open", answer: "a" });
    assert.ok(!(await openItemsFor(u, track)).some((i) => i.question === s.items[0].question), "answered: no longer open");
  });

  test("another learner's session is not reachable", async () => {
    const u = await newUser();
    const other = await newUser();
    await study(u, objsA[0]);
    await makeDue(u, [objsA[0]]);
    const s = (await start(u)).body.session;
    assert.equal((await call(sessionGet, other, { params: { id: s.id } })).status, 404);
    assert.equal((await showChoices(other, s.id, 0)).status, 404);
    assert.equal((await answer(other, s.id, 0, { format: "open", answer: "x" })).status, 404);
  });
});
