// REQ-332: reviewer quick notes (migration 089), against a real Postgres with
// every migration applied. No model, no network.
//
//   1. A reviewer (or owner) sends a quick note with its context: stored as a
//      reviewer_feedback row of kind 'quick' with the tag, the note in
//      other_comments and the context as sent minus anything not allowed;
//      the unit and lesson titles come back when they are in the note's course.
//   2. Anyone else is refused, and nothing is stored.
//   3. Only the reviewer who sent it and the owner see it.
//   4. Bad input; editing through the full form keeps what makes it a quick note.
//   5. The table's own check; the export and deletion; 089 replays; the probe.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne, closePool } from "./db";
import { ownerClient, closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { buildAccountExport } from "./account-export";
import { checkSchema, SCHEMA_PROBES } from "./schema-status";
import { EMPTY_QUICK_NOTE_MESSAGE, NOT_A_REVIEWER_MESSAGE } from "./reviewers-config";
import { QUICK_NOTE_NEEDS_TEXT } from "./reviewers";
import { POST as reviewersPost } from "../app/api/access/reviewers/route";
import { GET as ownerFeedbackGet } from "../app/api/access/reviewer-feedback/route";
import { GET as feedbackGet, POST as feedbackPost } from "../app/api/reviewer/feedback/route";
import { GET as feedbackOneGet, PUT as feedbackPut } from "../app/api/reviewer/feedback/[id]/route";
import { POST as grantsPost } from "../app/api/access/grants/route";
import { DELETE as deleteAccount } from "../app/api/account/route";

const run = Date.now().toString(36);
const OWNER = `qn-owner-${run}@example.test`;
const COURSE = randomUUID();
const OTHER = randomUUID();
let UNIT = "";
let OBJ = "";
let OTHER_OBJ = "";
let SIM = "";
const users: string[] = [];
const ENV = ["OWNER_EMAILS", "AI_ACCESS_MODE", "BILLING_ENABLED"];

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const call = (fn: any, url: string, u: string, method = "GET", body?: unknown, params?: unknown) =>
  fn(new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) }), params ? { params: Promise.resolve(params) } : undefined) as Promise<Response>;
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
async function newUser(opts: { email?: string; name?: string } = {}): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, display_name, email_verified_at) values ($1, $2, $3, now())`, [u, opts.email ?? `qn-${run}-${users.length}@example.test`, opts.name ?? null]);
  await recordStudyNoticeAcceptance(u);
  return u;
}
const emailOf = async (u: string) => (await queryOne<{ email: string }>(`select email from app_users where id = $1`, [u]))!.email;
let ownerId = "";
async function reviewer(): Promise<string> {
  const u = await newUser();
  await json(await call(reviewersPost, "/api/access/reviewers", ownerId, "POST", { email: await emailOf(u) }));
  return u;
}
const send = (u: string, body: unknown) => call(feedbackPost, "/api/reviewer/feedback", u, "POST", body);
const quick = (extra: Record<string, unknown> = {}) => ({ kind: "quick", note: "The risk question reads as leading", ...extra });

before(async () => {
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, requires_acknowledgement)
     values ($1, $2, 'Quick note course', 'certification', null, false), ($3, $4, 'Other course', 'certification', null, false)`,
    [COURSE, `QNA-${run}`, OTHER, `QNB-${run}`]
  );
  const unit = await queryOne<{ id: string }>(`insert into course_units (track_id, title, sort_order) values ($1, 'Assessment', 0) returning id`, [COURSE]);
  UNIT = unit!.id;
  OBJ = (await queryOne<{ id: string }>(`insert into objectives (unit_id, title, sort_order) values ($1, 'Suicide risk screening', 0) returning id`, [UNIT]))!.id;
  SIM = (await queryOne<{ id: string }>(
    `insert into sims (objective_id, slug, safety_family, screen_type, title) values ($1, $2, 'clinical', 'session', 'Client at risk') returning id`,
    [OBJ, `qn-sim-${run}`]
  ))!.id;
  const otherUnit = await queryOne<{ id: string }>(`insert into course_units (track_id, title, sort_order) values ($1, 'Elsewhere', 0) returning id`, [OTHER]);
  OTHER_OBJ = (await queryOne<{ id: string }>(`insert into objectives (unit_id, title, sort_order) values ($1, 'Not this course', 0) returning id`, [otherUnit!.id]))!.id;
  ownerId = await newUser({ email: OWNER, name: "Nick" });
});

after(async () => {
  for (const k of ENV) delete process.env[k];
  await query(`delete from account_access where email like $1`, [`%${run}%`]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[COURSE, OTHER]]);
  await closeOwner();
  await closePool();
});

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  process.env.OWNER_EMAILS = OWNER;
});

describe("saving a quick note", () => {
  test("a reviewer's note mid-sim: kind, tag, the note, the course and sim linked, and the context as sent", async () => {
    const rv = await reviewer();
    const context = {
      route: `/course/${COURSE}/sim/${SIM}?title=leaked`,
      screen: "Simulation",
      unitId: UNIT,
      objectiveId: OBJ,
      simRunId: randomUUID(),
      simPhase: "assess",
      simPhaseLabel: "Risk assessment",
      simTick: 270,
      simClock: "04:30",
      answer: "never stored",
      examQuestion: -1,
    };
    const f = (await json(await send(rv, quick({ tag: "unrealistic", simId: SIM, context })))).feedback;
    assert.equal(f.kind, "quick");
    assert.equal(f.quickTag, "unrealistic");
    assert.equal(f.texts.otherComments, "The risk question reads as leading");
    assert.equal(f.trackId, COURSE, "a sim names its course");
    assert.equal(f.simTitle, "Client at risk");
    assert.equal(f.unitTitle, "Assessment");
    assert.equal(f.objectiveTitle, "Suicide risk screening");
    const { answer: _a, examQuestion: _e, ...kept } = context;
    assert.deepEqual(f.context, { ...kept, route: `/course/${COURSE}/sim/${SIM}` }, "unknown keys and bad values dropped, the query string cut");
    const row = await queryOne<{ kind: string; quick_tag: string; other_comments: string; context: unknown }>(
      `select kind, quick_tag, other_comments, context from reviewer_feedback where id = $1`,
      [f.id]
    );
    assert.equal(row!.kind, "quick");
    assert.equal(row!.quick_tag, "unrealistic");
    assert.deepEqual(row!.context, f.context);
  });

  test("an exam question and a lesson; no tag; an owner may send one too", async () => {
    const rv = await reviewer();
    const exam = (await json(await send(rv, quick({ trackId: COURSE, context: { route: `/course/${COURSE}/exam`, screen: "Practice exam", examSessionId: randomUUID(), examQuestion: 4, examQuestionCount: 10, itemKind: "exam", itemPosition: 7 } })))).feedback;
    assert.equal(exam.quickTag, null);
    assert.equal(exam.context.examQuestion, 4);
    assert.equal(exam.objectiveTitle, null);
    const own = (await json(await send(ownerId, quick({ tag: "praise", trackId: COURSE, context: { objectiveId: OBJ, lessonStage: "teach" } })))).feedback;
    assert.equal(own.kind, "quick");
    assert.equal(own.objectiveTitle, "Suicide risk screening");
    assert.equal(own.unitTitle, "Assessment", "the unit from the lesson");
  });

  test("a lesson from another course is kept as sent but never titled under this one", async () => {
    const rv = await reviewer();
    const f = (await json(await send(rv, quick({ trackId: COURSE, context: { objectiveId: OTHER_OBJ, unitId: "not-a-uuid" } })))).feedback;
    assert.equal(f.context.objectiveId, OTHER_OBJ);
    assert.equal(f.objectiveTitle, null);
    assert.equal(f.unitTitle, null);
  });

  test("bad input: no note, a bad tag, a course or sim that isn't there; a bad context loses only itself", async () => {
    const rv = await reviewer();
    const empty = await send(rv, quick({ note: "   " }));
    assert.equal(empty.status, 400);
    assert.equal((await empty.json()).error, EMPTY_QUICK_NOTE_MESSAGE);
    assert.equal((await send(rv, quick({ tag: "angry" }))).status, 400);
    assert.equal((await send(rv, quick({ note: "x".repeat(2001) }))).status, 400);
    assert.equal((await send(rv, quick({ trackId: randomUUID() }))).status, 400);
    assert.equal((await send(rv, quick({ simId: SIM, trackId: OTHER }))).status, 400);
    const f = (await json(await send(rv, quick({ context: ["not", "an", "object"] })))).feedback;
    assert.equal(f.context, null);
  });
});

describe("who may send and see quick notes", () => {
  test("a learner and an unrestricted account are refused, with nothing stored", async () => {
    const learner = await newUser();
    const granted = await newUser();
    await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: await emailOf(granted) }));
    for (const u of [learner, granted]) {
      const r = await send(u, quick({ trackId: COURSE }));
      assert.equal(r.status, 403);
      assert.equal((await r.json()).error, NOT_A_REVIEWER_MESSAGE);
    }
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from reviewer_feedback where user_id = any($1::uuid[])`, [[learner, granted]]))!.n, 0);
  });

  test("only the reviewer who sent it and the owner see it", async () => {
    const a = await reviewer();
    const b = await reviewer();
    const learner = await newUser();
    const note = (await json(await send(a, quick({ tag: "bug", trackId: COURSE, context: { route: `/course/${COURSE}`, screen: "Course page" } })))).feedback;
    // a's own list and the single read.
    assert.ok((await json(await call(feedbackGet, "/api/reviewer/feedback", a))).feedback.some((f: any) => f.id === note.id));
    assert.equal((await json(await call(feedbackOneGet, `/api/reviewer/feedback/${note.id}`, a, "GET", undefined, { id: note.id }))).feedback.quickTag, "bug");
    // b: not in their list, a 404 by id, and the owner list refused.
    assert.ok(!(await json(await call(feedbackGet, "/api/reviewer/feedback", b))).feedback.some((f: any) => f.id === note.id));
    assert.equal((await call(feedbackOneGet, `/api/reviewer/feedback/${note.id}`, b, "GET", undefined, { id: note.id })).status, 404);
    for (const u of [b, learner]) assert.equal((await call(ownerFeedbackGet, "/api/access/reviewer-feedback", u)).status, 403);
    // The owner: the tag, the context and the titles to show it.
    const all = await json(await call(ownerFeedbackGet, `/api/access/reviewer-feedback?course=${COURSE}`, ownerId));
    const seen = all.feedback.find((f: any) => f.id === note.id);
    assert.ok(seen);
    assert.equal(seen.kind, "quick");
    assert.equal(seen.quickTag, "bug");
    assert.deepEqual(seen.context, { route: `/course/${COURSE}`, screen: "Course page" });
    assert.equal(seen.trackTitle, "Quick note course");
    assert.equal(seen.reviewerEmail, await emailOf(a));
    // Full-form rows read as kind 'form' with no tag or context.
    const form = (await json(await send(a, { trackId: COURSE, recommend: "yes" }))).feedback;
    assert.equal(form.kind, "form");
    assert.equal(form.quickTag, null);
    assert.equal(form.context, null);
  });

  test("editing a quick note in the full form keeps its kind, tag and context, and needs its note", async () => {
    const a = await reviewer();
    const note = (await json(await send(a, quick({ tag: "unclear", trackId: COURSE, context: { objectiveId: OBJ } })))).feedback;
    const edited = (await json(await call(feedbackPut, `/api/reviewer/feedback/${note.id}`, a, "PUT", { trackId: COURSE, texts: { otherComments: "Clearer now?" }, ratings: { accuracy: 3 } }, { id: note.id }))).feedback;
    assert.equal(edited.kind, "quick");
    assert.equal(edited.quickTag, "unclear");
    assert.deepEqual(edited.context, { objectiveId: OBJ });
    assert.equal(edited.texts.otherComments, "Clearer now?");
    const cleared = await call(feedbackPut, `/api/reviewer/feedback/${note.id}`, a, "PUT", { trackId: COURSE, ratings: { accuracy: 3 } }, { id: note.id });
    assert.equal(cleared.status, 400);
    assert.equal((await cleared.json()).error, QUICK_NOTE_NEEDS_TEXT);
  });
});

describe("the table, the export, deletion and the schema", () => {
  test("the 089 check: a form row has no tag or context, a quick note has its text, tags and size are bounded", async () => {
    const u = await newUser();
    const bad = [
      `insert into reviewer_feedback (user_id, recommend, quick_tag) values ($1, 'yes', 'bug')`,
      `insert into reviewer_feedback (user_id, recommend, context) values ($1, 'yes', '{}'::jsonb)`,
      `insert into reviewer_feedback (user_id, kind) values ($1, 'quick')`,
      `insert into reviewer_feedback (user_id, kind, other_comments, quick_tag) values ($1, 'quick', 'x', 'angry')`,
      `insert into reviewer_feedback (user_id, kind, other_comments, context) values ($1, 'quick', 'x', '[1]'::jsonb)`,
      `insert into reviewer_feedback (user_id, kind, other_comments) values ($1, 'other', 'x')`,
      `insert into reviewer_feedback (user_id, kind, other_comments, context) values ($1, 'quick', 'x', jsonb_build_object('route', repeat(md5(random()::text), 300)))`,
    ];
    for (const sql of bad) await assert.rejects(query(sql, [u]), /reviewer_feedback_quick_089/, sql);
    await query(`insert into reviewer_feedback (user_id, kind, other_comments, quick_tag, context) values ($1, 'quick', 'fine', 'praise', '{"screen":"Home"}'::jsonb)`, [u]);
  });

  test("the export holds the kind, tag and context; deletion removes the notes", async () => {
    const rv = await reviewer();
    await json(await send(rv, quick({ tag: "sensitive", simId: SIM, context: { simPhase: "assess", simTick: 12 } })));
    const data = (await buildAccountExport(rv, (sql, p) => query(sql, p))) as any;
    assert.equal(data.reviewerFeedback.length, 1);
    const row = data.reviewerFeedback[0];
    assert.equal(row.kind, "quick");
    assert.equal(row.quick_tag, "sensitive");
    assert.deepEqual(row.context, { simPhase: "assess", simTick: 12 });
    assert.equal(row.other_comments, "The risk question reads as leading");
    assert.equal(row.sim_title, "Client at risk");
    const res = await call(deleteAccount, "/api/account", rv, "DELETE", {});
    assert.equal(res.status, 200, await res.clone().text());
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from reviewer_feedback where user_id = $1`, [rv]))!.n, 0);
  });

  test("089 replays cleanly over existing rows, and its probe passes", async () => {
    const owner = await ownerClient();
    try {
      for (let i = 0; i < 2; i++) {
        const sql = readFileSync(join(import.meta.dirname, "../supabase/migrations/089_reviewer_quick_notes.sql"), "utf8");
        await owner.query("begin");
        await owner.query(sql);
        await owner.query("commit");
      }
      const c = await owner.query(`select convalidated from pg_constraint where conname = 'reviewer_feedback_quick_089'`);
      assert.equal(c.rowCount, 1);
      assert.equal(c.rows[0].convalidated, true);
    } finally {
      owner.release();
    }
    const probes = SCHEMA_PROBES.filter((p) => p.migration === "089_reviewer_quick_notes.sql");
    assert.equal(probes.length, 1);
    const status = await checkSchema((sql) => query(sql), probes);
    assert.equal(status.current, true, JSON.stringify(status));
  });
});
