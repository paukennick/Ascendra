// REQ-091: access checks and idempotent writes, against a real Postgres with
// every migration applied (DATABASE_URL=... PGSSLMODE=disable npm run test:db).
//
// These cover the library functions the routes are built on. The routes
// themselves (auth, HTTP status mapping, Anthropic calls) are not exercised
// here; the two catalog-review handlers are called directly because they
// only need the database and a bearer token.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import {
  visibleObjective,
  visibleUnit,
  visibleTrack,
  visibleScenario,
  requireVisibleTrack,
  NotVisibleError,
} from "./visibility";
import {
  cachedCorrectIndex,
  recordAttemptIdempotent,
  findClientAttempt,
  advanceReviewStage,
} from "./grading-service";
import { saveChatTurn, findChatReply } from "./chat-store";
import { startOrTouchSession } from "./study-sessions";

const run = Date.now().toString(36);
const alice = randomUUID();
const bob = randomUUID();
const aliceTrack = randomUUID(); // private to alice
const sharedTrack = randomUUID(); // catalog (user_id null)
const aliceUnit = randomUUID();
const aliceObjective = randomUUID();
const sharedUnit = randomUUID();
const sharedObjective = randomUUID();
const aliceScenario = randomUUID();
const sharedScenario = randomUUID();
const orphanScenario = randomUUID();
const code = `ACC-${run}`;

before(async () => {
  for (const [id, email] of [[alice, "alice"], [bob, "bob"]]) {
    await query(`insert into app_users (id, email) values ($1, $2)`, [id, `${email}-${run}@example.test`]);
  }
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Alice private', 'certification', $3)`,
    [aliceTrack, `PRIV-${run}`, alice]
  );
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, source_url) values ($1, $2, 'Shared catalog', 'certification', null, 'https://example.test/src')`,
    [sharedTrack, code]
  );
  for (const [u, t] of [[aliceUnit, aliceTrack], [sharedUnit, sharedTrack]]) {
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [u, t]);
  }
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1)`, [aliceObjective, aliceUnit]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1)`, [sharedObjective, sharedUnit]);
  for (const [id, unit] of [[aliceScenario, aliceUnit], [sharedScenario, sharedUnit], [orphanScenario, null]]) {
    await query(
      `insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'S', 'text', '["a","b"]', 'm')`,
      [id, unit]
    );
  }
  await query(
    `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, model)
     values ($1,'g','t','fp','["a","b","c","d"]',2,'fw','sc','["a","b","c","d"]',1,'sw','m')`,
    [aliceObjective]
  );
});

after(async () => {
  await query(`delete from app_users where id = any($1)`, [[alice, bob]]);
  await query(`delete from subject_tracks where id = any($1)`, [[aliceTrack, sharedTrack]]);
  await query(`delete from pbq_scenarios where id = $1`, [orphanScenario]);
  await closePool();
});

describe("visibility", () => {
  test("a private track and everything under it is invisible to another user", async () => {
    assert.equal(await visibleTrack(aliceTrack, bob), null);
    assert.equal(await visibleUnit(aliceUnit, bob), null);
    assert.equal(await visibleObjective(aliceObjective, bob), null);
    assert.equal(await visibleScenario(aliceScenario, bob), null);
    await assert.rejects(requireVisibleTrack(aliceTrack, bob), NotVisibleError);
  });

  test("the owner sees their own rows", async () => {
    assert.equal((await visibleTrack(aliceTrack, alice))?.title, "Alice private");
    assert.equal((await visibleUnit(aliceUnit, alice))?.track_id, aliceTrack);
    assert.equal((await visibleObjective(aliceObjective, alice))?.unit_id, aliceUnit);
    const s = await visibleScenario(aliceScenario, alice);
    assert.equal(s?.unit_id, aliceUnit);
    assert.deepEqual(s?.sub_parts, ["a", "b"]);
  });

  test("shared catalog rows are visible to everyone", async () => {
    for (const u of [alice, bob]) {
      assert.ok(await visibleTrack(sharedTrack, u));
      assert.ok(await visibleUnit(sharedUnit, u));
      assert.ok(await visibleObjective(sharedObjective, u));
      assert.ok(await visibleScenario(sharedScenario, u));
    }
  });

  test("a scenario with no unit is not visible, and a non-uuid id is null rather than an error", async () => {
    assert.equal(await visibleScenario(orphanScenario, alice), null);
    assert.equal(await visibleTrack("not-a-uuid", alice), null);
    assert.equal(await visibleUnit("", alice), null);
    assert.equal(await visibleObjective("1; drop table x", alice), null);
  });
});

describe("answer key for multiple choice", () => {
  test("comes from the cached lesson, keyed by stage", async () => {
    assert.deepEqual(await cachedCorrectIndex(alice, aliceObjective, "fade"), { hasLesson: true, validStage: true, index: 2 });
    assert.deepEqual(await cachedCorrectIndex(alice, aliceObjective, "solo"), { hasLesson: true, validStage: true, index: 1 });
  });
  test("a lesson exists but the stage is not fade/solo: invalid stage (route answers 400)", async () => {
    assert.deepEqual(await cachedCorrectIndex(alice, aliceObjective, undefined), { hasLesson: true, validStage: false, index: null });
    assert.deepEqual(await cachedCorrectIndex(alice, aliceObjective, "guess"), { hasLesson: true, validStage: false, index: null });
  });
  test("no cached lesson: hasLesson false (route falls back to the client's value)", async () => {
    assert.deepEqual(await cachedCorrectIndex(alice, sharedObjective, "fade"), { hasLesson: false, validStage: false, index: null });
  });
  test("a learner who regenerated is graded against their own lesson, others against the shared one", async () => {
    await query(
      `insert into lesson_content_overrides
         (user_id, objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
          solo_check, solo_choices, solo_correct_index, solo_why, model)
       select $1, objective_id, guess_prompt, 'regenerated teach', fade_problem, fade_choices, 0, fade_why,
              solo_check, solo_choices, 3, solo_why, model
         from lesson_content where objective_id = $2`,
      [bob, aliceObjective]
    );
    try {
      assert.equal((await cachedCorrectIndex(bob, aliceObjective, "fade")).index, 0);
      assert.equal((await cachedCorrectIndex(bob, aliceObjective, "solo")).index, 3);
      assert.equal((await cachedCorrectIndex(alice, aliceObjective, "fade")).index, 2, "shared key changed for others");
    } finally {
      await query(`delete from lesson_content_overrides where user_id = $1 and objective_id = $2`, [bob, aliceObjective]);
    }
  });
});

describe("PBQ attempts are idempotent", () => {
  const base = {
    userId: alice,
    unitId: aliceUnit,
    pbqScenarioId: aliceScenario,
    kind: "pbq" as const,
    format: "pbq" as const,
    question: "S",
    answer: "my answer",
    verdict: "partial" as const,
    feedback: "Missed part b",
    classification: "incomplete",
    missedParts: ["b"],
  };

  test("a repeat id replays the stored result, including the missed sub-parts", async () => {
    const id = `pbq-${run}-1`;
    const first = await recordAttemptIdempotent({ ...base, clientAttemptId: id });
    assert.ok(first.attempt && !first.prior);
    const second = await recordAttemptIdempotent({ ...base, verdict: "correct", clientAttemptId: id });
    assert.equal(second.attempt, null);
    assert.equal(second.prior?.verdict, "partial", "replay must return the stored verdict, not the new one");
    assert.deepEqual(second.prior?.missedParts, ["b"]);
    assert.equal(second.prior?.feedback, "Missed part b");
    assert.equal(second.prior?.classification, "incomplete");
    assert.equal((second.prior?.attempt as { id: string }).id, first.attempt.id);
    const n = await queryOne<{ n: number }>(`select count(*) as n from attempts where user_id = $1 and client_attempt_id = $2`, [alice, id]);
    assert.equal(n!.n, 1);
  });

  test("concurrent requests with one id record exactly one attempt", async () => {
    const id = `pbq-${run}-race`;
    const results = await Promise.all(
      Array.from({ length: 6 }, () => recordAttemptIdempotent({ ...base, clientAttemptId: id }))
    );
    assert.equal(results.filter((r) => r.attempt).length, 1);
    assert.equal(results.filter((r) => r.prior).length, 5);
    const n = await queryOne<{ n: number }>(`select count(*) as n from attempts where user_id = $1 and client_attempt_id = $2`, [alice, id]);
    assert.equal(n!.n, 1);
    assert.ok(await findClientAttempt(alice, id));
  });

  test("without an id every call is a new attempt", async () => {
    const a = await recordAttemptIdempotent({ ...base });
    const b = await recordAttemptIdempotent({ ...base });
    assert.ok(a.attempt && b.attempt);
  });
});

describe("chat messages are idempotent", () => {
  const input = { userId: alice, trackId: aliceTrack, unitId: aliceUnit, message: "What is X?", reply: "X is Y." };

  test("a repeat client id returns the stored reply and saves nothing new", async () => {
    const id = `chat-${run}-1`;
    assert.equal(await findChatReply(alice, id), null);
    const first = await saveChatTurn({ ...input, clientMessageId: id });
    assert.deepEqual(first, { reply: "X is Y.", replayed: false });
    assert.equal(await findChatReply(alice, id), "X is Y.");

    const again = await saveChatTurn({ ...input, reply: "a different reply", clientMessageId: id });
    assert.deepEqual(again, { reply: "X is Y.", replayed: true });

    const rows = await query<{ role: string; content: string }>(
      `select role, content from chat_messages where user_id = $1 and track_id = $2 and (client_message_id = $3 or content in ('X is Y.', 'a different reply')) order by created_at asc`,
      [alice, aliceTrack, id]
    );
    assert.deepEqual(rows.map((r) => r.role), ["user", "assistant"], "one question, one reply, in order");
  });

  test("replay finds the right reply when later turns exist", async () => {
    const id = `chat-${run}-2`;
    await saveChatTurn({ ...input, message: "first", reply: "reply one", clientMessageId: id });
    await saveChatTurn({ ...input, message: "second", reply: "reply two", clientMessageId: `chat-${run}-3` });
    assert.equal(await findChatReply(alice, id), "reply one");
    assert.equal(await findChatReply(alice, `chat-${run}-3`), "reply two");
  });

  test("concurrent sends with one id store one turn and all get one reply", async () => {
    const id = `chat-${run}-race`;
    const out = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        saveChatTurn({ ...input, message: "race", reply: `reply ${i}`, clientMessageId: id })
      )
    );
    assert.equal(out.filter((o) => !o.replayed).length, 1);
    assert.equal(new Set(out.map((o) => o.reply)).size, 1);
    const n = await queryOne<{ n: number }>(`select count(*) as n from chat_messages where user_id = $1 and content = 'race' and role = 'user'`, [alice]);
    assert.equal(n!.n, 1);
    assert.equal(await findChatReply(alice, id), out[0].reply);
  });

  test("ids are per user, and messages without an id are never deduplicated", async () => {
    const id = `chat-${run}-shared-id`;
    await saveChatTurn({ ...input, clientMessageId: id });
    const other = await saveChatTurn({ ...input, userId: bob, trackId: sharedTrack, unitId: null, reply: "for bob", clientMessageId: id });
    assert.equal(other.replayed, false);
    assert.equal(await findChatReply(bob, id), "for bob");
    assert.equal((await saveChatTurn({ ...input })).replayed, false);
    assert.equal((await saveChatTurn({ ...input })).replayed, false);
  });
});

describe("review stage advance", () => {
  async function entry(userId: string, stage = 0, resolved = false) {
    const rows = await query<{ id: string }>(
      `insert into error_log (user_id, topic, error_text, review_stage, next_review_at, resolved)
       values ($1, 't', 'e', $2, current_date + 1, $3) returning id`,
      [userId, stage, resolved]
    );
    return rows[0].id;
  }
  const days = async (id: string) =>
    (await queryOne<{ d: number | null }>(`select (next_review_at - current_date) as d from error_log where id = $1`, [id]))!.d;

  test("walks 1 -> 7 -> 21 days -> resolved, matching the grading-service mapping", async () => {
    const id = await entry(alice);
    let r = await advanceReviewStage(alice, id);
    assert.deepEqual([r?.row.review_stage, r?.row.resolved, await days(id)], [1, false, 7]);
    r = await advanceReviewStage(alice, id);
    assert.deepEqual([r?.row.review_stage, r?.row.resolved, await days(id)], [2, false, 21]);
    r = await advanceReviewStage(alice, id);
    assert.deepEqual([r?.row.review_stage, r?.row.resolved, await days(id)], [3, true, null]);
  });

  test("a resolved entry never goes past stage 3", async () => {
    const id = await entry(alice, 3, true);
    const r = await advanceReviewStage(alice, id);
    assert.equal(r?.advanced, false);
    assert.equal(r?.row.review_stage, 3);
    const many = await Promise.all(Array.from({ length: 5 }, () => advanceReviewStage(alice, id)));
    assert.ok(many.every((m) => m?.row.review_stage === 3));
  });

  test("concurrent plain advances never exceed stage 3 or leave the row inconsistent", async () => {
    const id = await entry(alice);
    await Promise.all(Array.from({ length: 8 }, () => advanceReviewStage(alice, id)));
    const row = await queryOne<{ review_stage: number; resolved: boolean; next_review_at: string | null }>(
      `select review_stage, resolved, next_review_at from error_log where id = $1`, [id]);
    assert.deepEqual([row!.review_stage, row!.resolved, row!.next_review_at], [3, true, null]);
  });

  test("with fromStage, a repeated tap advances once", async () => {
    const id = await entry(alice);
    const out = await Promise.all(Array.from({ length: 6 }, () => advanceReviewStage(alice, id, 0)));
    assert.equal(out.filter((o) => o?.advanced).length, 1);
    assert.ok(out.every((o) => o?.row.review_stage === 1));
    assert.equal(await days(id), 7);
  });

  test("another user's entry is not found, and is left alone", async () => {
    const id = await entry(alice);
    assert.equal(await advanceReviewStage(bob, id), null);
    assert.equal((await queryOne<{ review_stage: number }>(`select review_stage from error_log where id = $1`, [id]))!.review_stage, 0);
  });
});

describe("study sessions", () => {
  test("repeat visits inside the window reuse one session and move started_at forward", async () => {
    const first = await startOrTouchSession(alice, aliceTrack);
    assert.equal(first.created, true);
    await query(`update study_sessions set started_at = now() - interval '20 minutes' where id = $1`, [first.session.id]);
    const second = await startOrTouchSession(alice, aliceTrack);
    assert.equal(second.created, false);
    assert.equal(second.session.id, first.session.id);
    const age = await queryOne<{ s: number }>(`select extract(epoch from now() - started_at) as s from study_sessions where id = $1`, [first.session.id]);
    assert.ok(Number(age!.s) < 5, "started_at should be refreshed so last_studied_at stays current");
  });

  test("concurrent visits create one session", async () => {
    const t = bob; // fresh (user, track) pair
    const out = await Promise.all(Array.from({ length: 6 }, () => startOrTouchSession(t, sharedTrack)));
    assert.equal(out.filter((o) => o.created).length, 1);
    const n = await queryOne<{ n: number }>(`select count(*) as n from study_sessions where user_id = $1 and track_id = $2`, [t, sharedTrack]);
    assert.equal(n!.n, 1);
  });

  test("a session older than 30 minutes, or one that was ended, starts a new row", async () => {
    const old = await startOrTouchSession(alice, sharedTrack);
    await query(`update study_sessions set started_at = now() - interval '31 minutes' where id = $1`, [old.session.id]);
    const fresh = await startOrTouchSession(alice, sharedTrack);
    assert.equal(fresh.created, true);
    assert.notEqual(fresh.session.id, old.session.id);

    await query(`update study_sessions set ended_at = now() where id = $1`, [fresh.session.id]);
    const afterEnd = await startOrTouchSession(alice, sharedTrack);
    assert.equal(afterEnd.created, true);
  });

  test("sessions are per user and per track, and last_studied_at (max started_at) reflects the touch", async () => {
    const a = await startOrTouchSession(alice, aliceTrack);
    const b = await startOrTouchSession(bob, sharedTrack);
    assert.notEqual(a.session.id, b.session.id);
    const last = await queryOne<{ last: string }>(
      `select max(started_at) as last from study_sessions where user_id = $1 and track_id = $2`, [alice, aliceTrack]);
    assert.ok(last!.last);
  });
});

describe("catalog review agent only sees shared tracks", () => {
  const token = `tok-${run}`;
  const privateSameCode = randomUUID();
  before(async () => {
    process.env.CATALOG_REVIEW_AGENT_TOKEN = token;
    // A learner's private track may reuse a catalog code (unique per user, not globally).
    await query(
      `insert into subject_tracks (id, code, title, track_type, user_id, source_url)
       values ($1, $2, 'Private copy', 'certification', $3, 'https://example.test/private')`,
      [privateSameCode, code, alice]
    );
  });
  after(async () => {
    await query(`delete from subject_tracks where id = $1`, [privateSameCode]);
  });

  test("review-context lists the shared track and not the private one", async () => {
    const { GET } = await import("@/app/api/catalog/review-context/route");
    const res = await GET(new Request("http://x/api/catalog/review-context", { headers: { authorization: `Bearer ${token}` } }));
    assert.equal(res.status, 200);
    const { tracks } = (await res.json()) as { tracks: { code: string; title: string }[] };
    const mine = tracks.filter((t) => t.code === code);
    assert.deepEqual(mine.map((t) => t.title), ["Shared catalog"]);
    assert.equal(tracks.some((t) => t.title === "Private copy"), false);
  });

  test("review-findings writes to the shared track and leaves the private one untouched", async () => {
    const { POST } = await import("@/app/api/catalog/review-findings/route");
    const res = await POST(
      new Request("http://x/api/catalog/review-findings", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ trackCode: code, conclusion: "current", evidenceUrl: "https://example.test/e", summary: "ok" }),
      })
    );
    assert.equal(res.status, 201);
    const rows = await query<{ id: string; source_verified_at: string | null }>(
      `select id, source_verified_at from subject_tracks where id = any($1)`, [[sharedTrack, privateSameCode]]);
    assert.ok(rows.find((r) => r.id === sharedTrack)!.source_verified_at);
    assert.equal(rows.find((r) => r.id === privateSameCode)!.source_verified_at, null);
    const f = await query(`select 1 from content_review_findings where track_id = $1`, [privateSameCode]);
    assert.equal(f.length, 0);
  });

  test("a code that exists only as a private track is a 404", async () => {
    const { POST } = await import("@/app/api/catalog/review-findings/route");
    const onlyPrivate = `PRIV-${run}`;
    const res = await POST(
      new Request("http://x/api/catalog/review-findings", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ trackCode: onlyPrivate, conclusion: "flagged", evidenceUrl: "https://example.test/e", summary: "s" }),
      })
    );
    assert.equal(res.status, 404);
  });
});
