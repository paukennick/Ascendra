// Migration 028 (ai_calls) against a real Postgres: the writer's insert
// matches the table, a deleted account keeps its cost rows, and the whole
// wrapper path (fake Anthropic client -> loggedCall -> real insert) lands a
// row. Nothing here calls Anthropic. Run with:
//   DATABASE_URL=... PGSSLMODE=disable npm run test:db
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { insertAiCallRecord, logAiCall, setAiCallSink, type AiCallRecord } from "./ai-calls";
import { callClaude, __setClientForTest } from "./anthropic";

const run = Date.now().toString(36);
const user = randomUUID();
// Unique per run so rows from other runs/tests never count.
const model = `test-model-${run}`;

const sample = (over: Partial<AiCallRecord> = {}): AiCallRecord => ({
  userId: user,
  purpose: "chat",
  model,
  inputTokens: 100,
  outputTokens: 40,
  cacheReadTokens: 512,
  cacheWriteTokens: 0,
  latencyMs: 850,
  ok: true,
  errorCode: null,
  ...over,
});

const rowsFor = () =>
  query<{
    user_id: string | null; purpose: string; input_tokens: number | null; cache_read_tokens: number | null;
    latency_ms: number; ok: boolean; error_code: string | null; created_at: Date;
  }>(`select * from ai_calls where model = $1 order by created_at asc`, [model]);

before(async () => {
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `ai-calls-${run}@example.test`]);
});

after(async () => {
  setAiCallSink(null);
  __setClientForTest(null);
  await query(`delete from ai_calls where model = $1`, [model]);
  await query(`delete from app_users where id = $1`, [user]);
  await closePool();
});

describe("ai_calls (migration 028)", () => {
  test("the table exists (the schema probe)", async () => {
    const r = await queryOne<{ ok: boolean }>(`select to_regclass('public.ai_calls') is not null as ok`);
    assert.equal(r?.ok, true);
  });

  test("inserts a success row and a failure row with every column", async () => {
    await insertAiCallRecord(sample());
    await insertAiCallRecord(sample({ ok: false, errorCode: "http_429_rate_limit_error", inputTokens: null, outputTokens: null, cacheReadTokens: null }));
    const rows = await rowsFor();
    assert.equal(rows.length, 2);
    assert.equal(rows[0].user_id, user);
    assert.equal(rows[0].purpose, "chat");
    assert.equal(rows[0].input_tokens, 100);
    assert.equal(rows[0].cache_read_tokens, 512);
    assert.equal(rows[0].latency_ms, 850);
    assert.equal(rows[0].ok, true);
    assert.equal(rows[0].error_code, null);
    assert.ok(rows[0].created_at instanceof Date, "created_at defaulted");
    assert.equal(rows[1].ok, false);
    assert.equal(rows[1].error_code, "http_429_rate_limit_error");
    assert.equal(rows[1].input_tokens, null);
  });

  test("a call not tied to a learner is stored with a null user_id", async () => {
    await insertAiCallRecord(sample({ userId: null, purpose: "lesson_intro" }));
    const rows = (await rowsFor()).filter((r) => r.purpose === "lesson_intro");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, null);
  });

  test("overlong purpose/model/error_code are clipped by the writer rather than failing the insert", async () => {
    // purpose and model are clipped in insertAiCall; error_code is clipped in errorCodeOf.
    await insertAiCallRecord(sample({ purpose: "p".repeat(100), errorCode: null }));
    const r = await queryOne<{ n: number }>(`select count(*) as n from ai_calls where model = $1 and length(purpose) = 40`, [model]);
    assert.equal(r!.n, 1);
  });

  test("deleting the account keeps the cost rows and nulls the link", async () => {
    const u = randomUUID();
    await query(`insert into app_users (id, email) values ($1, $2)`, [u, `ai-calls-del-${run}@example.test`]);
    await insertAiCallRecord(sample({ userId: u, purpose: "grade_open" }));
    await query(`delete from app_users where id = $1`, [u]);
    const rows = (await rowsFor()).filter((r) => r.purpose === "grade_open");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, null);
  });

  test("a bad user id makes the insert fail, and logAiCall swallows that", async () => {
    const warn = console.warn;
    const warnings: string[] = [];
    console.warn = (m: string) => warnings.push(String(m));
    try {
      setAiCallSink(null); // real insert
      assert.doesNotThrow(() => logAiCall(sample({ userId: randomUUID(), purpose: "bad_user" }))); // fk violation
      await new Promise((r) => setTimeout(r, 300));
    } finally {
      console.warn = warn;
    }
    assert.ok(warnings.some((w) => w.includes("[ai_calls]")), "failure is warned about");
    assert.equal((await rowsFor()).filter((r) => r.purpose === "bad_user").length, 0);
  });

  test("end to end: a call through the wrapper with a fake client lands one row", async () => {
    setAiCallSink(null);
    __setClientForTest({
      messages: {
        create: async () => ({
          content: [{ type: "text", text: "hi" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 11, output_tokens: 22, cache_read_input_tokens: 33, cache_creation_input_tokens: 44 },
        }),
        parse: async () => {
          throw new Error("not used");
        },
      },
    });
    const text = await callClaude({
      system: "s",
      messages: [{ role: "user", content: "q" }],
      model,
      purpose: "guess_feedback",
      userId: user,
    });
    assert.equal(text, "hi");
    await new Promise((r) => setTimeout(r, 300)); // fire-and-forget insert
    const rows = (await rowsFor()).filter((r) => r.purpose === "guess_feedback");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, user);
    assert.equal(rows[0].input_tokens, 11);
    assert.equal(rows[0].cache_read_tokens, 33);
    assert.equal(rows[0].ok, true);
  });
});
