// REQ-204 (FAIL-889, FAIL-890): a retired objective is not reachable. Real
// Postgres with every migration applied; the model is a fake that counts its
// calls. Two kinds of retirement are covered: a whole unit (REQ-195's CMPCBS
// units) and one objective inside a unit that stays.
//
// Every route that serves stored content, spends a model call or records an
// answer for an objective answers 404 for a retired one, with no model call
// and no row written. A control (active) objective goes through the same
// routes and is served, so the matrix is meaningful.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.ITEM_FACT_CHECK = "off";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { startOrResumeSession } from "./review-store";
import * as hint from "../app/api/objectives/[id]/hint/route";
import * as lesson from "../app/api/objectives/[id]/lesson/route";
import * as guessFeedback from "../app/api/objectives/[id]/guess-feedback/route";
import * as explainBack from "../app/api/objectives/[id]/explain-back/route";
import * as prefetch from "../app/api/objectives/[id]/lesson/prefetch-next/route";
import * as lab from "../app/api/objectives/[id]/lab/route";
import * as labQuestions from "../app/api/objectives/[id]/lab/questions/route";
import * as labReport from "../app/api/objectives/[id]/lab/report/route";
import * as refresher from "../app/api/objectives/[id]/refresher/route";
import * as progress from "../app/api/objectives/[id]/progress/route";
import * as grade from "../app/api/grade/route";
import * as report from "../app/api/items/report/route";
import * as errors from "../app/api/errors/route";
import * as pbq from "../app/api/pbq/route";
import * as unitRoute from "../app/api/units/[id]/route";
import * as unitCheck from "../app/api/units/[id]/check/route";
import { recordStudyNoticeAcceptance } from "./study-notice";

const run = Date.now().toString(36);
const track = randomUUID();
const unitOk = randomUUID(); // stays taught
const unitGone = randomUUID(); // retired as a unit
const [objActive, objSolo, objUnitGone] = [randomUUID(), randomUUID(), randomUUID()];
const scenGone = randomUUID();
const scenOk = randomUUID();
let user: string;
let modelCalls = 0;

const parsed = {
  verdict: "correct", feedback: "ok", classification: "none", missedParts: [], modelAnswer: "m", fixNext: "n",
  parts: [], rubric: { correct: true, complete: true, keyTerms: true, noMisconception: true }, misconception: null, confusedWith: null,
  guessMatch: "partial", questions: ["Q1?", "Q2?"],
};
const headers = () => ({ authorization: `Bearer ${signAccessToken({ sub: user, email: `${user}@example.test` })}`, "content-type": "application/json" });
type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
async function hit(h: unknown, method: string, params: Record<string, string>, body?: unknown, url = "http://t/x") {
  const before = modelCalls;
  const res = await (h as Handler)(new Request(url, { method, headers: headers(), body: body === undefined ? undefined : JSON.stringify(body) }), { params: Promise.resolve(params) });
  return { status: res.status, model: modelCalls - before, body: (await res.json().catch(() => null)) as any };
}
const attempts = async (o: string) => (await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1 and objective_id = $2`, [user, o]))!.n;

before(async () => {
  setAiCallSink(async () => undefined);
  __setClientForTest({
    messages: {
      create: async () => { modelCalls++; throw new Error("fake model offline"); },
      parse: async () => { modelCalls++; return { parsed_output: parsed, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }; },
    },
  } as never);
  user = randomUUID();
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `${user}@example.test`]);
  await recordStudyNoticeAcceptance(user); // REQ-205 (FAIL-907): model routes need the notice
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Retired reach', 'certification', null)`, [track, `RR${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Kept', 1, 50)`, [unitOk, track]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight, retired_at) values ($1, $2, 'Gone', 2, 50, now() - interval '1 day')`, [unitGone, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Active', 0)`, [objActive, unitOk]);
  await query(`insert into objectives (id, unit_id, title, sort_order, retired_at) values ($1, $2, 'Solo retired', 1, now() - interval '1 day')`, [objSolo, unitOk]);
  await query(`insert into objectives (id, unit_id, title, sort_order, retired_at) values ($1, $2, 'In gone unit', 0, now() - interval '1 day')`, [objUnitGone, unitGone]);
  for (const o of [objActive, objSolo, objUnitGone]) {
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1,'g','Teaching text for this objective is long enough to look real.','f?','["a","b","c","d"]',0,'w','s?','["a","b","c","d"]',0,'w','test')`,
      [o]
    );
  }
  for (const [s, u] of [[scenGone, unitGone], [scenOk, unitOk]] as const) {
    await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'PBQ', 'Do the thing', '["a","b"]'::jsonb, 't')`, [s, u]);
  }
});
after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = $1`, [user]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

const RETIRED = [
  ["objective retired on its own", () => objSolo],
  ["objective in a retired unit", () => objUnitGone],
] as const;

describe("FAIL-889: routes refuse a retired objective", () => {
  for (const [label, get] of RETIRED) {
    test(`${label}: lesson, hint, guess-feedback, explain-back, prefetch, lab, refresher, progress are 404 and call no model`, async () => {
      const id = { id: get() };
      const r = {
        lessonGet: await hit(lesson.GET, "GET", id),
        lessonPost: await hit(lesson.POST, "POST", id, {}),
        hint: await hit(hint.POST, "POST", id, { stage: "solo" }),
        guess: await hit(guessFeedback.POST, "POST", id, { guess: "my guess about it" }),
        explainGet: await hit(explainBack.GET, "GET", id),
        explain: await hit(explainBack.POST, "POST", id, { answer: "I would explain it like this, in my own words and at length." }),
        prefetch: await hit(prefetch.POST, "POST", id, {}),
        labGet: await hit(lab.GET, "GET", id),
        labQuestions: await hit(labQuestions.POST, "POST", id, {}),
        labReport: await hit(labReport.POST, "POST", id, { answers: ["a", "b"] }),
        refresher: await hit(refresher.GET, "GET", id),
        progress: await hit(progress.PUT, "PUT", id, { step: "teach", guess: "", guessFeedback: null, confidence: null, lessonKey: "k", checks: {}, savedAt: Date.now() }),
      };
      for (const [name, x] of Object.entries(r)) {
        assert.equal(x.status, 404, `${name} -> ${x.status} ${JSON.stringify(x.body)?.slice(0, 120)}`);
        assert.equal(x.model, 0, `${name} called the model`);
      }
    });

    test(`${label}: /api/grade records nothing and calls no model (mc and open)`, async () => {
      const mc = await hit(grade.POST, "POST", {}, { objectiveId: get(), stage: "fade", format: "mc", chosenIndex: 0 });
      const open = await hit(grade.POST, "POST", {}, { objectiveId: get(), stage: "fade", format: "open", answer: "an explanation of the thing in my own words" });
      assert.deepEqual([mc.status, open.status], [404, 404]);
      assert.equal(mc.model + open.model, 0);
      assert.equal(await attempts(get()), 0);
    });

    test(`${label}: "Report a problem" is not accepted`, async () => {
      const r = await hit(report.POST, "POST", {}, { kind: "lesson", objectiveId: get(), stage: "fade" });
      assert.equal(r.status, 404);
      assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from item_flags where objective_id = $1`, [get()]))!.n, 0);
    });
  }

  test("control: the active objective is served by the same routes", async () => {
    assert.equal((await hit(lesson.GET, "GET", { id: objActive })).status, 200);
    assert.equal((await hit(grade.POST, "POST", {}, { objectiveId: objActive, stage: "fade", format: "mc", chosenIndex: 0 })).status, 200);
    assert.equal((await hit(hint.POST, "POST", { id: objActive }, { stage: "solo" })).status, 200);
    assert.equal((await hit(lab.GET, "GET", { id: objActive })).status, 200);
    assert.equal((await hit(report.POST, "POST", {}, { kind: "lesson", objectiveId: objActive, stage: "fade" })).status, 200);
  });

  test("a retired unit: GET /units/:id, its check, and its PBQ scenario are 404; an active unit and scenario are served", async () => {
    assert.equal((await hit(unitRoute.GET, "GET", { id: unitGone })).status, 404);
    assert.equal((await hit(unitCheck.GET, "GET", { id: unitGone })).status, 404);
    assert.equal((await hit(unitCheck.POST, "POST", { id: unitGone }, { checkId: randomUUID(), answer: "some answer text that is long enough to be real" })).status, 404);
    assert.equal((await hit(pbq.GET, "GET", {}, undefined, `http://t/api/pbq?scenarioId=${scenGone}`)).status, 404);
    assert.equal((await hit(pbq.GET, "GET", {}, undefined, `http://t/api/pbq?unitId=${unitGone}`)).status, 404);
    const post = await hit(pbq.POST, "POST", {}, { scenarioId: scenGone, answer: "an answer long enough to be graded as real" });
    assert.equal(post.status, 404);
    assert.equal(post.model, 0);
    assert.equal((await hit(unitRoute.GET, "GET", { id: unitOk })).status, 200);
    assert.equal((await hit(pbq.GET, "GET", {}, undefined, `http://t/api/pbq?scenarioId=${scenOk}`)).status, 200);
  });
});

describe("FAIL-890: retired content stays out of review", () => {
  test("/api/errors?due=1 does not list entries for retired objectives or units (PBQ rows included)", async () => {
    const mk = (unit: string | null, obj: string | null, pbqScenario: string | null) =>
      query(
        `insert into error_log (user_id, unit_id, objective_id, pbq_scenario_id, topic, error_text, review_stage, next_review_at)
         values ($1, $2, $3, $4, $5, 'e', 0, current_date - 1)`,
        [user, unit, obj, pbqScenario, `topic-${unit?.slice(0, 4)}-${obj?.slice(0, 4)}-${pbqScenario?.slice(0, 4)}`]
      );
    await mk(unitGone, null, scenGone); // a PBQ miss in the retired unit
    await mk(unitGone, objUnitGone, null);
    await mk(unitOk, objSolo, null);
    await mk(unitOk, objActive, null);
    await mk(unitOk, null, scenOk);
    const r = await hit(errors.GET, "GET", {}, undefined, "http://t/api/errors?due=1");
    assert.equal(r.status, 200);
    const seen = (r.body.errors as { unit_id: string; objective_id: string | null; pbq_scenario_id: string | null }[]).map((e) =>
      [e.unit_id, e.objective_id ?? "", e.pbq_scenario_id ?? ""].join("|")
    );
    assert.deepEqual(seen.sort(), [`${unitOk}|${objActive}|`, `${unitOk}||${scenOk}`].sort());
  });

  test("a resumed same-day review session drops an objective retired since it was planned", async () => {
    const u = randomUUID();
    await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
    try {
      const o2 = randomUUID();
      await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Second active', 5)`, [o2, unitOk]);
      for (const o of [objActive, o2]) await query(`insert into review_schedule (user_id, objective_id, due_on, enrolled_at) values ($1, $2, current_date - 1, now() - interval '3 days')`, [u, o]);
      const first = await startOrResumeSession(u, null);
      assert.ok(first && !first.resumed);
      assert.equal((await query(`select 1 from review_session_items where session_id = $1`, [first!.id])).length, 2);
      await query(`update objectives set retired_at = now() - interval '1 hour' where id = $1`, [o2]);
      const again = await startOrResumeSession(u, null);
      assert.equal(again?.id, first!.id);
      assert.equal(again?.resumed, true);
      const left = await query<{ objective_id: string }>(`select objective_id from review_session_items where session_id = $1`, [first!.id]);
      assert.deepEqual(left.map((l) => l.objective_id), [objActive]);
      // Everything left retired: the session is closed and nothing is planned.
      await query(`update objectives set retired_at = now() - interval '1 hour' where id = $1`, [objActive]);
      assert.equal(await startOrResumeSession(u, null), null);
      assert.ok((await queryOne<{ finished_at: Date | null }>(`select finished_at from review_sessions where id = $1`, [first!.id]))?.finished_at);
      await query(`update objectives set retired_at = null where id = $1`, [objActive]);
      await query(`delete from objectives where id = $1`, [o2]);
    } finally {
      await query(`delete from app_users where id = $1`, [u]);
    }
  });

  test("the enrolment trigger does not enrol a retired objective (migration 069)", async () => {
    const u = randomUUID();
    await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
    try {
      for (const o of [objActive, objSolo, objUnitGone]) {
        await query(`insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Guided', 2)`, [u, o]);
      }
      const enrolled = await query<{ objective_id: string }>(`select objective_id from review_schedule where user_id = $1`, [u]);
      assert.deepEqual(enrolled.map((e) => e.objective_id), [objActive]);
    } finally {
      await query(`delete from app_users where id = $1`, [u]);
    }
  });
});
