// REQ-207 (FAIL-945, FAIL-946): error reports survive a serverless freeze, and
// logs never carry a Postgres error's `detail` (which can hold an e-mail).
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { describeError, summarizeError, maskEmails, LOG_MESSAGE_MAX } from "./error-summary";
import { errorEvent, reportError, sendErrorReport, sendTestErrorReport, setErrorScheduler, setErrorTransport, TEST_ERROR_MESSAGE } from "./error-tracker";
import { serverError } from "./http";

const pgError = () =>
  Object.assign(new Error('duplicate key value violates unique constraint "app_users_email_key"'), {
    name: "error",
    code: "23505",
    detail: "Key (email)=(learner@example.com) already exists.",
    where: "SQL statement \"insert into app_users (email) values ('learner@example.com')\"",
    parameters: ["learner@example.com"],
  });

describe("FAIL-946: what gets logged", () => {
  test("name, code and a short message; never detail, where or parameters", () => {
    const s = summarizeError(pgError());
    assert.deepEqual(Object.keys(s).sort(), ["code", "message", "name"]);
    assert.equal(s.code, "23505");
    assert.doesNotMatch(JSON.stringify(s), /learner@example\.com|already exists/);
  });
  test("the message is truncated and e-mail addresses inside it are masked", () => {
    assert.equal(summarizeError(new Error("x".repeat(5000))).message.length, LOG_MESSAGE_MAX);
    assert.equal(maskEmails('invalid input syntax for type uuid: "a.b+c@mail.example.org"'), 'invalid input syntax for type uuid: "[email]"');
    assert.doesNotMatch(describeError(new Error("bad value ann@example.com here")), /ann@example\.com/);
  });
  test("non-Error throws are summarized too", () => {
    assert.match(describeError("plain string with b@c.io"), /^string: plain string with \[email\]$/);
    assert.equal(summarizeError(null).code, null);
  });
  test("serverError writes one line with the code and none of the error's detail", async () => {
    const lines: unknown[][] = [];
    const orig = console.error;
    console.error = (...a: unknown[]) => void lines.push(a);
    try {
      const res = serverError(pgError());
      assert.equal(res.status, 500);
      const body = (await res.json()) as { error: string; requestId: string };
      assert.equal(typeof body.requestId, "string");
      assert.equal(JSON.stringify(body).includes("learner@example.com"), false);
    } finally {
      console.error = orig;
    }
    const first = lines[0];
    assert.equal(first.length, 1, "a single string argument, not the error object");
    assert.equal(typeof first[0], "string");
    assert.match(String(first[0]), /code=23505/);
    assert.doesNotMatch(String(first[0]), /learner@example\.com|already exists|insert into/);
  });
});

describe("FAIL-945: the tracker send is kept alive with after()", () => {
  const prev = process.env.ERROR_TRACKER_DSN;
  afterEach(() => {
    setErrorScheduler(null);
    setErrorTransport(null);
    if (prev === undefined) delete process.env.ERROR_TRACKER_DSN;
    else process.env.ERROR_TRACKER_DSN = prev;
  });

  test("inside a request the send is handed to the scheduler and runs when it is run, not before", async () => {
    process.env.ERROR_TRACKER_DSN = "https://k@h.example.test/7";
    let sent = 0;
    setErrorTransport(async () => void sent++);
    const tasks: Array<() => Promise<unknown>> = [];
    setErrorScheduler((t) => void tasks.push(t));
    reportError(new Error("boom"), { requestId: "r1" });
    assert.equal(tasks.length, 1);
    assert.equal(sent, 0, "nothing sent from the request's own turn");
    await tasks[0]();
    assert.equal(sent, 1);
  });

  test("outside a request after() throws and the report is sent straight away", () => {
    process.env.ERROR_TRACKER_DSN = "https://k@h.example.test/7";
    let sent = 0;
    setErrorTransport(async () => void sent++);
    setErrorScheduler(() => {
      throw new Error("`after` was called outside a request scope");
    });
    assert.doesNotThrow(() => reportError(new Error("boom")));
    assert.equal(sent, 1);
  });

  test("the real after() outside a request also falls back (no scheduler override)", () => {
    process.env.ERROR_TRACKER_DSN = "https://k@h.example.test/7";
    let sent = 0;
    setErrorTransport(async () => void sent++);
    reportError(new Error("boom"));
    assert.equal(sent, 1);
  });

  test("sendErrorReport (what onRequestError awaits) resolves after the transport finishes, and never rejects", async () => {
    process.env.ERROR_TRACKER_DSN = "https://k@h.example.test/7";
    let done = false;
    setErrorTransport(async () => {
      await new Promise((r) => setTimeout(r, 20));
      done = true;
    });
    await sendErrorReport(new Error("x"));
    assert.equal(done, true);
    setErrorTransport(async () => {
      throw new Error("network down");
    });
    await assert.doesNotReject(sendErrorReport(new Error("x")));
    setErrorTransport(() => {
      throw new Error("sync throw");
    });
    await assert.doesNotReject(sendErrorReport(new Error("x")));
  });

  test("no DSN: nothing scheduled, nothing sent", () => {
    delete process.env.ERROR_TRACKER_DSN;
    let scheduled = 0;
    setErrorScheduler(() => void scheduled++);
    reportError(new Error("boom"));
    assert.equal(scheduled, 0);
  });

  test("the event masks e-mail addresses in the message and the stack", () => {
    const e = errorEvent(new Error("Key (email)=(a@b.example) already exists"));
    assert.doesNotMatch(JSON.stringify(e), /a@b\.example/);
  });
});

// REQ-211: the owner's test button learns whether Sentry accepted the event.
describe("REQ-211: sendTestErrorReport", () => {
  afterEach(() => {
    setErrorTransport(null);
    delete process.env.ERROR_TRACKER_DSN;
  });
  test("not configured: nothing sent", async () => {
    let sent = 0;
    setErrorTransport(async () => void sent++);
    delete process.env.ERROR_TRACKER_DSN;
    assert.deepEqual(await sendTestErrorReport(), { configured: false, delivered: false, status: null });
    assert.equal(sent, 0);
  });
  test("sends one labeled event to the store URL and reports Sentry's status", async () => {
    process.env.ERROR_TRACKER_DSN = "https://pk@o1.ingest.example.test/42";
    const calls: Array<{ url: string; body: string }> = [];
    setErrorTransport(async (url, init) => {
      calls.push({ url, body: String(init.body) });
      return new Response("{}", { status: 200 });
    });
    assert.deepEqual(await sendTestErrorReport({ route: "/t" }), { configured: true, delivered: true, status: 200 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://o1.ingest.example.test/api/42/store/");
    assert.match(calls[0].body, new RegExp(TEST_ERROR_MESSAGE.slice(0, 30).replace(/[()>]/g, ".")));
  });
  test("a refusal or a network failure is reported, never thrown", async () => {
    process.env.ERROR_TRACKER_DSN = "https://pk@o1.ingest.example.test/42";
    setErrorTransport(async () => new Response("bad key", { status: 401 }));
    assert.deepEqual(await sendTestErrorReport(), { configured: true, delivered: false, status: 401 });
    setErrorTransport(async () => {
      throw new Error("offline");
    });
    assert.deepEqual(await sendTestErrorReport(), { configured: true, delivered: false, status: null });
  });
});
