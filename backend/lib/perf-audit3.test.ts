// REQ-118 (Audit 3 performance / infra): pure-logic tests. No database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeHealth, JIT_SQL, JIT_WARNING } from "./health";
import { requiredEnvProblems } from "./required-env";
import { errorEvent, parseDsn, reportError, setErrorTransport } from "./error-tracker";
import { createReadinessCache, stampOf } from "./readiness-cache";
import { txBeginSql, TX_STATEMENT_TIMEOUT_MS } from "./db";
import { logAiCall, scheduleAfterResponse, setAiCallSink, type AiCallRecord } from "./ai-calls";

const GOOD_ENV = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://x",
  AUTH_JWT_SECRET: "s",
  APP_BASE_URL: "https://x",
  RESEND_API_KEY: "r",
  AUTH_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  CHOICE_ORDER_SECRET: "c",
  ANTHROPIC_FEDERATION_RULE_ID: "f",
  ANTHROPIC_ORGANIZATION_ID: "o",
  // REQ-207: production without a real sender is now a 503, so a "complete"
  // environment has one (updated, not deleted: FAIL-232).
  EMAIL_FROM: "Ascendra <no-reply@ascendra-learn.com>",
};

describe("health: required settings and jit (FAIL-386, FAIL-371)", () => {
  const healthyDb = (jit: boolean) => async (sql: string) => [{ ok: sql === JIT_SQL ? jit : true }];

  test("a complete production environment with jit off is plainly ok", async () => {
    assert.deepEqual(await computeHealth(healthyDb(false), GOOD_ENV), { kind: "ok" });
  });

  test("jit on is a warning, not a failure", async () => {
    const r = await computeHealth(healthyDb(true), GOOD_ENV);
    assert.equal(r.kind, "ok");
    assert.deepEqual(r.kind === "ok" ? r.warnings : null, [JIT_WARNING]);
  });

  test("production missing a required setting is misconfigured, by name only, before touching the database", async () => {
    let touched = false;
    const r = await computeHealth(async () => ((touched = true), [{ ok: true }]), {
      ...GOOD_ENV,
      RESEND_API_KEY: "",
      AUTH_ENCRYPTION_KEY: "short",
    });
    assert.equal(r.kind, "misconfigured");
    assert.deepEqual(r.kind === "misconfigured" ? r.env : null, ["RESEND_API_KEY is not set", "AUTH_ENCRYPTION_KEY is not valid"]);
    assert.equal(touched, false);
    assert.doesNotMatch(JSON.stringify(r), /short/);
  });

  test("outside production a missing setting is only a warning", async () => {
    const r = await computeHealth(healthyDb(false), { ...GOOD_ENV, NODE_ENV: "development", APP_BASE_URL: undefined });
    assert.equal(r.kind, "ok");
    assert.deepEqual(r.kind === "ok" ? r.warnings : null, ["APP_BASE_URL is not set"]);
  });

  test("Anthropic credentials: a static key or both federation ids", () => {
    const { ANTHROPIC_FEDERATION_RULE_ID: _f, ANTHROPIC_ORGANIZATION_ID: _o, ...noAi } = GOOD_ENV;
    assert.deepEqual(requiredEnvProblems(noAi).map((p) => p.name), ["ANTHROPIC_FEDERATION_RULE_ID", "ANTHROPIC_ORGANIZATION_ID"]);
    assert.deepEqual(requiredEnvProblems({ ...noAi, ANTHROPIC_API_KEY: "k" }), []);
    assert.deepEqual(requiredEnvProblems({ ...noAi, AI_PROVIDER: "local" }), []);
    // CHOICE_ORDER_SECRET is only required in production (lib/choice-order.ts).
    assert.deepEqual(requiredEnvProblems({ ...GOOD_ENV, NODE_ENV: "test", CHOICE_ORDER_SECRET: undefined }), []);
  });
});

describe("error tracker hook (FAIL-385)", () => {
  test("no DSN: nothing is sent", () => {
    const prev = process.env.ERROR_TRACKER_DSN;
    delete process.env.ERROR_TRACKER_DSN;
    let sent = 0;
    setErrorTransport(async () => void sent++);
    reportError(new Error("boom"), { requestId: "r1" });
    setErrorTransport(null);
    if (prev !== undefined) process.env.ERROR_TRACKER_DSN = prev;
    assert.equal(sent, 0);
  });

  test("with a Sentry DSN: one event to the store endpoint, no request data", async () => {
    const prev = process.env.ERROR_TRACKER_DSN;
    process.env.ERROR_TRACKER_DSN = "https://abc123@o1.ingest.example.test/4501";
    const sent: { url: string; init: RequestInit }[] = [];
    setErrorTransport(async (url, init) => void sent.push({ url, init }));
    reportError(new Error("boom"), { requestId: "r1" });
    setErrorTransport(null);
    if (prev === undefined) delete process.env.ERROR_TRACKER_DSN;
    else process.env.ERROR_TRACKER_DSN = prev;
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, "https://o1.ingest.example.test/api/4501/store/");
    assert.match(String((sent[0].init.headers as Record<string, string>)["X-Sentry-Auth"]), /sentry_key=abc123/);
    const body = JSON.parse(String(sent[0].init.body));
    assert.equal(body.tags.requestId, "r1");
    assert.equal(body.exception.values[0].value, "boom");
  });

  test("a failing transport never throws into the request", () => {
    process.env.ERROR_TRACKER_DSN = "https://k@h.example.test/1";
    setErrorTransport(() => {
      throw new Error("network down");
    });
    assert.doesNotThrow(() => reportError(new Error("x")));
    setErrorTransport(null);
    delete process.env.ERROR_TRACKER_DSN;
  });

  test("DSN parsing rejects junk; events cap the message", () => {
    assert.equal(parseDsn("not a url"), null);
    assert.equal(parseDsn("https://h.example.test/1"), null); // no key
    assert.equal(parseDsn(undefined), null);
    assert.equal(errorEvent(new Error("x".repeat(2000))).exception.values[0].value.length, 500);
  });
});

describe("readiness cache (FAIL-377)", () => {
  test("hit within the TTL for the same stamp; a new answer (stamp) or the TTL recomputes", async () => {
    let t = 0;
    const now = () => t;
    const cache = createReadinessCache<number>(60_000);
    let computed = 0;
    const compute = async () => ++computed;
    assert.deepEqual(await cache.get("u", "c", "s1", compute, now), { value: 1, cached: false });
    assert.deepEqual(await cache.get("u", "c", "s1", compute, now), { value: 1, cached: true });
    assert.deepEqual(await cache.get("u", "c", "s2", compute, now), { value: 2, cached: false });
    t = 60_001;
    assert.deepEqual(await cache.get("u", "c", "s2", compute, now), { value: 3, cached: false });
    // Courses and learners are separate entries.
    assert.equal((await cache.get("u", "other", "s2", compute, now)).cached, false);
    assert.equal((await cache.get("v", "c", "s2", compute, now)).cached, false);
  });

  test("invalidateUser drops that learner only; the size stays bounded", async () => {
    const cache = createReadinessCache<number>(60_000, 3);
    for (const k of ["a", "b", "c", "d"]) await cache.get("u", k, null, async () => 1);
    assert.equal(cache.size, 3);
    await cache.get("v", "a", null, async () => 1);
    cache.invalidateUser("u");
    assert.equal(cache.size, 1);
    assert.equal(stampOf(null), null);
    assert.equal(stampOf("2026-11-07 10:00:00.123456+00"), "2026-11-07 10:00:00.123456+00");
  });
});

describe("transaction start is one round trip (FAIL-383)", () => {
  test("BEGIN and the three SET LOCALs are one statement string with constants only", () => {
    const sql = txBeginSql(false);
    assert.match(sql, /^begin; set local statement_timeout = '\d+ms'; set local lock_timeout = '\d+ms'; set local idle_in_transaction_session_timeout = '\d+ms'$/);
    assert.ok(sql.includes(`${TX_STATEMENT_TIMEOUT_MS}ms`));
    assert.match(txBeginSql(true), /^begin isolation level repeatable read read only; /);
  });
});

describe("ai_calls write after the response (FAIL-384)", () => {
  test("outside a request after() is unavailable and the write still happens straight away", async () => {
    assert.equal(scheduleAfterResponse(async () => {}), false);
    const got: AiCallRecord[] = [];
    setAiCallSink(async (r) => void got.push(r));
    logAiCall({
      userId: null,
      purpose: "chat",
      model: "m",
      inputTokens: 1,
      outputTokens: 1,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      latencyMs: 1,
      ok: true,
      errorCode: null,
    });
    await new Promise((r) => setImmediate(r));
    setAiCallSink(null);
    assert.equal(got.length, 1);
  });
});

describe("--status upkeep lines (FAIL-390, FAIL-371)", () => {
  test("backups past 30 days are flagged; jit on is called out", async () => {
    const { formatBackups, formatJit } = await import("./maintenance");
    const lines = formatBackups([
      { name: "mastery_backup_029", bytes: 60 * 1024 * 1024, age_days: 45 },
      { name: "mastery_backup_041", bytes: 80 * 1024 * 1024, age_days: 3 },
    ]);
    assert.match(lines[1], /mastery_backup_029: 60 MB, 45 day\(s\) old  <- past 30 days/);
    assert.doesNotMatch(lines[2], /past 30/);
    assert.match(lines[3], /1 past 30 days/);
    assert.deepEqual(formatBackups([]), ["Rollback backups: none."]);
    assert.match(formatJit(true), /ON/);
    assert.equal(formatJit(false), "Postgres jit: off.");
  });
});
