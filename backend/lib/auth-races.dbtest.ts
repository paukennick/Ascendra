// Concurrency tests for single-use auth secrets against a real Postgres
// (locally: DATABASE_URL=... PGSSLMODE=disable npm run test:db). Each test
// fires N identical consumes at once and asserts exactly one wins. A
// read-then-write consume lets every one of them through.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto, { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { query, queryOne, closePool } from "./db";
import { rotateRefreshToken, createRefreshToken, RefreshTokenError } from "./auth/tokens";
import { createLoginChallenge, setChallengeEmailCode } from "./auth/mfaChallenge";
import { generateBackupCodes, hashEmailCode, checkMfaDisableConfirmation } from "./auth/mfa";
import { verifyEmailToken, confirmEmailChangeToken } from "./auth/emailTokens";
import { POST as mfaVerify } from "../app/api/auth/mfa/verify/route";
import { POST as resetPassword } from "../app/api/auth/reset-password/route";

process.env.AUTH_JWT_SECRET ??= "auth-races-test-secret";

const N = 5;
const run = Date.now().toString(36);
const users: string[] = [];
const challengeTokens: string[] = [];

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const future = () => new Date(Date.now() + 60 * 60 * 1000);

async function makeUser(tag: string, extra: { email_mfa_enabled?: boolean } = {}): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = `ar-${run}-${tag}@example.test`;
  await query(
    `insert into app_users (id, email, email_mfa_enabled, mfa_enabled) values ($1, $2, $3, $3)`,
    [id, email, extra.email_mfa_enabled ?? false]
  );
  users.push(id);
  return { id, email };
}

function post(body: unknown): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function statuses(reqs: Promise<Response>[]): Promise<number[]> {
  return (await Promise.all(reqs)).map((r) => r.status);
}

const count = (xs: number[], status: number) => xs.filter((s) => s === status).length;

after(async () => {
  for (const t of challengeTokens) {
    await query(`delete from auth_events where event_type = 'mfa_verify_attempt' and identifier = $1`, [sha(t)]);
  }
  await query(`delete from auth_events where identifier like $1`, [`ar-${run}-%`]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("refresh token rotation", () => {
  // REQ-203 (FAIL-865): two tabs refreshing at once present the same token.
  // That is a race, not theft: within REFRESH_REUSE_GRACE_SECONDS of the
  // rotation each caller gets its own live token and the family survives.
  test("concurrent refreshes with one token: exactly one rotates, the rest are forgiven inside the grace window", async () => {
    const u = await makeUser("refresh");
    const { raw, familyId } = await createRefreshToken(u.id);

    const results = await Promise.allSettled(Array.from({ length: N }, () => rotateRefreshToken(raw)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, N, "no caller is signed out by the race");
    const raws = results.map((r) => (r as PromiseFulfilledResult<{ raw: string }>).value.raw);
    assert.equal(new Set(raws).size, N, "each caller gets its own token");

    // The original is spent once, rotated to exactly one successor, and the
    // other callers' tokens are siblings in the same family. Nothing revoked
    // the family.
    const fam = await query<{ revoked_at: string | null; replaced_by_id: string | null }>(
      `select revoked_at, replaced_by_id from refresh_tokens where family_id = $1 order by created_at`,
      [familyId]
    );
    assert.equal(fam.length, N + 1);
    assert.equal(fam.filter((r) => r.revoked_at === null).length, N);
    assert.equal(fam.filter((r) => r.replaced_by_id !== null).length, 1);
  });

  // The rule outside the window is unchanged: reuse of a spent token revokes
  // the family, and the legitimate holder is forced to sign in again too.
  test("concurrent refreshes, replayed after the grace window: reuse revokes the whole family", async () => {
    const u = await makeUser("refresh-late");
    const { raw, familyId } = await createRefreshToken(u.id);
    const winner = await rotateRefreshToken(raw);
    await query(`update refresh_tokens set revoked_at = revoked_at - interval '1 minute' where family_id = $1 and revoked_at is not null`, [familyId]);

    const results = await Promise.allSettled(Array.from({ length: N }, () => rotateRefreshToken(raw)));
    const lost = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    assert.equal(lost.length, N, "every late replay is refused");
    for (const l of lost) assert.ok(l.reason instanceof RefreshTokenError);

    const fam = await query<{ revoked_at: string | null }>(`select revoked_at from refresh_tokens where family_id = $1`, [familyId]);
    assert.equal(fam.length, 2, "the original and its one successor; late replays minted nothing");
    assert.ok(fam.every((r) => r.revoked_at !== null));
    await assert.rejects(() => rotateRefreshToken(winner.raw), RefreshTokenError);
  });

  test("a single rotation still works and links the successor", async () => {
    const u = await makeUser("refresh-ok");
    const { raw, familyId } = await createRefreshToken(u.id, { deviceLabel: "phone" });
    const next = await rotateRefreshToken(raw);
    assert.equal(next.userId, u.id);
    const rows = await query<{ revoked_at: string | null; replaced_by_id: string | null; device_label: string | null }>(
      `select revoked_at, replaced_by_id, device_label from refresh_tokens where family_id = $1 order by created_at`,
      [familyId]
    );
    assert.equal(rows.length, 2);
    assert.ok(rows[0].revoked_at && rows[0].replaced_by_id);
    assert.equal(rows[1].revoked_at, null);
    assert.equal(rows[1].device_label, "phone");
    // The successor rotates; the spent original, replayed after the grace
    // window (REQ-203), is reuse.
    await rotateRefreshToken(next.raw);
    await query(`update refresh_tokens set revoked_at = revoked_at - interval '1 minute' where family_id = $1 and revoked_at is not null`, [familyId]);
    await assert.rejects(() => rotateRefreshToken(raw), RefreshTokenError);
  });

  test("an expired token is rejected and not consumed", async () => {
    const u = await makeUser("refresh-exp");
    const { raw } = await createRefreshToken(u.id);
    await query(`update refresh_tokens set expires_at = now() - interval '1 minute' where user_id = $1`, [u.id]);
    await assert.rejects(() => rotateRefreshToken(raw), /expired/);
    const r = await queryOne<{ revoked_at: string | null }>(`select revoked_at from refresh_tokens where user_id = $1`, [u.id]);
    assert.equal(r!.revoked_at, null);
  });
});

describe("MFA login verify", () => {
  async function mfaUser(tag: string) {
    const u = await makeUser(tag, { email_mfa_enabled: true });
    const { raw, hashed } = await generateBackupCodes();
    for (const h of hashed) await query(`insert into mfa_backup_codes (user_id, method, code_hash) values ($1, 'email', $2)`, [u.id, h]);
    return { ...u, codes: raw };
  }
  async function challenge(userId: string): Promise<string> {
    const t = await createLoginChallenge(userId);
    challengeTokens.push(t);
    return t;
  }

  test("one backup code used on several challenges at once logs in exactly once", async () => {
    const u = await mfaUser("bc");
    const tokens = await Promise.all(Array.from({ length: N }, () => challenge(u.id)));
    const s = await statuses(tokens.map((t) => mfaVerify(post({ challengeToken: t, code: u.codes[0] }))));
    assert.equal(count(s, 200), 1, `statuses ${s}`);
    assert.equal(count(s, 401), N - 1);
    const used = await query(`select 1 from mfa_backup_codes where user_id = $1 and used_at is not null`, [u.id]);
    assert.equal(used.length, 1);
    const consumed = await query(`select 1 from login_challenges where user_id = $1 and consumed_at is not null`, [u.id]);
    assert.equal(consumed.length, 1, "challenges of losing requests stay unconsumed");
  });

  test("one challenge replayed with different valid backup codes mints one session and burns one code", async () => {
    const u = await mfaUser("chal");
    const t = await challenge(u.id);
    const s = await statuses(u.codes.slice(0, N).map((c) => mfaVerify(post({ challengeToken: t, code: c }))));
    assert.equal(count(s, 200), 1, `statuses ${s}`);
    assert.equal(count(s, 401), N - 1);
    const used = await query(`select 1 from mfa_backup_codes where user_id = $1 and used_at is not null`, [u.id]);
    assert.equal(used.length, 1, "losing requests must not burn their backup codes");
    const sessions = await query(`select 1 from refresh_tokens where user_id = $1`, [u.id]);
    assert.equal(sessions.length, 1);
  });

  test("one challenge replayed with the same emailed code mints one session", async () => {
    const u = await mfaUser("emailcode");
    const t = await challenge(u.id);
    const ch = await queryOne<{ id: string }>(`select id from login_challenges where user_id = $1`, [u.id]);
    await setChallengeEmailCode(ch!.id, await hashEmailCode("123456"), future());
    const s = await statuses(Array.from({ length: N }, () => mfaVerify(post({ challengeToken: t, code: "123456" }))));
    assert.equal(count(s, 200), 1, `statuses ${s}`);
    const sessions = await query(`select 1 from refresh_tokens where user_id = $1`, [u.id]);
    assert.equal(sessions.length, 1);
  });

  test("a wrong code still does not consume the challenge", async () => {
    const u = await mfaUser("wrong");
    const t = await challenge(u.id);
    const bad = await mfaVerify(post({ challengeToken: t, code: "ZZZZ-ZZZZ" }));
    assert.equal(bad.status, 401);
    const good = await mfaVerify(post({ challengeToken: t, code: u.codes[0] }));
    assert.equal(good.status, 200);
  });
});

describe("password reset", () => {
  test("concurrent resets with one token: exactly one applies", async () => {
    const u = await makeUser("reset");
    const token = crypto.randomBytes(16).toString("hex");
    await query(`insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)`, [u.id, sha(token), future()]);
    await createRefreshToken(u.id);

    const passwords = Array.from({ length: N }, (_, i) => `new-password-${i}`);
    const s = await statuses(passwords.map((p) => resetPassword(post({ token, newPassword: p }))));
    assert.equal(count(s, 200), 1, `statuses ${s}`);
    assert.equal(count(s, 400), N - 1);

    const row = await queryOne<{ password_hash: string }>(`select password_hash from app_users where id = $1`, [u.id]);
    const matching = await Promise.all(passwords.map((p) => bcrypt.compare(p, row!.password_hash)));
    assert.equal(matching.filter(Boolean).length, 1, "stored password belongs to the one winning request");
    const live = await query(`select 1 from refresh_tokens where user_id = $1 and revoked_at is null`, [u.id]);
    assert.equal(live.length, 0, "sessions revoked");
  });

  test("an expired token is rejected and leaves the password alone", async () => {
    const u = await makeUser("reset-exp");
    const token = crypto.randomBytes(16).toString("hex");
    await query(`insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1, $2, now() - interval '1 minute')`, [
      u.id,
      sha(token),
    ]);
    const res = await resetPassword(post({ token, newPassword: "another-password" }));
    assert.equal(res.status, 400);
    const row = await queryOne<{ password_hash: string | null }>(`select password_hash from app_users where id = $1`, [u.id]);
    assert.equal(row!.password_hash, null);
  });
});

describe("email verification link", () => {
  test("concurrent clicks: exactly one verifies", async () => {
    const u = await makeUser("verify");
    const token = crypto.randomBytes(16).toString("hex");
    await query(`insert into email_verification_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)`, [u.id, sha(token), future()]);
    const out = await Promise.all(Array.from({ length: N }, () => verifyEmailToken(token)));
    assert.equal(out.filter((o) => o.ok).length, 1);
    const row = await queryOne<{ email_verified_at: string | null }>(`select email_verified_at from app_users where id = $1`, [u.id]);
    assert.ok(row!.email_verified_at);
  });
});

describe("email change link", () => {
  test("concurrent clicks: exactly one applies", async () => {
    const u = await makeUser("change");
    const newEmail = `ar-${run}-change-new@example.test`;
    const token = crypto.randomBytes(16).toString("hex");
    await query(`insert into email_change_tokens (user_id, new_email, token_hash, expires_at) values ($1, $2, $3, $4)`, [
      u.id,
      newEmail,
      sha(token),
      future(),
    ]);
    const out = await Promise.allSettled(Array.from({ length: N }, () => confirmEmailChangeToken(token)));
    const oks = out.filter((o) => o.status === "fulfilled" && o.value.ok);
    assert.equal(oks.length, 1, JSON.stringify(out));
    assert.equal(out.filter((o) => o.status === "rejected").length, 0, "losers fail cleanly, not with a thrown error");
    const row = await queryOne<{ email: string }>(`select email from app_users where id = $1`, [u.id]);
    assert.equal(row!.email, newEmail);
  });

  test("target email taken by someone else: nothing changes and the token is not burned", async () => {
    const u = await makeUser("change-taken");
    const other = await makeUser("change-owner");
    const token = crypto.randomBytes(16).toString("hex");
    await query(`insert into email_change_tokens (user_id, new_email, token_hash, expires_at) values ($1, $2, $3, $4)`, [
      u.id,
      other.email,
      sha(token),
      future(),
    ]);
    const r = await confirmEmailChangeToken(token);
    assert.equal(r.ok, false);
    const t = await queryOne<{ consumed_at: string | null }>(`select consumed_at from email_change_tokens where token_hash = $1`, [sha(token)]);
    assert.equal(t!.consumed_at, null);
    const row = await queryOne<{ email: string }>(`select email from app_users where id = $1`, [u.id]);
    assert.equal(row!.email, u.email);
  });
});

describe("MFA disable confirmation code", () => {
  test("one code confirms exactly one concurrent disable", async () => {
    const u = await makeUser("disable");
    await query(
      `update app_users set mfa_disable_confirmation_code_hash = $1, mfa_disable_confirmation_expires_at = $2,
         mfa_disable_confirmation_method = 'totp' where id = $3`,
      [await hashEmailCode("654321"), future(), u.id]
    );
    const out = await Promise.all(Array.from({ length: N }, () => checkMfaDisableConfirmation(u.id, "totp", "654321")));
    assert.equal(out.filter(Boolean).length, 1);
    const row = await queryOne<{ mfa_disable_confirmation_code_hash: string | null }>(
      `select mfa_disable_confirmation_code_hash from app_users where id = $1`,
      [u.id]
    );
    assert.equal(row!.mfa_disable_confirmation_code_hash, null);
  });

  test("wrong method or wrong code does not consume", async () => {
    const u = await makeUser("disable-wrong");
    await query(
      `update app_users set mfa_disable_confirmation_code_hash = $1, mfa_disable_confirmation_expires_at = $2,
         mfa_disable_confirmation_method = 'totp' where id = $3`,
      [await hashEmailCode("111111"), future(), u.id]
    );
    assert.equal(await checkMfaDisableConfirmation(u.id, "email", "111111"), false);
    assert.equal(await checkMfaDisableConfirmation(u.id, "totp", "222222"), false);
    assert.equal(await checkMfaDisableConfirmation(u.id, "totp", "111111"), true);
  });
});
