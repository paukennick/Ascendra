// REQ-177: POST /api/auth/unlock, the lock screen after time away for a
// learner without biometric unlock. Against a real Postgres: the password
// (or a backup code) unlocks, a wrong one is refused with the reauth shape
// the app recognises, the shared try budget applies, and nothing about the
// session changes. No model is called; no mail is sent.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-applock";
process.env.AUTH_ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString("base64");
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, closePool } from "./db";
import { hashPassword } from "./auth/passwords";
import { signAccessToken } from "./auth/tokens";
import { REAUTH_LIMIT } from "./auth/reauth";
import { POST as unlock } from "../app/api/auth/unlock/route";

const testPw = (s: string) => s;
const run = Date.now().toString(36);
const users: string[] = [];

async function newUser(password: string | null): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, password_hash) values ($1, $2, $3)`, [
    u,
    `lock-${run}-${users.length}@example.test`,
    password === null ? null : await hashPassword(password),
  ]);
  return u;
}
const token = (u: string) => signAccessToken({ sub: u, email: `${u}@example.test` });
const post = (u: string | null, body: unknown) =>
  unlock(
    new Request("http://t/api/auth/unlock", {
      method: "POST",
      headers: { "content-type": "application/json", ...(u ? { authorization: `Bearer ${token(u)}` } : {}) },
      body: JSON.stringify(body),
    })
  );

after(async () => {
  await query(`delete from auth_events where user_id = any($1::uuid[])`, [users]).catch(() => undefined);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("app lock unlock route (REQ-177)", () => {
  test("the right password unlocks; nothing about the session changes", async () => {
    const u = await newUser(testPw("correct horse 1"));
    const before = await query(`select token_version from app_users where id = $1`, [u]);
    const res = await post(u, { reauth: testPw("correct horse 1") });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { unlocked: true });
    assert.deepEqual(await query(`select token_version from app_users where id = $1`, [u]), before);
  });

  test("a wrong password is refused with reauthRequired, so the app doesn't refresh and resend it", async () => {
    const u = await newUser(testPw("correct horse 2"));
    const res = await post(u, { reauth: testPw("nope") });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.reauthRequired, true);
    assert.equal(body.methods.password, true);
  });

  test("an empty body asks for the password", async () => {
    const u = await newUser(testPw("correct horse 3"));
    const res = await post(u, {});
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /password/i);
  });

  test("no session: 401 without reauthRequired (the app refreshes, then retries)", async () => {
    const res = await post(null, { reauth: "x" });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).reauthRequired, undefined);
  });

  test("the shared reauth budget stops guessing", async () => {
    const u = await newUser(testPw("correct horse 4"));
    for (let i = 0; i < REAUTH_LIMIT.max; i++) assert.equal((await post(u, { reauth: `guess-${i}` })).status, 401);
    const res = await post(u, { reauth: testPw("correct horse 4") });
    assert.equal(res.status, 429, "even the right password waits once the budget is spent");
  });
});
