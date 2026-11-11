// REQ-216 (batch G1): the stateful parts, against a real Postgres. A PBQ
// waiter must not regenerate after the holder's scenario was held back, and a
// unit check is written once however many requests ask at once. The model is
// faked; nothing here calls Anthropic.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { servePbqScenario, isPbqClaimLive, type ScenarioGenerator } from "./pbq-scenarios";
import { recordHoldback } from "./item-quality";
import { HeldForAccuracyError } from "./generation-gate";
import { getOrWriteUnitCheck, type UnitCheckStatus } from "./unit-check";
import { createSession, ExamSessionError, EXAM_ALL_HELD_MESSAGE } from "./exam-sessions";

const run = Date.now().toString(36);
const user = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const unit2 = randomUUID();
const fast = { pollMs: 20, waitMs: 10_000 };

let replies: Array<{ confidence: string; uncertainClaims: string[] }> = [];
let writerCalls = 0;
let writerDelayMs = 0;
// When set, the writer answers with exam items (all at this confidence).
let examConfidence: string | null = null;
const examTrack = randomUUID();
const examUnit = randomUUID();
const prompts: string[] = [];

const status = (unitId: string): UnitCheckStatus => ({
  unitId,
  unitTitle: "Controls",
  trackId: track,
  gate: `Explain the gate ${run}`,
  total: 1,
  studied: 1,
  eligible: true,
  passed: false,
  lastVerdict: null,
});
const storedChecks = async (unitId: string) =>
  (await queryOne<{ n: number }>(`select count(*)::int as n from unit_check_items where unit_id = $1`, [unitId]))!.n;
const holdbacks = async (unitId: string) =>
  (await queryOne<{ n: number }>(`select count(*)::int as n from item_holdbacks where item_kind = 'unit_check' and unit_id = $1`, [unitId]))!.n;

before(async () => {
  setAiCallSink(async () => undefined);
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `g1-${run}@example.test`]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'G1', 'certification', null)`, [track, `G1-${run}`]);
  for (const u of [unit, unit2]) {
    await query(`insert into course_units (id, track_id, title, sort_order, gate_description) values ($1, $2, 'Controls', 1, 'gate')`, [u, track]);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Compare controls', 1)`, [randomUUID(), u]);
  }
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'G1 exam', 'certification', null)`, [examTrack, `G1X-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'U', 1, 100)`, [examUnit, examTrack]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Ports', 1)`, [randomUUID(), examUnit]);
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: { messages: Array<{ content: unknown }> }) => {
        writerCalls++;
        prompts.push(String(body.messages[0].content));
        if (writerDelayMs) await new Promise((r) => setTimeout(r, writerDelayMs));
        if (examConfidence) {
          const item = (n: number) => ({
            format: "multiple_choice", stem: `Which port is HTTPS ${run} ${n}?`, choices: ["Port 80", "Port 443", "Port 8080", "Port 22"], correct: [1],
            steps: null, prompts: null, responses: null, matches: null, exhibit: null, explanation: "e", confidence: examConfidence, uncertainClaims: ["unsure"],
          });
          return { parsed_output: { items: [1, 2, 3, 4, 5, 6].map(item) }, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
        }
        const r = replies.shift() ?? { confidence: "high", uncertainClaims: [] };
        return {
          parsed_output: { title: `Check ${randomUUID()}`, scenario: "1) classify 2) justify", subParts: ["classify", "justify"], ...r },
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  });
});

beforeEach(() => {
  replies = [];
  writerCalls = 0;
  writerDelayMs = 0;
  examConfidence = null;
  prompts.length = 0;
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from item_holdbacks where unit_id = any($1::uuid[])`, [[unit, unit2]]);
  await query(`delete from app_users where id = $1`, [user]);
  await query(`delete from item_holdbacks where objective_id in (select id from objectives where unit_id = $1)`, [examUnit]);
  await query(`delete from exam_sessions where user_id = $1`, [user]);
  await query(`delete from exam_items where objective_id in (select id from objectives where unit_id = $1)`, [examUnit]);
  await query(`delete from auth_events where identifier = $1`, [user]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, examTrack]]);
  await closePool();
});

describe("FAIL-1015: a PBQ waiter does not regenerate after the holder's scenario was held back", () => {
  test("the waiter gets the same 409 and the model is not called for it", async () => {
    const heldUnit = randomUUID();
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Held', 9)`, [heldUnit, track]);
    let holderCalls = 0;
    let waiterCalls = 0;
    const holder: ScenarioGenerator = async () => {
      holderCalls++;
      await new Promise((r) => setTimeout(r, 200));
      await recordHoldback({ kind: "pbq", unitId: heldUnit, reason: "uncertain", claims: ["unsure"], content: {}, model: "m" });
      throw new HeldForAccuracyError("scenario", ["uncertain"]);
    };
    const waiter: ScenarioGenerator = async () => {
      waiterCalls++;
      return { title: "should not be written", scenario: "s", subParts: ["x", "y"], model: "m" };
    };
    const first = servePbqScenario({ userId: user, unitId: heldUnit, fresh: false, generate: holder, ...fast });
    await new Promise((r) => setTimeout(r, 60));
    const second = servePbqScenario({ userId: user, unitId: heldUnit, fresh: false, generate: waiter, ...fast });
    const [a, b] = await Promise.allSettled([first, second]);
    assert.equal(a.status, "rejected");
    assert.ok((a as PromiseRejectedResult).reason instanceof HeldForAccuracyError);
    assert.equal(b.status, "rejected");
    assert.ok((b as PromiseRejectedResult).reason instanceof HeldForAccuracyError, "the waiter gets the holder's refusal");
    assert.equal((b as PromiseRejectedResult).reason.status, 409);
    assert.equal(holderCalls, 1);
    assert.equal(waiterCalls, 0, "no second generation");
    assert.equal(await isPbqClaimLive(user, heldUnit), false);
    await query(`delete from item_holdbacks where unit_id = $1`, [heldUnit]);
  });
});

describe("FAIL-1017: a unit check is written once however many requests ask at once", () => {
  test("three concurrent requests: one writer call, one stored check, the same item for all", async () => {
    writerDelayMs = 150;
    const results = await Promise.all([1, 2, 3].map(() => getOrWriteUnitCheck(user, status(unit), fast)));
    assert.equal(writerCalls, 1);
    assert.equal(await storedChecks(unit), 1);
    assert.equal(new Set(results.map((r) => r.id)).size, 1);
    assert.equal(await isPbqClaimLive(user, unit), false, "lease released");
    // The answered-by-nobody check is served again without a call.
    writerCalls = 0;
    assert.equal((await getOrWriteUnitCheck(user, status(unit), fast)).id, results[0].id);
    assert.equal(writerCalls, 0);
  });

  test("low confidence twice: written twice (not once per request), nothing stored, a 409 for every request with the reason", async () => {
    writerDelayMs = 100;
    replies = [
      { confidence: "low", uncertainClaims: ["unsure of the limit"] },
      { confidence: "low", uncertainClaims: ["still unsure"] },
    ];
    const outcomes = await Promise.allSettled([1, 2, 3].map(() => getOrWriteUnitCheck(user, status(unit2), fast)));
    for (const o of outcomes) {
      assert.equal(o.status, "rejected");
      const reason = (o as PromiseRejectedResult).reason;
      assert.ok(reason instanceof HeldForAccuracyError, String(reason));
      assert.equal(reason.status, 409);
      assert.match(reason.message, /wasn't confident/);
    }
    assert.equal(writerCalls, 2, "one retry for the holder; the waiters do not write");
    assert.equal(await storedChecks(unit2), 0);
    assert.equal(await holdbacks(unit2), 2);
    assert.match(prompts[1], /unsure of the limit/, "the retry is steered with the first attempt's claims");
    assert.doesNotMatch(prompts[0], /unsure of the limit/);
  });

  test("listed claims with confidence medium are stored on the first draft", async () => {
    await query(`delete from unit_check_items where unit_id = $1`, [unit2]);
    await query(`delete from item_holdbacks where unit_id = $1`, [unit2]);
    replies = [{ confidence: "medium", uncertainClaims: ["the organization is invented"] }];
    const c = await getOrWriteUnitCheck(user, status(unit2), fast);
    assert.ok(c.id);
    assert.equal(writerCalls, 1);
    assert.equal(await holdbacks(unit2), 0);
  });
});

describe("FAIL-1025: a sprint whose every item was held back says so", () => {
  test("all items low-confidence on both attempts: a 409 naming the accuracy checks, nothing stored", async () => {
    examConfidence = "low";
    await assert.rejects(
      createSession({ userId: user, trackId: examTrack, mode: "sprint", timed: false, clientSessionId: randomUUID() }),
      (e: unknown) => e instanceof ExamSessionError && e.status === 409 && e.message === EXAM_ALL_HELD_MESSAGE
    );
    assert.ok(writerCalls >= 2, "each objective's batch is written once more");
    const n = (await queryOne<{ n: number }>(`select count(*)::int as n from exam_items where objective_id in (select id from objectives where unit_id = $1)`, [examUnit]))!.n;
    assert.equal(n, 0);
  });
});
