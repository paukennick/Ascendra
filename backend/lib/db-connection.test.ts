// REQ-207 (FAIL-942, FAIL-943): TLS verification is opt-in and fails closed;
// the startup statement_timeout is sent where a database accepts it.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sslOption, startupStatementTimeoutMs, isPoolerUrl, lockTimeoutSql, DEFAULT_STATEMENT_TIMEOUT_MS } from "./db-connection";

const PEM = "-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----\n";

describe("sslOption (FAIL-942)", () => {
  test("unset: unchanged behaviour (encrypted, not verified)", () => {
    assert.deepEqual(sslOption({}), { rejectUnauthorized: false });
  });
  test("PGSSLMODE=disable turns TLS off, even with a CA configured", () => {
    assert.equal(sslOption({ PGSSLMODE: "disable" }), false);
    assert.equal(sslOption({ PGSSLMODE: "disable", DATABASE_CA_CERT: PEM }), false);
  });
  test("DATABASE_CA_CERT as PEM text pins the CA and verifies the server", () => {
    assert.deepEqual(sslOption({ DATABASE_CA_CERT: PEM }), { ca: PEM.trim(), rejectUnauthorized: true });
  });
  test("a one-line value with literal \\n sequences (a Vercel env var) is restored to a PEM", () => {
    const oneLine = PEM.trim().replace(/\n/g, "\\n");
    const o = sslOption({ DATABASE_CA_CERT: oneLine }) as { ca: string; rejectUnauthorized: boolean };
    assert.equal(o.ca, PEM.trim());
    assert.equal(o.rejectUnauthorized, true);
  });
  test("PGSSLROOTCERT as a file path (libpq's name) is read", () => {
    const dir = mkdtempSync(join(tmpdir(), "ca-"));
    const file = join(dir, "root.crt");
    writeFileSync(file, PEM);
    assert.deepEqual(sslOption({ PGSSLROOTCERT: file }), { ca: PEM, rejectUnauthorized: true });
    assert.deepEqual(sslOption({ DATABASE_CA_CERT: file }), { ca: PEM, rejectUnauthorized: true });
  });
  test("DATABASE_CA_CERT wins over PGSSLROOTCERT", () => {
    const o = sslOption({ DATABASE_CA_CERT: PEM, PGSSLROOTCERT: "/nonexistent" }) as { ca: string };
    assert.equal(o.ca, PEM.trim());
  });
  test("a CA that is set but unreadable or not a certificate throws; it never falls back to unverified", () => {
    assert.throws(() => sslOption({ DATABASE_CA_CERT: "/no/such/file.crt" }), /neither a PEM certificate nor a readable file/);
    assert.throws(() => sslOption({ PGSSLROOTCERT: "/no/such/file.crt" }), /PGSSLROOTCERT/);
    const dir = mkdtempSync(join(tmpdir(), "ca-"));
    const file = join(dir, "junk.txt");
    writeFileSync(file, "not a certificate");
    assert.throws(() => sslOption({ DATABASE_CA_CERT: file }), /does not contain a PEM certificate/);
  });
  test("an error never echoes the pasted value", () => {
    assert.throws(() => sslOption({ DATABASE_CA_CERT: "super-secret-looking-value" }), (e: Error) => !e.message.includes("super-secret"));
  });
});

describe("startupStatementTimeoutMs (FAIL-943)", () => {
  const direct = "postgres://u:p@db.abcdefgh.supabase.co:5432/postgres";
  const session = "postgres://u.ref:p@aws-0-us-west-1.pooler.supabase.com:5432/postgres";
  const txn = "postgres://u.ref:p@aws-0-us-west-1.pooler.supabase.com:6543/postgres";
  test("a direct or local database gets the default", () => {
    assert.equal(startupStatementTimeoutMs(direct, {}), DEFAULT_STATEMENT_TIMEOUT_MS);
    assert.equal(startupStatementTimeoutMs("postgres://postgres:postgres@localhost:5432/x", {}), DEFAULT_STATEMENT_TIMEOUT_MS);
  });
  test("a pooler gets nothing unless asked (the app_runtime role setting covers it)", () => {
    assert.equal(startupStatementTimeoutMs(session, {}), undefined);
    assert.equal(startupStatementTimeoutMs(txn, {}), undefined);
    assert.equal(startupStatementTimeoutMs("postgres://u:p@somehost:6543/x", {}), undefined);
    assert.equal(startupStatementTimeoutMs(txn, { DB_STATEMENT_TIMEOUT_MS: "20000" }), 20000);
  });
  test("0 turns it off anywhere; junk is refused", () => {
    assert.equal(startupStatementTimeoutMs(direct, { DB_STATEMENT_TIMEOUT_MS: "0" }), undefined);
    for (const bad of ["abc", "-5", "1.5", "9999999"]) {
      assert.throws(() => startupStatementTimeoutMs(direct, { DB_STATEMENT_TIMEOUT_MS: bad }), /DB_STATEMENT_TIMEOUT_MS/);
    }
  });
  test("a url that cannot be parsed is treated as a pooler", () => {
    assert.equal(isPoolerUrl("not a url"), true);
  });
});

describe("lockTimeoutSql (FAIL-944)", () => {
  test("5s by default, overridable, 0 turns off, junk refused (it is interpolated into SQL)", () => {
    assert.equal(lockTimeoutSql({}), "set lock_timeout = '5s'");
    assert.equal(lockTimeoutSql({ MIGRATION_LOCK_TIMEOUT: "500ms" }), "set lock_timeout = '500ms'");
    assert.equal(lockTimeoutSql({ MIGRATION_LOCK_TIMEOUT: "0" }), null);
    for (const bad of ["5s'; drop table x; --", "abc", "-1s", "5 s", ""]) {
      if (bad === "") assert.equal(lockTimeoutSql({ MIGRATION_LOCK_TIMEOUT: bad }), "set lock_timeout = '5s'");
      else assert.throws(() => lockTimeoutSql({ MIGRATION_LOCK_TIMEOUT: bad }), /MIGRATION_LOCK_TIMEOUT/);
    }
  });
});
