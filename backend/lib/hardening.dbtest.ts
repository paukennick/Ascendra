// REQ-098 (audit 2 hardening) against a real Postgres. Locally:
//   DATABASE_URL=postgresql://postgres@localhost:55432/<db> PGSSLMODE=disable npm run test:db
// Every race here fires the same request concurrently and fails on the code
// before REQ-098; every input bug has a boundary test. Route handlers are
// called directly; nothing calls the model.
process.env.AUTH_JWT_SECRET ??= "hardening-test-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto, { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { query, queryOne, withTransaction, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { consumeRateLimit, RateLimitError } from "./auth/rateLimit";
import { createLoginChallenge } from "./auth/mfaChallenge";
import { recordAttemptAndUpdateMastery, recordAttemptIdempotent, IdempotencyConflictError } from "./grading-service";
import { accuracyFromAttempts, suggestStatus } from "./mastery";
import { startOrTouchSession } from "./study-sessions";
import { saveChatTurn, findChatTurn, findChatReply, ChatIdConflictError } from "./chat-store";
import { buildAccountExport, exportSectionPage } from "./account-export";
import { ensureGeneration, type GenerationHandle, type LessonGenerator, type ObjectiveRow } from "./lesson-generation";
import { tryClaim, isClaimLive, getOverrideLesson } from "./lesson-store";
import { MAX_PROGRESS_ROWS } from "./lesson-progress";
import { GENERIC_SERVER_ERROR, serverError } from "./http";
import { POST as loginPost } from "../app/api/auth/login/route";
import { POST as mfaVerify } from "../app/api/auth/mfa/verify/route";
import { POST as mfaDisable } from "../app/api/auth/mfa/disable/route";
import { POST as resetPassword } from "../app/api/auth/reset-password/route";
import { POST as gradePost } from "../app/api/grade/route";
import { POST as chatPost, GET as chatGet } from "../app/api/chat/route";
import { GET as progressGet, PUT as progressPut, DELETE as progressDelete } from "../app/api/objectives/[id]/progress/route";
import { PATCH as errorsPatch } from "../app/api/errors/[id]/route";
import { GET as sessionsGet, POST as sessionsPost } from "../app/api/sessions/route";
import { GET as lessonGet } from "../app/api/objectives/[id]/lesson/route";
import { POST as prefetchPost } from "../app/api/objectives/[id]/lesson/prefetch-next/route";
import { GET as healthGet } from "../app/api/health/route";
import { GET as exportGet } from "../app/api/account/export/route";

const run = Date.now().toString(36);
// Generated per run so no credential-like literal sits in the source.
const GOOD_SECRET = randomUUID();
const BAD_SECRET = randomUUID();
const users: string[] = [];
const tracks: string[] = [];
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const count = (xs: number[], s: number) => xs.filter((x) => x === s).length;

async function makeUser(tag: string, extra: { password?: string; mfa?: boolean } = {}) {
  const id = randomUUID();
  const email = `hd-${run}-${tag}@example.test`;
  const hash = extra.password ? await bcrypt.hash(extra.password, 4) : null;
  await query(
    `insert into app_users (id, email, password_hash, email_verified_at, totp_secret_enc, email_mfa_enabled, mfa_enabled)
     values ($1, $2, $3, now(), null, $4, $4)`,
    [id, email, hash, extra.mfa ?? false]
  );
  users.push(id);
  return { id, email };
}

// A private track owned by `owner` with `n` objectives in one unit.
async function makeCourse(owner: string, n: number) {
  const track = randomUUID();
  const unit = randomUUID();
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Hardening', 'certification', $3)`,
    [track, `HD-${run}-${tracks.length}`, owner]
  );
  tracks.push(track);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  const objectives: string[] = [];
  for (let i = 0; i < n; i++) {
    const o = randomUUID();
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `O${i}`, i]);
    objectives.push(o);
  }
  return { track, unit, objectives };
}

const authHeader = (u: { id: string; email: string }) => ({
  authorization: `Bearer ${signAccessToken({ sub: u.id, email: u.email })}`,
});
function jsonReq(body: unknown, headers: Record<string, string> = {}, method = "POST"): Request {
  return new Request("http://localhost/test", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const ctxFor = (id: string) => ({ params: Promise.resolve({ id }) });

after(async () => {
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [tracks]);
  await query(`delete from auth_events where user_id = any($1::uuid[]) or identifier = any($2::text[])`, [
    users,
    users,
  ]);
  await query(`delete from auth_events where identifier like $1`, [`hd-${run}-%`]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

// ---------------------------------------------------------------- item 1/2
describe("errors and /api/health", () => {
  test("serverError returns a generic message and a request id, never the driver's text", async () => {
    const res = serverError(new Error('password authentication failed for user "postgres.secretref"'));
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, GENERIC_SERVER_ERROR);
    assert.match(body.requestId, /^[0-9a-f-]{36}$/);
    assert.doesNotMatch(JSON.stringify(body), /secretref|postgres/);
  });

  test("health answers 200 with the current schema, including under a burst of hits", async () => {
    const first = await healthGet();
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { status: "ok", schema: "current" });
    const many = await Promise.all(Array.from({ length: 25 }, () => healthGet()));
    assert.ok(many.every((r) => r.status === 200));
  });
});

// ---------------------------------------------------------------- item 3
describe("rate limiter is atomic", () => {
  test("20 concurrent consumes with max 5: exactly 5 get through and 5 events are recorded", async () => {
    const id = `hd-${run}-rl`;
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => consumeRateLimit("hd_test", id, { max: 5, windowMinutes: 10 }))
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 5);
    for (const r of results) if (r.status === "rejected") assert.ok(r.reason instanceof RateLimitError);
    const n = await queryOne<{ n: number }>(
      `select count(*)::int as n from auth_events where event_type = 'hd_test' and identifier = $1`,
      [id]
    );
    assert.equal(n!.n, 5);
  });

  test("MFA verify: 20 concurrent wrong guesses on one challenge get at most 8 checks", async () => {
    const u = await makeUser("mfa-verify", { mfa: true });
    const token = await createLoginChallenge(u.id, {});
    const res = await Promise.all(
      Array.from({ length: 20 }, () => mfaVerify(jsonReq({ challengeToken: token, code: "000000" })))
    );
    const statuses = res.map((r) => r.status);
    assert.equal(count(statuses, 401), 8, `statuses: ${statuses.join(",")}`);
    assert.equal(count(statuses, 429), 12);
    await query(`delete from auth_events where identifier = $1`, [sha(token)]);
  });
});

// ---------------------------------------------------------------- item 4
describe("login lockout", () => {
  test("20 concurrent wrong passwords run at most 5 checks and lock the account", async () => {
    const u = await makeUser("lockout", { password: GOOD_SECRET });
    const res = await Promise.all(
      Array.from({ length: 20 }, () => loginPost(jsonReq({ email: u.email, password: BAD_SECRET })))
    );
    const statuses = res.map((r) => r.status);
    assert.equal(count(statuses, 401), 5, `statuses: ${statuses.join(",")}`);
    assert.equal(count(statuses, 423), 15);
    const row = await queryOne<{ failed_login_count: number; locked: boolean }>(
      `select failed_login_count, locked_until > now() as locked from app_users where id = $1`,
      [u.id]
    );
    assert.equal(row!.locked, true);
    // Even the right password is refused while locked.
    assert.equal((await loginPost(jsonReq({ email: u.email, password: GOOD_SECRET }))).status, 423);
    // Once the lock expires the right password works and clears the count.
    await query(`update app_users set locked_until = now() - interval '1 second' where id = $1`, [u.id]);
    assert.equal((await loginPost(jsonReq({ email: u.email, password: GOOD_SECRET }))).status, 200);
    const after = await queryOne<{ failed_login_count: number; locked_until: string | null }>(
      `select failed_login_count, locked_until from app_users where id = $1`,
      [u.id]
    );
    assert.deepEqual(after, { failed_login_count: 0, locked_until: null });
  });

  test("a correct password before the limit resets the count", async () => {
    const u = await makeUser("lockout-reset", { password: GOOD_SECRET });
    for (let i = 0; i < 3; i++) await loginPost(jsonReq({ email: u.email, password: BAD_SECRET }));
    assert.equal((await loginPost(jsonReq({ email: u.email, password: GOOD_SECRET }))).status, 200);
    const row = await queryOne<{ failed_login_count: number }>(`select failed_login_count from app_users where id = $1`, [
      u.id,
    ]);
    assert.equal(row!.failed_login_count, 0);
  });
});

// ---------------------------------------------------------------- item 5
describe("MFA disable is rate limited", () => {
  test("12 concurrent wrong passwords: 10 checked, 2 refused with 429", async () => {
    const u = await makeUser("mfa-disable", { password: GOOD_SECRET });
    const res = await Promise.all(
      Array.from({ length: 12 }, () => mfaDisable(jsonReq({ password: BAD_SECRET }, authHeader(u))))
    );
    const statuses = res.map((r) => r.status);
    assert.equal(count(statuses, 401), 10, `statuses: ${statuses.join(",")}`);
    assert.equal(count(statuses, 429), 2);
  });
});

// ---------------------------------------------------------------- item 6
describe("mixed-case uuids share one lock", () => {
  test("two concurrent wrong answers, one with an uppercase objective id, leave mastery current (10 trials)", async () => {
    const u = await makeUser("mixed-grade");
    const { unit, objectives } = await makeCourse(u.id, 10);
    const expected = suggestStatus({
      acc: accuracyFromAttempts([{ verdict: "correct" }, { verdict: "incorrect" }, { verdict: "incorrect" }]),
      lastFormat: "mc",
      lastVerdict: "incorrect",
    });
    const stale = suggestStatus({
      acc: accuracyFromAttempts([{ verdict: "correct" }, { verdict: "incorrect" }]),
      lastFormat: "mc",
      lastVerdict: "incorrect",
    });
    assert.notEqual(expected, stale, "the test needs the stale and current statuses to differ");
    const base = { userId: u.id, unitId: unit, kind: "lesson" as const, stage: "fade", format: "mc" as const, question: "Q" };
    let staleCount = 0;
    for (const o of objectives) {
      await recordAttemptAndUpdateMastery({ ...base, objectiveId: o, answer: "a", verdict: "correct" });
      await Promise.all([
        recordAttemptAndUpdateMastery({ ...base, objectiveId: o, answer: "b", verdict: "incorrect" }),
        recordAttemptAndUpdateMastery({ ...base, objectiveId: o.toUpperCase(), answer: "c", verdict: "incorrect" }),
      ]);
      const m = await queryOne<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = $2`, [
        u.id,
        o,
      ]);
      if (m!.status !== expected) staleCount++;
    }
    assert.equal(staleCount, 0, `mastery was stale in ${staleCount} of ${objectives.length} trials`);
  });

  test("15 trials of concurrent session starts with mixed-case track ids leave one open session each", async () => {
    const u = await makeUser("mixed-session");
    for (let i = 0; i < 15; i++) {
      const { track } = await makeCourse(u.id, 0);
      await Promise.all([
        startOrTouchSession(u.id, track),
        startOrTouchSession(u.id, track.toUpperCase()),
        startOrTouchSession(u.id, track),
        startOrTouchSession(u.id, track.toUpperCase()),
      ]);
      const open = await queryOne<{ n: number }>(
        `select count(*)::int as n from study_sessions where user_id = $1 and track_id = $2 and ended_at is null`,
        [u.id, track]
      );
      assert.equal(open!.n, 1, `trial ${i}`);
    }
  });

  test("the sessions route and grade route accept uppercase ids and treat them as the same row", async () => {
    const u = await makeUser("mixed-route");
    const { track, unit, objectives } = await makeCourse(u.id, 1);
    const a = await sessionsPost(jsonReq({ trackId: track.toUpperCase() }, authHeader(u)));
    const b = await sessionsPost(jsonReq({ trackId: track }, authHeader(u)));
    assert.deepEqual([a.status, b.status], [201, 200]);
    // objectiveId lowercase + unitId uppercase used to be a false 400.
    const g = await gradePost(
      jsonReq(
        { format: "mc", kind: "lesson", stage: "fade", objectiveId: objectives[0], unitId: unit.toUpperCase(), question: "Q", chosenIndex: 0, correctIndex: 0, chosenText: "a" },
        authHeader(u)
      )
    );
    assert.equal(g.status, 200);
  });
});

// ---------------------------------------------------------------- item 7
describe("NUL characters and lone surrogates are 400s, not 500s", () => {
  test("grade: NUL in question or answer, bad kind, long stage, bad confidence -> 400", async () => {
    const u = await makeUser("nul-grade");
    const { objectives } = await makeCourse(u.id, 1);
    const base = { format: "mc", kind: "lesson", stage: "fade", objectiveId: objectives[0], question: "Q", chosenIndex: 0, correctIndex: 0, chosenText: "a" };
    for (const bad of [
      { question: "Q\u0000" },
      { chosenText: "a\u0000" },
      { chosenText: "half an emoji \uD83D" },
      { kind: "bogus" },
      { stage: "s".repeat(51) },
      { confidence: 9 },
      { confidence: 3.5 },
      { confidence: "abc" },
      { question: "q".repeat(8_001) },
    ]) {
      const res = await gradePost(jsonReq({ ...base, ...bad }, authHeader(u)));
      assert.equal(res.status, 400, JSON.stringify(bad).slice(0, 60));
    }
    // Boundary: exactly at the caps is fine.
    const okRes = await gradePost(jsonReq({ ...base, question: "q".repeat(8_000), stage: "s".repeat(50), confidence: 5 }, authHeader(u)));
    assert.equal(okRes.status, 200);
  });

  test("chat: NUL in the message -> 400; over the cap -> 400", async () => {
    const u = await makeUser("nul-chat");
    const { track } = await makeCourse(u.id, 0);
    assert.equal((await chatPost(jsonReq({ trackId: track, message: "hi\u0000" }, authHeader(u)))).status, 400);
    assert.equal((await chatPost(jsonReq({ trackId: track, message: "x".repeat(16_001) }, authHeader(u)))).status, 400);
    // A non-uuid track id on GET is 404, not 500.
    const g = await chatGet(new Request(`http://t/x?trackId=not-a-uuid`, { headers: authHeader(u) }));
    assert.equal(g.status, 404);
  });

  test("progress: NUL and an emoji cut at the 8000 limit are cleaned and saved, not a 500", async () => {
    const u = await makeUser("nul-progress");
    const { objectives } = await makeCourse(u.id, 1);
    const longAnswer = "a".repeat(7_999) + "😀" + "tail"; // the emoji straddles index 8000
    const body = {
      step: "solo",
      guess: "my\u0000guess",
      lessonKey: "k1",
      checks: { solo: { mode: "open", openAnswer: longAnswer, sentSignature: "open:x", result: null } },
    };
    const res = await progressPut(jsonReq(body, authHeader(u), "PUT"), ctxFor(objectives[0]));
    assert.equal(res.status, 200);
    const got = await (await progressGet(new Request("http://t/x", { headers: authHeader(u) }), ctxFor(objectives[0]))).json();
    assert.equal(got.progress.guess, "myguess");
    assert.equal(got.progress.checks.solo.openAnswer, "a".repeat(7_999));
    // A NUL in lessonKey is rejected.
    const bad = await progressPut(jsonReq({ ...body, lessonKey: "k\u0000" }, authHeader(u), "PUT"), ctxFor(objectives[0]));
    assert.equal(bad.status, 400);
  });

  test("non-uuid ids on progress GET/DELETE and sessions GET answer cleanly", async () => {
    const u = await makeUser("nonuuid");
    const g = await progressGet(new Request("http://t/x", { headers: authHeader(u) }), ctxFor("nope"));
    assert.equal(g.status, 200);
    assert.deepEqual(await g.json(), { progress: null });
    const d = await progressDelete(new Request("http://t/x", { method: "DELETE", headers: authHeader(u) }), ctxFor("nope"));
    assert.equal(d.status, 200);
    const s = await sessionsGet(new Request("http://t/x?trackId=nope", { headers: authHeader(u) }));
    assert.equal(s.status, 200);
  });
});

// ---------------------------------------------------------------- item 8
describe("idempotency ids are bound to the submission", () => {
  test("chat replay returns this message's own reply even when another turn landed in between", async () => {
    const u = await makeUser("chat-replay");
    const { track } = await makeCourse(u.id, 0);
    const slow = `SLOW-${run}`;
    await query(`create or replace function hd_slow_insert() returns trigger language plpgsql as $$
      begin if new.content = '${slow}' then perform pg_sleep(0.6); end if; return new; end $$`);
    await query(`drop trigger if exists hd_slow on chat_messages`);
    await query(`create trigger hd_slow before insert on chat_messages for each row execute function hd_slow_insert()`);
    try {
      const id1 = `hd-${run}-c1`;
      const id2 = `hd-${run}-c2`;
      const first = saveChatTurn({ userId: u.id, trackId: track, message: slow, reply: "REPLY-TO-1", clientMessageId: id1 });
      await sleep(150);
      await saveChatTurn({ userId: u.id, trackId: track, message: "fast", reply: "REPLY-TO-2", clientMessageId: id2 });
      await first;
    } finally {
      await query(`drop trigger if exists hd_slow on chat_messages`);
      await query(`drop function if exists hd_slow_insert()`);
    }
    assert.equal(await findChatReply(u.id, `hd-${run}-c1`), "REPLY-TO-1");
    assert.equal(await findChatReply(u.id, `hd-${run}-c2`), "REPLY-TO-2");
  });

  test("chat: the same id with a different message or track is a 409; the same message replays", async () => {
    const u = await makeUser("chat-409");
    const t1 = await makeCourse(u.id, 0);
    const t2 = await makeCourse(u.id, 0);
    const id = `hd-${run}-c409`;
    await saveChatTurn({ userId: u.id, trackId: t1.track, message: "original", reply: "R1", clientMessageId: id });
    const same = await chatPost(jsonReq({ trackId: t1.track.toUpperCase(), message: "original", clientMessageId: id }, authHeader(u)));
    assert.equal(same.status, 200);
    assert.deepEqual(await same.json(), { reply: "R1", replayed: true });
    const diffMsg = await chatPost(jsonReq({ trackId: t1.track, message: "different", clientMessageId: id }, authHeader(u)));
    assert.equal(diffMsg.status, 409);
    const diffTrack = await chatPost(jsonReq({ trackId: t2.track, message: "original", clientMessageId: id }, authHeader(u)));
    assert.equal(diffTrack.status, 409);
    // The storage race path refuses a mismatched duplicate too.
    await assert.rejects(
      saveChatTurn({ userId: u.id, trackId: t1.track, message: "different", reply: "R2", clientMessageId: id }),
      ChatIdConflictError
    );
    assert.equal((await findChatTurn(u.id, id))!.reply, "R1");
  });

  test("grade: the same id with a different answer is a 409 and records nothing new", async () => {
    const u = await makeUser("grade-409");
    const { objectives } = await makeCourse(u.id, 2);
    const id = `hd-${run}-g409`;
    const body = { clientAttemptId: id, format: "mc", kind: "lesson", stage: "fade", objectiveId: objectives[0], question: "Q", chosenIndex: 0, correctIndex: 0, chosenText: "a" };
    assert.equal((await gradePost(jsonReq(body, authHeader(u)))).status, 200);
    const replay = await gradePost(jsonReq({ ...body, objectiveId: objectives[0].toUpperCase() }, authHeader(u)));
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).replayed, true);
    assert.equal((await gradePost(jsonReq({ ...body, chosenIndex: 1, chosenText: "b" }, authHeader(u)))).status, 409);
    assert.equal((await gradePost(jsonReq({ ...body, objectiveId: objectives[1] }, authHeader(u)))).status, 409);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1`, [u.id]);
    assert.equal(n!.n, 1);
  });

  test("10 concurrent submissions with one id and different answers: one attempt, the rest conflict", async () => {
    const u = await makeUser("grade-race-409");
    const { unit, objectives } = await makeCourse(u.id, 1);
    const id = `hd-${run}-race`;
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        recordAttemptIdempotent({
          userId: u.id, unitId: unit, objectiveId: objectives[0], kind: "lesson", stage: "fade", format: "mc",
          question: "Q", answer: `answer-${i}`, verdict: "incorrect", clientAttemptId: id,
        })
      )
    );
    const won = results.filter((r) => r.status === "fulfilled" && r.value.attempt);
    const conflicts = results.filter((r) => r.status === "rejected" && r.reason instanceof IdempotencyConflictError);
    assert.equal(won.length, 1);
    assert.equal(conflicts.length, 9);
  });
});

// ---------------------------------------------------------------- item 9
describe("lesson progress bounds", () => {
  test("a body over the cap is a 400; fromStage out of 0..3 is a 400", async () => {
    const u = await makeUser("progress-cap");
    const { objectives } = await makeCourse(u.id, 1);
    const huge = { step: "teach", lessonKey: "k", guess: "g".repeat(100_001) };
    assert.equal((await progressPut(jsonReq(huge, authHeader(u), "PUT"), ctxFor(objectives[0]))).status, 400);
    const e = await queryOne<{ id: string }>(
      `insert into error_log (user_id, topic, error_text, review_stage, next_review_at) values ($1, 't', 'e', 0, current_date) returning id`,
      [u.id]
    );
    for (const fromStage of [2 ** 31, 4, -1, 1.5]) {
      const r = await errorsPatch(jsonReq({ action: "reviewed", fromStage }, authHeader(u), "PATCH"), ctxFor(e!.id));
      assert.equal(r.status, 400, String(fromStage));
    }
    const okRes = await errorsPatch(jsonReq({ action: "reviewed", fromStage: 0 }, authHeader(u), "PATCH"), ctxFor(e!.id));
    assert.equal(okRes.status, 200);
  });

  test(`a learner keeps at most ${MAX_PROGRESS_ROWS} positions, and none older than the age limit`, async () => {
    const u = await makeUser("progress-rows");
    const { objectives } = await makeCourse(u.id, MAX_PROGRESS_ROWS + 5);
    for (const o of objectives.slice(0, MAX_PROGRESS_ROWS + 4)) {
      await query(
        `insert into lesson_progress (user_id, objective_id, step, lesson_key, updated_at)
         values ($1, $2, 'teach', 'k', now() - interval '1 hour')`,
        [u.id, o]
      );
    }
    await query(`update lesson_progress set updated_at = now() - interval '30 days' where user_id = $1 and objective_id = $2`, [
      u.id,
      objectives[0],
    ]);
    const last = objectives[MAX_PROGRESS_ROWS + 4];
    const res = await progressPut(jsonReq({ step: "teach", lessonKey: "k" }, authHeader(u), "PUT"), ctxFor(last));
    assert.equal(res.status, 200);
    const n = await queryOne<{ n: number; has_last: boolean; has_old: boolean }>(
      `select count(*)::int as n, bool_or(objective_id = $2) as has_last, bool_or(objective_id = $3) as has_old
         from lesson_progress where user_id = $1`,
      [u.id, last, objectives[0]]
    );
    assert.equal(n!.n, MAX_PROGRESS_ROWS);
    assert.equal(n!.has_last, true);
    assert.equal(n!.has_old, false);
  });

  test("GET returns ageMs measured on the database clock", async () => {
    const u = await makeUser("progress-age");
    const { objectives } = await makeCourse(u.id, 1);
    await query(
      `insert into lesson_progress (user_id, objective_id, step, lesson_key, updated_at) values ($1, $2, 'teach', 'k', now() - interval '90 seconds')`,
      [u.id, objectives[0]]
    );
    const got = await (await progressGet(new Request("http://t/x", { headers: authHeader(u) }), ctxFor(objectives[0]))).json();
    assert.ok(got.progress.ageMs >= 89_000 && got.progress.ageMs < 120_000, String(got.progress.ageMs));
  });
});

// ---------------------------------------------------------------- item 10
describe("lesson generation is bounded per learner", () => {
  test("over the budget, a lesson GET on an uncached objective is 429 and prefetch skips, with no model call", async () => {
    const u = await makeUser("gen-limit");
    const { objectives } = await makeCourse(u.id, 2);
    for (let i = 0; i < 20; i++) {
      await query(`insert into auth_events (event_type, identifier, user_id) values ('lesson_generate', $1::text, $1::uuid)`, [u.id]);
    }
    const g = await lessonGet(new Request("http://t/x", { headers: authHeader(u) }), ctxFor(objectives[1]));
    assert.equal(g.status, 429);
    const p = await prefetchPost(new Request("http://t/x", { method: "POST", headers: authHeader(u) }), ctxFor(objectives[0]));
    assert.equal(p.status, 200);
    assert.equal((await p.json()).status, "rate-limited");
  });
});

// ---------------------------------------------------------------- item 11
describe("password reset spends every outstanding credential", () => {
  test("a second reset link, and a pending MFA challenge, stop working after a reset", async () => {
    const u = await makeUser("reset-all", { password: GOOD_SECRET });
    const t1 = `hd-${run}-reset-1`;
    const t2 = `hd-${run}-reset-2`;
    for (const t of [t1, t2]) {
      await query(`insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + interval '1 hour')`, [
        u.id,
        sha(t),
      ]);
    }
    const challenge = await createLoginChallenge(u.id, {});
    assert.equal((await resetPassword(jsonReq({ token: t1, newPassword: `n-${GOOD_SECRET}` }))).status, 200);
    assert.equal((await resetPassword(jsonReq({ token: t2, newPassword: `a-${GOOD_SECRET}` }))).status, 400);
    const c = await queryOne<{ consumed: boolean }>(
      `select consumed_at is not null as consumed from login_challenges where challenge_token_hash = $1`,
      [sha(challenge)]
    );
    assert.equal(c!.consumed, true);
  });
});

// ---------------------------------------------------------------- item 12
describe("generation lease heartbeat", () => {
  const intro = { guessPrompt: "g", teach: "t" };
  const practice = {
    fadeProblem: "f", fadeChoices: ["a", "b", "c", "d"], fadeCorrectIndex: 0, fadeWhy: "w",
    soloCheck: "s", soloChoices: ["a", "b", "c", "d"], soloCorrectIndex: 1, soloWhy: "w",
  };
  const objRow: ObjectiveRow = { title: "O", unit_title: "U", track_title: "T", ctx: null };

  test("a generation running past its lease keeps it: a second instance cannot take over", async () => {
    const u = await makeUser("lease");
    const { objectives } = await makeCourse(u.id, 1);
    const o = objectives[0];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const gen: LessonGenerator = {
      intro: async () => { await gate; return intro; },
      practice: async () => { await gate; return practice; },
      model: () => "test",
    };
    const pending = new Map<string, GenerationHandle>();
    const handle = ensureGeneration(o, objRow, { scope: { kind: "shared" }, generator: gen, pending, heartbeatMs: 40 });
    await sleep(50);
    // Pretend the generation has been running for 200 s (lease is 120 s).
    await query(`update lesson_generation_claims set claimed_at = now() - interval '200 seconds' where objective_id = $1`, [o]);
    await sleep(150);
    assert.equal(await isClaimLive(o, { kind: "shared" }), true, "the heartbeat renewed the lease");
    assert.equal(await tryClaim(o, { kind: "shared" }, randomUUID()), false, "no takeover of a live lease");
    release();
    await handle.fullPromise;
  });

  test("a learner's regenerate that lost its lease does not overwrite the new holder's result", async () => {
    const u = await makeUser("lease-lost");
    const { objectives } = await makeCourse(u.id, 1);
    const o = objectives[0];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const gen: LessonGenerator = {
      intro: async () => intro,
      practice: async () => { await gate; return practice; },
      model: () => "test",
    };
    const handle = ensureGeneration(o, objRow, {
      scope: { kind: "user", userId: u.id }, generator: gen, pending: new Map(), heartbeatMs: 10_000,
    });
    try {
      await handle.introPromise;
      await query(`update lesson_generation_claims set claim_token = $2 where objective_id = $1`, [o, randomUUID()]);
    } finally {
      release();
    }
    await assert.rejects(handle.fullPromise);
    assert.equal(await getOverrideLesson(u.id, o), null);
    await query(`delete from lesson_generation_claims where objective_id = $1`, [o]);
  });
});

// ---------------------------------------------------------------- item 13
describe("pool and transaction timeouts", () => {
  test("a transaction runs with statement, lock and idle timeouts set locally", async () => {
    const s = await withTransaction((tx) =>
      tx.queryOne<{ st: string; lt: string; it: string }>(
        `select current_setting('statement_timeout') as st, current_setting('lock_timeout') as lt,
                current_setting('idle_in_transaction_session_timeout') as it`
      )
    );
    assert.deepEqual(s, { st: "20s", lt: "10s", it: "30s" });
  });

  test("a statement over the transaction's statement_timeout is cancelled", async () => {
    await assert.rejects(
      withTransaction(async (tx) => {
        await tx.query(`select set_config('statement_timeout', '200ms', true)`);
        await tx.query(`select pg_sleep(2)`);
      }),
      /statement timeout/
    );
  });
});

// ---------------------------------------------------------------- item 15
describe("stale study sessions are closed", () => {
  test("starting a session ends the learner's open sessions that went quiet past the window", async () => {
    const u = await makeUser("stale-session");
    const a = await makeCourse(u.id, 0);
    const b = await makeCourse(u.id, 0);
    const old = await queryOne<{ id: string }>(
      `insert into study_sessions (user_id, track_id, started_at) values ($1, $2, now() - interval '3 hours') returning id`,
      [u.id, a.track]
    );
    await startOrTouchSession(u.id, b.track);
    const row = await queryOne<{ ended: boolean; length_min: number }>(
      `select ended_at is not null as ended, extract(epoch from (ended_at - started_at))::int / 60 as length_min
         from study_sessions where id = $1`,
      [old!.id]
    );
    assert.deepEqual(row, { ended: true, length_min: 30 });
    const open = await queryOne<{ n: number }>(
      `select count(*)::int as n from study_sessions where user_id = $1 and ended_at is null`,
      [u.id]
    );
    assert.equal(open!.n, 1);
  });
});

// ---------------------------------------------------------------- item 16
describe("account export is paged", () => {
  test("a section over the page size lists the next offset, and the pages add up without gaps", async () => {
    const u = await makeUser("export");
    const { track } = await makeCourse(u.id, 0);
    for (let i = 0; i < 5; i++) {
      await query(`insert into study_sessions (user_id, track_id, started_at, ended_at) values ($1, $2, now() - make_interval(hours => $3), now())`, [
        u.id,
        track,
        10 - i,
      ]);
    }
    const run = (sql: string, params: unknown[]) => query<Record<string, unknown>>(sql, params);
    const out = await buildAccountExport(u.id, run, 2);
    assert.equal((out.studySessions as unknown[]).length, 2);
    assert.deepEqual((out.more as Record<string, unknown>).studySessions, { nextOffset: 2 });
    const ids = (out.studySessions as { id: string }[]).map((r) => r.id);
    let offset: number | null = 2;
    while (offset !== null) {
      const page = await exportSectionPage(u.id, "studySessions", run, offset, 2);
      ids.push(...(page.rows as { id: string }[]).map((r) => r.id));
      offset = page.nextOffset;
    }
    assert.equal(ids.length, 5);
    assert.equal(new Set(ids).size, 5);
  });

  test("the route rejects an unknown section and a bad offset", async () => {
    const u = await makeUser("export-route");
    const h = { headers: authHeader(u) };
    assert.equal((await exportGet(new Request("http://t/x?section=password_hash", h))).status, 400);
    assert.equal((await exportGet(new Request("http://t/x?section=attempts&offset=-1", h))).status, 400);
    const ok = await exportGet(new Request("http://t/x?section=attempts&offset=0", h));
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { section: "attempts", offset: 0, rows: [], nextOffset: null });
  });
});
