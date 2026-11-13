// REQ-119 (Audit 3 product): terms acceptance, first run, learner events,
// "I took the exam" outcomes, the metrics summary, and the course-request /
// support fixes -- through their API routes against a real Postgres with
// every migration applied (048 included). No model is called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne, closePool, withTransaction } from "./db";
import { signAccessToken } from "./auth/tokens";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { CURRENT_TERMS_VERSION, LEGAL_VERSIONS, recordSignupTermsAcceptance, signupAcceptedVersion } from "./legal";
import { buildAccountExport, EXPORT_SECTIONS } from "./account-export";
import { MAX_OUTCOMES_PER_USER } from "./exam-outcomes";
import { metricsSummary, formatMetrics } from "./metrics";
import { GET as onboardingGet } from "../app/api/onboarding/route";
import { POST as termsPost } from "../app/api/onboarding/terms/route";
import { POST as legalAcceptPost } from "../app/api/legal/accept/route";
import { POST as firstRunPost } from "../app/api/onboarding/first-run/route";
import { GET as outcomesGet, POST as outcomesPost } from "../app/api/exam-outcomes/route";
import { PATCH as outcomePatch, DELETE as outcomeDelete } from "../app/api/exam-outcomes/[id]/route";
import { POST as supportPost } from "../app/api/support/route";

const run = Date.now().toString(36);
const track = randomUUID();
const privateTrack = randomUUID();
const unit = randomUUID();
const objs = [randomUUID(), randomUUID()];
const users: string[] = [];

async function newUser(createdAt?: string): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, created_at) values ($1, $2, coalesce($3::timestamptz, now()))`, [
    u,
    `pb-${run}-${users.length}@example.test`,
    createdAt ?? null,
  ]);
  return u;
}
const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const req = (u: string, url: string, method = "GET", body?: unknown) =>
  new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
const events = (u: string) =>
  query<{ event: string; track_id: string | null; objective_id: string | null; ref_id: string | null }>(
    `select event, track_id, objective_id, ref_id from learner_events where user_id = $1 order by id`,
    [u]
  );
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

function lessonAnswer(u: string, o: string, stage: "fade" | "solo") {
  return recordAttemptAndUpdateMastery({
    userId: u,
    unitId: unit,
    objectiveId: o,
    kind: "lesson",
    stage,
    format: "open",
    question: `q ${randomUUID()}`,
    answer: "a",
    verdict: "correct",
    classification: "none",
  });
}

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Product basics', 'certification', null)`, [
    track,
    `PB-${run}`,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Unit', 1)`, [unit, track]);
  for (const [i, o] of objs.entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `Objective ${i + 1}`, i + 1]);
  }
  const owner = await newUser();
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Private', 'certification', $3)`, [
    privateTrack,
    `PBP-${run}`,
    owner,
  ]);
});

after(async () => {
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, privateTrack]]);
  await closePool();
});

describe("terms acceptance (H5)", () => {
  test("a new account must accept; only the current version is accepted; the first time is kept", async () => {
    const u = await newUser();
    let s = await json(await onboardingGet(req(u, "/api/onboarding")));
    assert.equal(s.terms.needsAcceptance, true);
    assert.equal(s.terms.currentVersion, CURRENT_TERMS_VERSION);
    assert.equal(s.terms.acceptedVersion, null);

    await json(await termsPost(req(u, "/api/onboarding/terms", "POST", { version: "2020-01-01" })), 400);
    await json(await termsPost(req(u, "/api/onboarding/terms", "POST", {})), 400);
    s = await json(await termsPost(req(u, "/api/onboarding/terms", "POST", { version: CURRENT_TERMS_VERSION })));
    assert.equal(s.terms.needsAcceptance, false);
    assert.equal(s.terms.acceptedVersion, CURRENT_TERMS_VERSION);
    const first = s.terms.acceptedAt;
    s = await json(await termsPost(req(u, "/api/onboarding/terms", "POST", { version: CURRENT_TERMS_VERSION })));
    assert.equal(s.terms.acceptedAt, first);
    // Merged 2026-11-07: one row per document in legal_acceptances (027 + 052).
    const rows = await query(`select document, version, source from legal_acceptances where user_id = $1 order by document`, [u]);
    assert.deepEqual(rows, [
      { document: "privacy", version: LEGAL_VERSIONS.privacy, source: "prompt" },
      { document: "terms", version: LEGAL_VERSIONS.terms, source: "prompt" },
    ]);
  });

  test("line B's per-document form: one changed document is asked again on its own (REQ-093, merged)", async () => {
    const u = await newUser();
    await query(
      `insert into legal_acceptances (user_id, document, version, source) values ($1, 'terms', $2, 'prompt'), ($1, 'privacy', '2020-01-01', 'prompt')`,
      [u, LEGAL_VERSIONS.terms]
    );
    const s = await json(await onboardingGet(req(u, "/api/onboarding")));
    assert.equal(s.terms.needsAcceptance, true);
    assert.deepEqual(s.terms.pending, ["privacy"]);
    // POST /api/legal/accept with both versions clears it, recorded as a prompt.
    await json(await legalAcceptPost(req(u, "/api/legal/accept", "POST", { termsVersion: "2020-01-01", privacyVersion: LEGAL_VERSIONS.privacy })), 400);
    await json(await legalAcceptPost(req(u, "/api/legal/accept", "POST", { termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy })));
    const after = await json(await onboardingGet(req(u, "/api/onboarding")));
    assert.equal(after.terms.needsAcceptance, false);
    assert.deepEqual(after.terms.pending, []);
  });

  test("sign-up accepts either client form (signupAcceptedVersion)", () => {
    assert.equal(signupAcceptedVersion({ acceptedTermsVersion: CURRENT_TERMS_VERSION }), CURRENT_TERMS_VERSION);
    assert.equal(signupAcceptedVersion({ termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy }), CURRENT_TERMS_VERSION);
    assert.equal(signupAcceptedVersion({ termsVersion: "2020-01-01", privacyVersion: LEGAL_VERSIONS.privacy }), undefined);
    assert.equal(signupAcceptedVersion({}), undefined);
  });

  test("an account that accepted an older version is asked again", async () => {
    const u = await newUser();
    await query(
      `insert into legal_acceptances (user_id, document, version, source) values ($1, 'terms', '2020-01-01', 'register'), ($1, 'privacy', '2020-01-01', 'register')`,
      [u]
    );
    const s = await json(await onboardingGet(req(u, "/api/onboarding")));
    assert.equal(s.terms.needsAcceptance, true);
    assert.equal(s.terms.acceptedVersion, "2020-01-01");
  });

  test("sign-up records the current version with its source; an old or missing version records nothing", async () => {
    const a = await newUser();
    const b = await newUser();
    const c = await newUser();
    assert.equal(await recordSignupTermsAcceptance(a, CURRENT_TERMS_VERSION, "register"), true);
    assert.equal(await recordSignupTermsAcceptance(b, "2020-01-01", "google_signup"), false);
    assert.equal(await recordSignupTermsAcceptance(c, undefined, "register"), false);
    const rows = await query<{ user_id: string; source: string; document: string; version: string }>(
      `select user_id, source, document, version from legal_acceptances where user_id = any($1::uuid[]) order by document`,
      [[a, b, c]]
    );
    assert.deepEqual(rows.map((r) => [r.user_id, r.source, r.document, r.version]), [
      [a, "register", "privacy", LEGAL_VERSIONS.privacy],
      [a, "register", "terms", LEGAL_VERSIONS.terms],
    ]);
  });

  test("the register and Google sign-up routes both record the acceptance they are sent", () => {
    // Static: the routes send email / verify a Google token, which a test
    // can't do without credentials; the helper they call is tested above.
    const root = join(__dirname, "..", "app", "api", "auth");
    const register = readFileSync(join(root, "register", "route.ts"), "utf8");
    const google = readFileSync(join(root, "oauth", "google", "route.ts"), "utf8");
    // REQ-175: with the request's client context (legacy builds may accept
    // the previous version; lib/legacy-terms.dbtest.ts).
    assert.match(register, /recordSignupTermsAcceptance\(userRow\.id, acceptedTermsVersion, "register", termsCtx\)/);
    assert.match(google, /recordSignupTermsAcceptance\(user\.id, acceptedTermsVersion, "google_signup", termsCtx\)/);
    // Google: only inside the branch that creates the account.
    const created = google.indexOf("insert into app_users");
    const recorded = google.indexOf("recordSignupTermsAcceptance(user.id");
    const linked = google.indexOf("insert into oauth_accounts");
    assert.ok(created > 0 && recorded > created && recorded < linked);
  });
});

describe("first run (M2)", () => {
  test("accounts that existed before 048 are past first run; new ones need it", async () => {
    const before048 = await queryOne<{ n: number }>(
      `select count(*)::int as n from app_users u where not exists (select 1 from learner_onboarding o where o.user_id = u.id)
          and u.created_at < (select applied_at from schema_migrations where filename = '048_product_basics.sql')`
    );
    assert.equal(before048?.n, 0);
    const u = await newUser();
    const s = await json(await onboardingGet(req(u, "/api/onboarding")));
    assert.equal(s.firstRun.needed, true);
  });

  test("picking a course completes it once, with one event; a repeat changes nothing", async () => {
    const u = await newUser();
    await json(await firstRunPost(req(u, "/api/onboarding/first-run", "POST", { trackId: randomUUID() })), 404);
    await json(await firstRunPost(req(u, "/api/onboarding/first-run", "POST", { trackId: privateTrack })), 404);
    await json(await firstRunPost(req(u, "/api/onboarding/first-run", "POST", { trackId: 7 })), 400);
    await json(await firstRunPost(req(u, "/api/onboarding/first-run", "POST", { justExploring: "yes" })), 400);
    const s = await json(await firstRunPost(req(u, "/api/onboarding/first-run", "POST", { trackId: track })));
    assert.equal(s.firstRun.needed, false);
    assert.equal(s.firstRun.goalTrackId, track);
    assert.equal(s.firstRun.justExploring, false);
    const again = await json(await firstRunPost(req(u, "/api/onboarding/first-run", "POST", { justExploring: true })));
    assert.equal(again.firstRun.goalTrackId, track);
    assert.equal(again.firstRun.completedAt, s.firstRun.completedAt);
    assert.deepEqual((await events(u)).map((e) => [e.event, e.track_id]), [["first_run_completed", track]]);
  });

  test("just exploring (or skipping) also completes it", async () => {
    const u = await newUser();
    const s = await json(await firstRunPost(req(u, "/api/onboarding/first-run", "POST", { justExploring: true })));
    assert.equal(s.firstRun.needed, false);
    assert.equal(s.firstRun.justExploring, true);
    assert.equal(s.firstRun.goalTrackId, null);
  });
});

describe("learner events (M8)", () => {
  test("a lesson answer starts the lesson; a Solo answer finishes it; each once", async () => {
    const u = await newUser();
    await lessonAnswer(u, objs[0], "fade");
    await lessonAnswer(u, objs[0], "fade");
    assert.deepEqual((await events(u)).map((e) => [e.event, e.objective_id, e.track_id]), [["lesson_started", objs[0], track]]);
    await lessonAnswer(u, objs[0], "solo");
    await lessonAnswer(u, objs[0], "solo");
    assert.deepEqual(
      (await events(u)).map((e) => e.event),
      ["lesson_started", "lesson_finished"]
    );
  });

  test("a saved lesson position starts the lesson", async () => {
    const u = await newUser();
    await query(`insert into lesson_progress (user_id, objective_id, step, lesson_key) values ($1, $2, 'teach', 'k')`, [u, objs[1]]);
    assert.deepEqual((await events(u)).map((e) => [e.event, e.objective_id]), [["lesson_started", objs[1]]]);
  });

  test("a review session counts when finished with an answer; an empty one does not", async () => {
    const u = await newUser();
    const empty = await queryOne<{ id: string }>(
      `insert into review_sessions (user_id, track_id, day, size_cap) values ($1, $2, current_date, 5) returning id`,
      [u, track]
    );
    await query(`insert into review_session_items (session_id, position, objective_id) values ($1, 1, $2)`, [empty!.id, objs[0]]);
    await query(`update review_sessions set finished_at = now() where id = $1`, [empty!.id]);
    assert.deepEqual(await events(u), []);

    const done = await queryOne<{ id: string }>(
      `insert into review_sessions (user_id, track_id, day, size_cap) values ($1, $2, current_date, 5) returning id`,
      [u, track]
    );
    await query(`insert into review_session_items (session_id, position, objective_id, answered_at) values ($1, 1, $2, now())`, [done!.id, objs[0]]);
    await query(`update review_sessions set finished_at = now() where id = $1`, [done!.id]);
    await query(`update review_sessions set finished_at = now() where id = $1`, [done!.id]);
    assert.deepEqual((await events(u)).map((e) => [e.event, e.ref_id]), [["review_done", done!.id]]);
  });

  test("a submitted exam and a finished placement are recorded; a skipped placement is not", async () => {
    const u = await newUser();
    const ex = await queryOne<{ id: string }>(`insert into exam_sessions (user_id, track_id, mode) values ($1, $2, 'sprint') returning id`, [u, track]);
    await query(`update exam_sessions set status = 'submitted', submitted_at = now() where id = $1`, [ex!.id]);
    const pc = await queryOne<{ id: string }>(`insert into placement_checks (user_id, track_id) values ($1, $2) returning id`, [u, track]);
    await query(`update placement_checks set status = 'done', finished_at = now() where id = $1`, [pc!.id]);
    const v = await newUser();
    const skipped = await queryOne<{ id: string }>(`insert into placement_checks (user_id, track_id) values ($1, $2) returning id`, [v, track]);
    await query(`update placement_checks set status = 'skipped', finished_at = now() where id = $1`, [skipped!.id]);
    assert.deepEqual((await events(u)).map((e) => [e.event, e.ref_id]), [
      ["exam_taken", ex!.id],
      ["placement_done", pc!.id],
    ]);
    assert.deepEqual(await events(v), []);
  });

  test("a failure to record an event never fails the write that caused it", async () => {
    const u = await newUser();
    // An event name the table refuses: the function warns and returns.
    await query(`select learner_event_record($1, 'not_an_event', null, null, null)`, [u]);
    assert.deepEqual(await events(u), []);
  });

  test("events hold ids and times only -- no answer text or personal detail", async () => {
    const cols = await query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'learner_events' order by column_name`
    );
    // REQ-252 (078) added `detail`: a few fixed keys (level, a card number,
    // seconds, a level pair), built by the server -- never answer text. The
    // database caps it at 400 bytes; lib/learner-level.dbtest.ts checks that
    // the lesson event route drops every other key.
    assert.deepEqual(cols.map((c) => c.column_name), ["created_at", "detail", "event", "id", "objective_id", "ref_id", "track_id", "user_id"]);
    const cap = await queryOne<{ ok: boolean }>(
      `select exists(select 1 from pg_constraint where conname = 'learner_events_detail_078') as ok`
    );
    assert.equal(cap?.ok, true);
  });
});

describe("exam outcomes (I took the exam)", () => {
  test("create, read, edit and delete; the event follows the report", async () => {
    const u = await newUser();
    await json(await outcomesPost(req(u, "/api/exam-outcomes", "POST", { trackId: track, examDate: isoDay(5), result: "passed" })), 400);
    await json(await outcomesPost(req(u, "/api/exam-outcomes", "POST", { trackId: track, examDate: isoDay(-1), result: "aced" })), 400);
    await json(await outcomesPost(req(u, "/api/exam-outcomes", "POST", { trackId: track, examDate: isoDay(-1), result: "passed", score: -3 })), 400);
    await json(await outcomesPost(req(u, "/api/exam-outcomes", "POST", { trackId: privateTrack, examDate: isoDay(-1), result: "passed" })), 404);
    const { outcome } = await json(
      await outcomesPost(req(u, "/api/exam-outcomes", "POST", { trackId: track, examDate: isoDay(-1), result: "failed", score: 690 })),
      201
    );
    assert.equal(outcome.result, "failed");
    assert.equal(outcome.score, 690);
    assert.equal(outcome.track_title, "Product basics");
    assert.deepEqual((await events(u)).map((e) => [e.event, e.ref_id, e.track_id]), [["exam_outcome", outcome.id, track]]);

    const edited = await json(await outcomePatch(req(u, `/api/exam-outcomes/${outcome.id}`, "PATCH", { result: "not_said", score: null }), params(outcome.id)));
    assert.equal(edited.outcome.result, "not_said");
    assert.equal(edited.outcome.score, null);
    assert.equal(edited.outcome.exam_date, isoDay(-1));
    await json(await outcomePatch(req(u, `/api/exam-outcomes/${outcome.id}`, "PATCH", { examDate: isoDay(9) }), params(outcome.id)), 400);

    const other = await newUser();
    await json(await outcomePatch(req(other, `/api/exam-outcomes/${outcome.id}`, "PATCH", { result: "passed" }), params(outcome.id)), 404);
    await json(await outcomeDelete(req(other, `/api/exam-outcomes/${outcome.id}`, "DELETE"), params(outcome.id)), 404);
    assert.deepEqual((await json(await outcomesGet(req(other, "/api/exam-outcomes")))).outcomes, []);

    await json(await outcomeDelete(req(u, `/api/exam-outcomes/${outcome.id}`, "DELETE"), params(outcome.id)));
    assert.deepEqual(await events(u), []);
    await json(await outcomeDelete(req(u, `/api/exam-outcomes/${outcome.id}`, "DELETE"), params(outcome.id)), 404);
  });

  test("the course asks how it went once its plan's exam date has passed, until a result is in", async () => {
    const u = await newUser();
    const today = isoDay(0);
    let g = await json(await outcomesGet(req(u, `/api/exam-outcomes?trackId=${track}&today=${today}`)));
    assert.deepEqual(g.prompt, { examDate: null, ask: false });
    await query(`insert into study_plans (user_id, track_id, exam_date) values ($1, $2, $3)`, [u, track, isoDay(3)]);
    g = await json(await outcomesGet(req(u, `/api/exam-outcomes?trackId=${track}&today=${today}`)));
    assert.equal(g.prompt.ask, false);
    await query(`update study_plans set exam_date = $3 where user_id = $1 and track_id = $2`, [u, track, isoDay(-2)]);
    g = await json(await outcomesGet(req(u, `/api/exam-outcomes?trackId=${track}&today=${today}`)));
    assert.equal(g.prompt.ask, true);
    await json(await outcomesPost(req(u, "/api/exam-outcomes", "POST", { trackId: track, examDate: isoDay(-2), result: "passed" })), 201);
    g = await json(await outcomesGet(req(u, `/api/exam-outcomes?trackId=${track}&today=${today}`)));
    assert.equal(g.prompt.ask, false);
    assert.equal(g.outcomes.length, 1);
  });

  test("a learner can keep at most the cap, even when creates race", async () => {
    const u = await newUser();
    await query(
      `insert into exam_outcomes (user_id, exam_date, result) select $1, current_date, 'not_said' from generate_series(1, $2)`,
      [u, MAX_OUTCOMES_PER_USER - 2]
    );
    const results = await Promise.all(
      Array.from({ length: 5 }, () => outcomesPost(req(u, "/api/exam-outcomes", "POST", { examDate: isoDay(0), result: "passed" })))
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 409, 409, 409]);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from exam_outcomes where user_id = $1`, [u]);
    assert.equal(n?.n, MAX_OUTCOMES_PER_USER);
  });
});

describe("export and deletion", () => {
  test("the export carries the four new sections, own rows only; deleting the account removes them", async () => {
    const u = await newUser();
    const other = await newUser();
    for (const who of [u, other]) {
      await json(await termsPost(req(who, "/api/onboarding/terms", "POST", { version: CURRENT_TERMS_VERSION })));
      await json(await firstRunPost(req(who, "/api/onboarding/first-run", "POST", { trackId: track })));
      await json(await outcomesPost(req(who, "/api/exam-outcomes", "POST", { trackId: track, examDate: isoDay(0), result: "passed" })), 201);
    }
    const out = (await withTransaction((tx) => buildAccountExport(u, (sql, p) => tx.query(sql, p)), { readOnlySnapshot: true })) as Record<string, any[]>;
    for (const section of ["legalAcceptances", "onboarding", "learnerEvents", "examOutcomes"]) {
      assert.ok(section in EXPORT_SECTIONS, section);
      assert.ok(out[section].length >= 1, section);
      assert.ok(out[section].every((r) => r.user_id === u), section);
    }
    assert.deepEqual(out.learnerEvents.map((e) => e.event).sort(), ["exam_outcome", "first_run_completed"]);

    await query(`delete from app_users where id = $1`, [u]);
    for (const t of ["legal_acceptances", "learner_onboarding", "learner_events", "exam_outcomes"]) {
      const n = await queryOne<{ n: number }>(`select count(*)::int as n from ${t} where user_id = $1`, [u]);
      assert.equal(n?.n, 0, t);
    }
  });
});

describe("npm run metrics", () => {
  test("activation, D1/D7 retention and reviews per active learner from events", async () => {
    // Every account made by this file; the summary is filtered to them by
    // `since` plus fresh accounts made here with known histories.
    const since = new Date(Date.now() - 20 * 86_400_000);
    const before = await metricsSummary((sql, p) => query(sql, p), 30, since);
    const a = await newUser(new Date(Date.now() - 10 * 86_400_000).toISOString()); // activated, back on day 1 and 7
    const b = await newUser(new Date(Date.now() - 10 * 86_400_000).toISOString()); // never came back
    const ev = (u: string, event: string, daysAfterSignup: number, ref: string | null = null) =>
      query(
        `insert into learner_events (user_id, event, objective_id, ref_id, created_at)
         select $1, $2, case when $2 like 'lesson%' then $5::uuid end, $3, u.created_at + make_interval(hours => $4)
           from app_users u where u.id = $1`,
        [u, event, ref, Math.round(daysAfterSignup * 24), objs[0]]
      );
    await ev(a, "first_run_completed", 0);
    await ev(a, "lesson_finished", 0.5);
    await ev(a, "review_done", 1.5, randomUUID());
    await ev(a, "review_done", 7.5, randomUUID());
    await ev(b, "first_run_completed", 0);
    const m = await metricsSummary((sql, p) => query(sql, p), 30, since);
    assert.equal(m.cohort - before.cohort, 2);
    assert.equal(m.firstRunCompleted - before.firstRunCompleted, 2);
    assert.equal(m.activated - before.activated, 1);
    assert.equal(m.d1.eligible - before.d1.eligible, 2);
    assert.equal(m.d1.returned - before.d1.returned, 1);
    assert.equal(m.d7.eligible - before.d7.eligible, 2);
    assert.equal(m.d7.returned - before.d7.returned, 1);
    const text = formatMetrics({ ...m, cohort: 4, activated: 1, activeLast7: 2, reviewsLast7: 3 });
    assert.match(text, /Activation \(lesson in 7 days\): 25% \(1 of 4\)/);
    assert.match(text, /Reviews per active learner:\s+1\.50/);
  });
});

describe("course requests and support (Explore 'Request a course')", () => {
  test("FAIL-400: a NUL or half an emoji in a field is a 400, not a 500", async () => {
    const u = await newUser();
    const base = { kind: "course_request", subject: "Please add", body: "Details", courseName: "Kubernetes CKA" };
    for (const bad of [{ subject: "a\u0000b" }, { body: "x\uD800" }, { courseName: "CKA\u0000" }]) {
      const res = await supportPost(req(u, "/api/support", "POST", { ...base, ...bad }));
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
    await json(await supportPost(req(u, "/api/support", "POST", { ...base, courseName: "x".repeat(201) })), 400);
    const ok = await json(await supportPost(req(u, "/api/support", "POST", base)), 201);
    assert.equal(ok.request.course_name, "Kubernetes CKA");
  });

  test("FAIL-401: requests sent at once can't get past the hourly cap", async () => {
    const u = await newUser();
    const body = { kind: "course_request", subject: "Please add", body: "Details", courseName: "Something" };
    const results = await Promise.all(Array.from({ length: 14 }, () => supportPost(req(u, "/api/support", "POST", body))));
    const created = results.filter((r) => r.status === 201).length;
    assert.equal(created, 10);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from support_requests where user_id = $1`, [u]);
    assert.equal(n?.n, 10);
  });
});
