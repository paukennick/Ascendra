import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkSchema, migrationsToApply, SCHEMA_PROBES } from "./schema-status";

describe("checkSchema", () => {
  test("reports the migrations behind failed and erroring probes, deduplicated and in order", async () => {
    const s = await checkSchema(async (sql) => {
      if (sql.includes("lesson_progress")) return [{ ok: false }];
      if (sql.includes("client_attempt_id")) throw new Error("relation does not exist");
      return [{ ok: true }];
    });
    assert.equal(s.current, false);
    assert.equal(s.missing.length, 2);
    assert.deepEqual(migrationsToApply(s), ["025_lesson_progress.sql"]);
  });
  test("an empty result counts as missing, not present", async () => {
    const s = await checkSchema(async () => []);
    assert.equal(s.missing.length, SCHEMA_PROBES.length);
  });
  test("all probes pass -> current", async () => {
    const s = await checkSchema(async () => [{ ok: true }]);
    assert.deepEqual(s, { current: true, missing: [] });
  });
});
