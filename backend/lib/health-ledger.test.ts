// REQ-207 (FAIL-949): the health check compares the migration ledger with the
// code, 503s on a missing production EMAIL_FROM, and keeps details for the
// cron/owner token.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeHealth, expectedMigrations, LEDGER_UNREADABLE_WARNING, JIT_SQL } from "./health";
import { hasCronToken } from "./cron-auth";

const PROD = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://x",
  AUTH_JWT_SECRET: "s",
  APP_BASE_URL: "https://x",
  RESEND_API_KEY: "r",
  AUTH_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  CHOICE_ORDER_SECRET: "c",
  ANTHROPIC_API_KEY: "k",
  EMAIL_FROM: "Ascendra <no-reply@ascendra-learn.com>",
};
const db = async (sql: string) => [{ ok: sql === JIT_SQL ? false : true }];

describe("ledger check", () => {
  test("every shipped migration recorded: ok", async () => {
    const r = await computeHealth(db, PROD, { expected: ["001_a.sql", "002_b.sql"], recorded: async () => ["002_b.sql", "001_a.sql", "000_extra.sql"] });
    assert.deepEqual(r, { kind: "ok" });
  });
  test("a shipped migration missing from the ledger is ledger_incomplete, by filename", async () => {
    const r = await computeHealth(db, PROD, { expected: ["001_a.sql", "071_x.sql"], recorded: async () => ["001_a.sql"] });
    assert.deepEqual(r, { kind: "ledger_incomplete", unrecorded: ["071_x.sql"] });
  });
  test("an unreadable ledger table is an error (not a pass)", async () => {
    const r = await computeHealth(db, PROD, {
      expected: ["001_a.sql"],
      recorded: async () => {
        throw Object.assign(new Error('relation "schema_migrations" does not exist'), { code: "42P01" });
      },
    });
    assert.equal(r.kind, "error");
  });
  test("migration files not in the deployment: skipped with a warning, not a 503", async () => {
    const r = await computeHealth(db, PROD, { expected: null, recorded: async () => [] });
    assert.deepEqual(r, { kind: "ok", warnings: [LEDGER_UNREADABLE_WARNING] });
  });
  test("probes failing still wins over the ledger", async () => {
    const r = await computeHealth(async () => [{ ok: false }], PROD, { expected: ["a.sql"], recorded: async () => ["a.sql"] });
    assert.equal(r.kind, "schema_incomplete");
  });
  test("expectedMigrations lists the .sql files of a directory, sorted; null when there are none or the dir is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    assert.equal(expectedMigrations(dir), null);
    writeFileSync(join(dir, "002_b.sql"), "");
    writeFileSync(join(dir, "001_a.sql"), "");
    writeFileSync(join(dir, "notes.md"), "");
    assert.deepEqual(expectedMigrations(dir), ["001_a.sql", "002_b.sql"]);
    assert.equal(expectedMigrations(join(dir, "nope")), null);
  });
  test("this repository's own migrations are listed", () => {
    const files = expectedMigrations()!;
    assert.ok(files.includes("071_app_runtime_role.sql"));
    assert.ok(files.every((f) => f.endsWith(".sql")));
  });
});

describe("production EMAIL_FROM", () => {
  test("unset or resend.dev in production is misconfigured (503), before touching the database", async () => {
    for (const from of [undefined, "", "onboarding@resend.dev", "Ascendra <onboarding@Resend.dev>"]) {
      let touched = false;
      const r = await computeHealth(async () => ((touched = true), [{ ok: true }]), { ...PROD, EMAIL_FROM: from });
      assert.equal(r.kind, "misconfigured", String(from));
      assert.equal(touched, false);
    }
  });
  test("a real sender passes; outside production it is not required", async () => {
    assert.equal((await computeHealth(db, PROD)).kind, "ok");
    const dev = await computeHealth(db, { ...PROD, NODE_ENV: "development", EMAIL_FROM: undefined });
    assert.equal(dev.kind, "ok");
  });
});

describe("hasCronToken", () => {
  const saved = process.env.CRON_SECRET;
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });
  const req = (auth?: string) => new Request("https://x.test/api/health", { headers: auth ? { authorization: auth } : {} });
  test("true only with the exact bearer secret", () => {
    process.env.CRON_SECRET = "s3cret-value";
    assert.equal(hasCronToken(req("Bearer s3cret-value")), true);
    assert.equal(hasCronToken(req("Bearer s3cret-valuf")), false);
    assert.equal(hasCronToken(req("Bearer s3cret-value-and-more")), false);
    assert.equal(hasCronToken(req()), false);
  });
  test("false when no secret is configured, even for an empty bearer", () => {
    delete process.env.CRON_SECRET;
    assert.equal(hasCronToken(req("Bearer ")), false);
    assert.equal(hasCronToken(req("Bearer undefined")), false);
  });
});
