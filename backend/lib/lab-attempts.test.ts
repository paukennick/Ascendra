// REQ-096: a lab "I did it" is a self-report. These pin the rules that keep
// it from pretending to be more: it's scoped to the caller, it stores the
// server's own prompt, it has no verdict, it doesn't stack on a double tap,
// and it never touches mastery or the spaced-review error log.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LAB_DEDUPE_MINUTES,
  LAB_SELF_REPORT_ANSWER,
  findLabObjective,
  isUuid,
  recordLabCompletion,
} from "./lab-attempts";

const USER = "11111111-1111-4111-8111-111111111111";
const OBJ = "22222222-2222-4222-8222-222222222222";
const UNIT = "33333333-3333-4333-8333-333333333333";

function fakeQuery(rows: unknown[]) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const run = async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    return rows;
  };
  return { run, calls };
}

describe("isUuid", () => {
  test("accepts a uuid, rejects anything else", () => {
    assert.equal(isUuid(OBJ), true);
    assert.equal(isUuid("not-a-uuid"), false);
    assert.equal(isUuid(""), false);
    assert.equal(isUuid(undefined), false);
    assert.equal(isUuid(`${OBJ}'; drop table attempts;--`), false);
  });
});

describe("findLabObjective", () => {
  test("does not query at all for a malformed id (404, not a Postgres 500)", async () => {
    let called = false;
    const run = (async () => {
      called = true;
      return null;
    }) as never;
    assert.equal(await findLabObjective("nope", USER, run), null);
    assert.equal(called, false);
  });

  test("is scoped to the shared catalog or the caller's own tracks", async () => {
    const seen: Array<{ sql: string; params: unknown[] | undefined }> = [];
    const run = (async (sql: string, params?: unknown[]) => {
      seen.push({ sql, params });
      return { id: OBJ, unit_id: UNIT, lab_prompt: "Do it" };
    }) as never;
    const found = await findLabObjective(OBJ, USER, run);
    assert.equal(found?.id, OBJ);
    assert.match(seen[0].sql, /st\.user_id is null or st\.user_id = \$2/);
    assert.deepEqual(seen[0].params, [OBJ, USER]);
  });

  test("returns null when the objective isn't visible to the caller", async () => {
    const run = (async () => null) as never;
    assert.equal(await findLabObjective(OBJ, USER, run), null);
  });
});

describe("recordLabCompletion", () => {
  const objective = { id: OBJ, unit_id: UNIT, lab_prompt: "  Use systemctl to inspect a service.  " };

  test("stores one ungraded lab attempt with the server's prompt as the question", async () => {
    const { run, calls } = fakeQuery([{ id: "a1" }]);
    const result = await recordLabCompletion(USER, objective, run);
    assert.deepEqual(result, { recorded: true });
    assert.equal(calls.length, 1);
    const { sql, params } = calls[0];
    assert.match(sql, /insert into attempts/);
    assert.match(sql, /'lab'::attempt_kind/);
    assert.match(sql, /'lab'::attempt_format/);
    assert.deepEqual(params, [
      USER,
      UNIT,
      OBJ,
      "Use systemctl to inspect a service.",
      LAB_SELF_REPORT_ANSWER,
      LAB_DEDUPE_MINUTES,
    ]);
  });

  test("writes no verdict, feedback or classification", async () => {
    const { run, calls } = fakeQuery([{ id: "a1" }]);
    await recordLabCompletion(USER, objective, run);
    const columns = calls[0].sql.slice(calls[0].sql.indexOf("("), calls[0].sql.indexOf(")") + 1);
    assert.doesNotMatch(columns, /verdict|feedback|classification|missed_parts|confidence/);
  });

  test("never touches mastery or the spaced-review error log", async () => {
    const { run, calls } = fakeQuery([{ id: "a1" }]);
    await recordLabCompletion(USER, objective, run);
    for (const c of calls) {
      assert.doesNotMatch(c.sql, /\bmastery\b/);
      assert.doesNotMatch(c.sql, /error_log/);
    }
  });

  test("a repeat inside the window is a no-op, guarded in the same statement", async () => {
    const { run, calls } = fakeQuery([]); // the NOT EXISTS guard filtered the row out
    const result = await recordLabCompletion(USER, objective, run);
    assert.deepEqual(result, { recorded: false });
    assert.match(calls[0].sql, /where not exists/);
    assert.match(calls[0].sql, /kind = 'lab'/);
  });

  test("refuses an objective with no lab prompt", async () => {
    const { run, calls } = fakeQuery([]);
    await assert.rejects(recordLabCompletion(USER, { ...objective, lab_prompt: "   " }, run));
    await assert.rejects(recordLabCompletion(USER, { ...objective, lab_prompt: null }, run));
    assert.equal(calls.length, 0);
  });
});
