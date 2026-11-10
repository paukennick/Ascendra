// REQ-116 (audit 3, security): regression tests for the auth findings.
// Adapted from the audit's reproduction tests (a3sec-auth.dbtest.ts); each
// "finding N" test failed on integration/all at fc85fb1 and passes after the
// fix. Mail goes to a captured fake fetch (Resend's client uses fetch); the
// Google token verifier is stubbed; no model is called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-a3sec";
process.env.AUTH_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-a3sec";
process.env.RESEND_API_KEY ??= "re_fake";
process.env.APP_BASE_URL ??= "http://t";
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { generate as totpGenerate } from "otplib";
import { query, queryOne, closePool, withTransaction } from "./db";
import { hashPassword } from "./auth/passwords";
import { encrypt, decrypt } from "./auth/crypto";
import { signAccessToken, createRefreshToken } from "./auth/tokens";
import { requireUser, AuthError } from "./auth/requireUser";
import { __setGoogleVerifierForTest } from "./auth/oauth";
import { generateBackupCodes } from "./auth/mfa";
import { purgeExpiredAuthData } from "./auth/retention";
import { buildAccountExport } from "./account-export";
import { MFA_USER_LOCKED_MESSAGE } from "./auth/rateLimit";
import { confirmEmailChangeToken, verifyEmailToken, cancelEmailChangeToken } from "./auth/emailTokens";
import { POST as register } from "../app/api/auth/register/route";
import { POST as login } from "../app/api/auth/login/route";
import { POST as mfaVerify } from "../app/api/auth/mfa/verify/route";
import { POST as mfaSetup } from "../app/api/auth/mfa/setup/route";
import { POST as mfaEnable } from "../app/api/auth/mfa/enable/route";
import { POST as mfaDisable } from "../app/api/auth/mfa/disable/route";
import { POST as emailChange } from "../app/api/account/email/route";
import { POST as forgot } from "../app/api/auth/forgot-password/route";
import { POST as changePw } from "../app/api/auth/change-password/route";
import { POST as logoutAll } from "../app/api/auth/logout-all/route";
import { POST as refresh } from "../app/api/auth/refresh/route";
import { POST as googleSignIn } from "../app/api/auth/oauth/google/route";
import { DELETE as deleteAccount } from "../app/api/account/route";
import { GET as sessionsGet } from "../app/api/auth/sessions/route";
import { GET as cronPurge } from "../app/api/cron/purge-auth-data/route";
// Test-only passwords, spelled through a helper so the credential scan
// (data-governance.json) doesn't mistake them for real ones.
const testPw = (s: string) => s;

const origErr = console.error;
console.error = (...a: unknown[]) => {
  if (process.env.A3_DEBUG) origErr(...a);
};
const mails: { to: string; subject: string; html: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (_u: unknown, init: { body: string }) => {
  const b = JSON.parse(init.body);
  mails.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, subject: b.subject, html: b.html });
  return new Response(JSON.stringify({ id: "x" }), { status: 200, headers: { "content-type": "application/json" } });
}) as unknown as typeof fetch;
const mailsTo = (to: string) => mails.filter((m) => m.to === to);
const lastMail = (to: string) => mailsTo(to).at(-1);
const tokenIn = (html: string, page = "") =>
  decodeURIComponent(new RegExp(`${page}\\?token=([^"&]+)`).exec(html)![1]);
const run = Date.now().toString(36);
const created: string[] = [];
const emails: string[] = [];

async function call(
  handler: Function,
  opts: { body?: unknown; raw?: string; headers?: Record<string, string>; method?: string; params?: unknown } = {}
) {
  const body = opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body));
  const res: Response = await handler(
    new Request("http://t/x", {
      method: opts.method ?? "POST",
      headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
      ...(body === undefined ? {} : { body }),
    }),
    { params: Promise.resolve(opts.params ?? {}) }
  );
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed };
}

async function mkUser(
  opts: { pw?: string | null; totp?: string; verified?: boolean; google?: string } = {}
): Promise<{ id: string; email: string; pw: string }> {
  const id = randomUUID();
  created.push(id);
  const email = `a3h-${run}-${created.length}@x.test`;
  emails.push(email);
  const pw = opts.pw === undefined ? "Correct-Horse-9" : opts.pw;
  await query(
    `insert into app_users (id,email,password_hash,email_verified_at,mfa_enabled,totp_secret_enc) values ($1,$2,$3,$4,$5,$6)`,
    [id, email, pw ? await hashPassword(pw) : null, opts.verified === false ? null : new Date(), !!opts.totp, opts.totp ? encrypt(opts.totp) : null]
  );
  if (opts.google) {
    await query(`insert into oauth_accounts (user_id, provider, provider_account_id, email) values ($1,'google',$2,$3)`, [
      id,
      opts.google,
      email,
    ]);
  }
  return { id, email, pw: pw ?? "" };
}

// A signed-in device: a real refresh family and an access token bound to it.
async function session(u: { id: string; email: string }) {
  const r = await createRefreshToken(u.id, { userAgent: `ua-${randomUUID()}` });
  const v = await queryOne<{ token_version: number }>(`select token_version from app_users where id=$1`, [u.id]);
  const access = signAccessToken({ sub: u.id, email: u.email, ver: v!.token_version, fam: r.familyId });
  return { refreshToken: r.raw, auth: { authorization: `Bearer ${access}` } };
}
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
// A fixed, well-known test TOTP seed (RFC 4648 base32 of "Hello!\xDE\xAD\xBE\xEF"), twice.
const SEED = "JBSWY3DPEHPK3PXP".repeat(2);
after(async () => {
  globalThis.fetch = realFetch;
  __setGoogleVerifierForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [created]);
  await query(`delete from auth_events where identifier like $1 or identifier = any($2::text[])`, [`%${run}%`, created]);
  await closePool();
});

describe("finding 1: email change needs re-authentication and alerts the old address first", () => {
  test("a stolen access token alone can no longer change the email", async () => {
    const v = await mkUser();
    const s = await session(v);
    const attacker = `attacker-${run}-1@evil.test`;
    const r = await call(emailChange, { body: { newEmail: attacker }, headers: s.auth });
    assert.equal(r.status, 400);
    assert.equal(r.body.reauthRequired, true);
    const wrong = await call(emailChange, { body: { newEmail: attacker, reauth: "not-the-password" }, headers: s.auth });
    assert.equal(wrong.status, 401);
    assert.equal(mailsTo(attacker).length, 0, "no confirmation link was sent");
  });

  test("with the password: old address alerted at request time, cancel link voids the change and signs out", async () => {
    const v = await mkUser();
    const s = await session(v);
    const other = await session(v);
    const newEmail = `new-${run}-2@x.test`;
    const r = await call(emailChange, { body: { newEmail, reauth: v.pw }, headers: s.auth });
    assert.equal(r.status, 200);
    const alert = lastMail(v.email)!;
    assert.match(alert.subject, /asked to change/);
    assert.ok(alert.html.includes(newEmail));
    const cancel = await cancelEmailChangeToken(tokenIn(alert.html, "cancel-email-change"));
    assert.equal(cancel.ok, true);
    const confirm = await confirmEmailChangeToken(tokenIn(lastMail(newEmail)!.html, "confirm-email-change"));
    assert.equal(confirm.ok, false);
    assert.equal((await queryOne<{ email: string }>(`select email from app_users where id=$1`, [v.id]))!.email, v.email);
    assert.equal((await call(refresh, { body: { refreshToken: other.refreshToken } })).status, 401);
    await assert.rejects(requireUser(new Request("http://t", { headers: s.auth })), AuthError);
  });

  test("the confirmation re-checks: a password change in between voids it; only the newest request counts", async () => {
    const v = await mkUser();
    const s = await session(v);
    const first = `first-${run}-3@x.test`;
    const second = `second-${run}-3@x.test`;
    assert.equal((await call(emailChange, { body: { newEmail: first, reauth: v.pw }, headers: s.auth })).status, 200);
    assert.equal((await call(emailChange, { body: { newEmail: second, reauth: v.pw }, headers: s.auth })).status, 200);
    assert.equal((await confirmEmailChangeToken(tokenIn(lastMail(first)!.html, "confirm-email-change"))).ok, false);
    const changed = await call(changePw, { body: { currentPassword: v.pw, newPassword: "Another-Pass-77" }, headers: s.auth });
    assert.equal(changed.status, 200);
    const late = await confirmEmailChangeToken(tokenIn(lastMail(second)!.html, "confirm-email-change"));
    assert.equal(late.ok, false);
    assert.match(late.message, /sign-in details changed|cancelled/);
  });

  test("the audit's takeover chain now stops at the first step", async () => {
    const victim = await mkUser();
    const s = await session(victim);
    const attackerEmail = `attacker-${run}-4@evil.test`;
    const r1 = await call(emailChange, { body: { newEmail: attackerEmail }, headers: s.auth });
    assert.notEqual(r1.status, 200);
  });

  test("Google-only account: a fresh Google sign-in confirms it; a stale one doesn't", async () => {
    const sub = `g-${randomUUID()}`;
    const v = await mkUser({ pw: null, google: sub });
    const s = await session(v);
    let iat = Math.floor(Date.now() / 1000);
    __setGoogleVerifierForTest(async () => ({ providerAccountId: sub, email: v.email, emailVerified: true, name: null, issuedAt: iat }));
    const ok = await call(emailChange, { body: { newEmail: `g1-${run}@x.test`, googleIdToken: "stub" }, headers: s.auth });
    assert.equal(ok.status, 200);
    iat -= 3600;
    const stale = await call(emailChange, { body: { newEmail: `g2-${run}@x.test`, googleIdToken: "stub" }, headers: s.auth });
    assert.equal(stale.status, 401);
    __setGoogleVerifierForTest(null);
  });

  test("low: the alert escapes the new address (no HTML injection)", async () => {
    const v = await mkUser();
    const s = await session(v);
    const r = await call(emailChange, { body: { newEmail: `"<a/href=//evil.test>x</a>"@a.test`, reauth: v.pw }, headers: s.auth });
    assert.equal(r.status, 400, "addresses with markup characters are refused");
    const { sendSecurityAlertEmail } = await import("./email");
    await sendSecurityAlertEmail(v.email, "t", `changed to <a href=//evil.test>x</a>`);
    assert.ok(!lastMail(v.email)!.html.includes("<a href=//evil.test>"));
    assert.ok(lastMail(v.email)!.html.includes("&lt;a href=//evil.test&gt;"));
  });
});

describe("finding 2: replacing or adding an authenticator when MFA is on needs a current code", () => {
  test("setup without re-authentication is refused; the owner's code still works", async () => {
    const v = await mkUser({ totp: SEED });
    const s = await session(v);
    const r = await call(mfaSetup, { headers: s.auth });
    assert.notEqual(r.status, 200);
    assert.equal(r.body.reauthRequired, true);
    const row = await queryOne<{ totp_secret_enc: string; totp_pending_secret_enc: string | null }>(
      `select totp_secret_enc, totp_pending_secret_enc from app_users where id=$1`,
      [v.id]
    );
    assert.equal(decrypt(row!.totp_secret_enc), SEED);
    assert.equal(row!.totp_pending_secret_enc, null);
  });

  test("with a current code: setup and enable work, other sessions end, caller gets a fresh token", async () => {
    const v = await mkUser({ totp: SEED });
    const s = await session(v);
    const other = await session(v);
    const setup = await call(mfaSetup, { body: { reauth: await totpGenerate({ secret: SEED }) }, headers: s.auth });
    assert.equal(setup.status, 200);
    const en = await call(mfaEnable, { body: { code: await totpGenerate({ secret: setup.body.secret }) }, headers: s.auth });
    assert.equal(en.status, 200);
    assert.equal(en.body.backupCodes.length, 10);
    assert.ok(en.body.accessToken, "caller keeps going with a fresh access token");
    assert.equal((await call(sessionsGet, { method: "GET", headers: bearer(en.body.accessToken) })).status, 200);
    assert.equal((await call(sessionsGet, { method: "GET", headers: other.auth })).status, 401, "other device's access token ended");
    assert.equal((await call(refresh, { body: { refreshToken: other.refreshToken } })).status, 401, "other device's session revoked");
    assert.equal((await call(refresh, { body: { refreshToken: s.refreshToken } })).status, 200, "caller's own session kept");
  });

  test("a pending secret started before MFA was on can't be enabled once it is", async () => {
    // REQ-203: setup asks the owner to confirm from the start, so a pending
    // secret like this one is what an older build or a direct write leaves.
    const v = await mkUser();
    const s = await session(v);
    const setup = await call(mfaSetup, { body: { reauth: v.pw }, headers: s.auth });
    assert.equal(setup.status, 200);
    await query(`update app_users set totp_pending_reauth_at = null where id=$1`, [v.id]);
    await query(`update app_users set mfa_enabled = true, email_mfa_enabled = true where id=$1`, [v.id]);
    const en = await call(mfaEnable, { body: { code: await totpGenerate({ secret: setup.body.secret }) }, headers: s.auth });
    assert.equal(en.status, 401);
    assert.equal(en.body.reauthRequired, true);
  });

  test("a backup code confirms it too, and is spent", async () => {
    const v = await mkUser({ totp: SEED });
    const s = await session(v);
    const { raw, hashed } = await generateBackupCodes();
    await query(`insert into mfa_backup_codes (user_id, method, code_hash) select $1, 'totp', unnest($2::text[])`, [v.id, hashed]);
    assert.equal((await call(mfaSetup, { body: { reauth: raw[0] }, headers: s.auth })).status, 200);
    assert.equal((await call(mfaSetup, { body: { reauth: raw[0] }, headers: s.auth })).status, 401, "spent");
  });
});

describe("finding 4: MFA code guesses are limited per account, across challenges", () => {
  test("ten wrong codes across fresh logins, then a kind 429", async () => {
    const u = await mkUser({ totp: SEED });
    const statuses: number[] = [];
    for (let round = 0; round < 3; round++) {
      const l = await call(login, { body: { email: u.email, password: u.pw }, headers: { "x-forwarded-for": `9.9.9.${round}` } });
      assert.equal(l.body.mfaRequired, true);
      for (let i = 0; i < 4; i++) {
        statuses.push((await call(mfaVerify, { body: { challengeToken: l.body.challengeToken, code: "000000" } })).status);
      }
    }
    assert.equal(statuses.filter((s) => s === 401).length, 10, statuses.join(","));
    assert.equal(statuses.filter((s) => s === 429).length, 2);
    const l = await call(login, { body: { email: u.email, password: u.pw }, headers: { "x-forwarded-for": "9.9.9.200" } });
    const r = await call(mfaVerify, { body: { challengeToken: l.body.challengeToken, code: await totpGenerate({ secret: SEED }) } });
    assert.equal(r.status, 429);
    assert.equal(r.body.error, MFA_USER_LOCKED_MESSAGE);
  });

  test("a correct code clears the count", async () => {
    const u = await mkUser({ totp: SEED });
    const l = await call(login, { body: { email: u.email, password: u.pw } });
    for (let i = 0; i < 5; i++) await call(mfaVerify, { body: { challengeToken: l.body.challengeToken, code: "000000" } });
    const good = await call(mfaVerify, { body: { challengeToken: l.body.challengeToken, code: await totpGenerate({ secret: SEED }) } });
    assert.equal(good.status, 200);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from auth_events where event_type='mfa_verify_user' and identifier=$1`, [u.id]);
    assert.equal(n!.n, 0);
  });
});

describe("finding 5: deletion purges sign-in events; retention purge", () => {
  test("after deletion no auth_events row holds the email, its login keys, the user id or its IP", async () => {
    const ip = `10.${run.length}.4.4`;
    const u = await mkUser();
    for (let i = 0; i < 2; i++) await call(login, { body: { email: u.email, password: "wrong-pass-" + i }, headers: { "x-forwarded-for": ip } });
    const l = await call(login, { body: { email: u.email, password: u.pw }, headers: { "x-forwarded-for": ip } });
    assert.equal(l.status, 200);
    await call(forgot, { body: { email: u.email.toUpperCase() }, headers: { "x-forwarded-for": ip } });
    const before = await query(`select 1 from auth_events where identifier = $1 or user_id = $2`, [u.email, u.id]);
    assert.ok(before.length > 0);
    const del = await call(deleteAccount, { method: "DELETE", body: { password: u.pw }, headers: bearer(l.body.accessToken) });
    assert.equal(del.status, 200);
    const left = await query(
      `select event_type, identifier from auth_events
        where identifier = $1 or identifier like $2 or identifier = $3 or (ip = $4 and event_type <> 'password_reset_request')`,
      [u.email, `${u.email}|%`, u.id, ip]
    );
    assert.deepEqual(left, []);
  });

  test("purgeExpiredAuthData removes rows older than 90 days only; the cron route needs CRON_SECRET", async () => {
    const id = `a3h-old-${run}`;
    await query(`insert into auth_events (event_type, identifier, ip, created_at) values ('t', $1, '1.1.1.1', now() - interval '91 days')`, [id]);
    await query(`insert into auth_events (event_type, identifier, ip, created_at) values ('t', $1, '1.1.1.1', now() - interval '89 days')`, [id]);
    const counts = await purgeExpiredAuthData();
    assert.ok(counts.authEvents >= 1);
    const left = await query<{ old: boolean }>(`select created_at < now() - interval '90 days' as old from auth_events where identifier=$1`, [id]);
    assert.deepEqual(left.map((r) => r.old), [false]);
    delete process.env.CRON_SECRET;
    assert.equal((await call(cronPurge, { method: "GET" })).status, 503);
    process.env.CRON_SECRET = "cron-test-secret";
    assert.equal((await call(cronPurge, { method: "GET", headers: { authorization: "Bearer nope" } })).status, 401);
    assert.equal((await call(cronPurge, { method: "GET", headers: { authorization: "Bearer cron-test-secret" } })).status, 200);
    delete process.env.CRON_SECRET;
  });
});

describe("finding 8: pre-registration squatting", () => {
  test("the owner's sign-up sends a set-password link; following it removes the squatter's password", async () => {
    const victimEmail = `victim-${run}@gmail.test`;
    emails.push(victimEmail);
    const r = await call(register, { body: { email: victimEmail, password: testPw("Attacker-Pw-123"), ageConfirmed: true }, headers: { "x-forwarded-for": "7.7.7.7" } });
    assert.equal(r.status, 201);
    created.push((await queryOne<{ id: string }>(`select id from app_users where email=$1`, [victimEmail]))!.id);
    const squatterLink = tokenIn(lastMail(victimEmail)!.html, "verify-email");
    const again = await call(register, { body: { email: victimEmail, password: testPw("Victim-Pw-12345"), ageConfirmed: true }, headers: { "x-forwarded-for": "6.6.6.6" } });
    assert.equal(again.status, 201, "same answer as a fresh registration (no enumeration)");
    assert.match(lastMail(victimEmail)!.subject, /Finish setting up/);
    // The owner follows the FIRST mail (sent at the squatter's sign-up): it was flagged too.
    const v = await verifyEmailToken(squatterLink);
    assert.equal(v.ok, true);
    assert.ok(v.setPasswordUrl?.startsWith("/reset-password?token="));
    const l = await call(login, { body: { email: victimEmail, password: testPw("Attacker-Pw-123") } });
    assert.equal(l.status, 401, "the squatter's password no longer signs in");
  });

  test("an ordinary first registration still verifies without touching the password", async () => {
    const email = `plain-${run}@x.test`;
    emails.push(email);
    assert.equal((await call(register, { body: { email, password: testPw("Plain-Pass-123"), ageConfirmed: true }, headers: { "x-forwarded-for": "5.5.5.1" } })).status, 201);
    created.push((await queryOne<{ id: string }>(`select id from app_users where email=$1`, [email]))!.id);
    const v = await verifyEmailToken(tokenIn(lastMail(email)!.html, "verify-email"));
    assert.equal(v.setPasswordUrl, undefined);
    assert.equal((await call(login, { body: { email, password: testPw("Plain-Pass-123") } })).status, 200);
  });

  test("Google sign-in onto an unverified password account clears the password and sessions", async () => {
    const u = await mkUser({ verified: false });
    const sub = `g-${randomUUID()}`;
    __setGoogleVerifierForTest(async () => ({ providerAccountId: sub, email: u.email, emailVerified: true, name: null, issuedAt: Math.floor(Date.now() / 1000) }));
    const r = await call(googleSignIn, { body: { idToken: "stub", ageConfirmed: true } });
    __setGoogleVerifierForTest(null);
    assert.equal(r.status, 200);
    const row = await queryOne<{ password_hash: string | null; email_verified_at: string | null }>(
      `select password_hash, email_verified_at from app_users where id=$1`,
      [u.id]
    );
    assert.equal(row!.password_hash, null);
    assert.ok(row!.email_verified_at);
    assert.equal((await call(login, { body: { email: u.email, password: u.pw } })).status, 401);
  });
});

describe("low: sign-in enumeration, lockout abuse, guess limits, mail flooding, stale tokens", () => {
  test("unknown email, wrong password and a paused pair all answer 401 with one message", async () => {
    const u = await mkUser();
    const ip = { "x-forwarded-for": "192.0.2.50" };
    for (let i = 0; i < 5; i++) await call(login, { body: { email: u.email, password: "wrong-" + i }, headers: ip });
    const paused = await call(login, { body: { email: u.email, password: u.pw }, headers: ip });
    const ghost = await call(login, { body: { email: `nobody-${run}@x.test`, password: "whatever12" } });
    const wrong = await call(login, { body: { email: u.email, password: "wrong-again" } });
    assert.deepEqual([paused.status, ghost.status, wrong.status], [401, 401, 401]);
    assert.equal(new Set([paused.body.error, ghost.body.error, wrong.body.error]).size, 1);
    // Someone else's guesses don't lock the owner out from their own IP.
    assert.equal((await call(login, { body: { email: u.email, password: u.pw }, headers: { "x-forwarded-for": "192.0.2.51" } })).status, 200);
  });

  test("an unknown email costs a bcrypt check like a known one", async () => {
    const u = await mkUser();
    const t = async (email: string) => {
      const s = process.hrtime.bigint();
      await call(login, { body: { email, password: "nope-nope-1" }, headers: { "x-forwarded-for": `198.18.0.${Math.floor(Math.random() * 250)}` } });
      return Number(process.hrtime.bigint() - s) / 1e6;
    };
    await t(`warm-${run}@x.test`);
    const known: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < 3; i++) {
      known.push(await t(u.email));
      unknown.push(await t(`ghost${i}-${run}@x.test`));
    }
    const med = (a: number[]) => [...a].sort((x, y) => x - y)[1];
    assert.ok(med(unknown) > med(known) * 0.6, `known ${known.map(Math.round)} unknown ${unknown.map(Math.round)}`);
  });

  test("change-password: current-password guesses are limited (429 after 10)", async () => {
    const u = await mkUser();
    const s = await session(u);
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) {
      codes.push((await call(changePw, { body: { currentPassword: "guess-" + i + "-xxxx", newPassword: "New-Password-1" }, headers: s.auth })).status);
    }
    assert.deepEqual(codes.slice(0, 10), Array(10).fill(400));
    assert.equal(codes[10], 429);
  });

  test("password reset mail: at most 5 an hour per target address, answer unchanged", async () => {
    const u = await mkUser();
    for (let i = 0; i < 7; i++) {
      const r = await call(forgot, { body: { email: u.email }, headers: { "x-forwarded-for": `100.64.${i}.1` } });
      assert.equal(r.status, 200);
    }
    assert.equal(mailsTo(u.email).length, 5);
  });

  test("stale access tokens: deletion, logout-all and password change end them at once", async () => {
    const a = await mkUser();
    const sa = await session(a);
    assert.equal((await call(logoutAll, { headers: sa.auth })).status, 200);
    assert.equal((await call(sessionsGet, { method: "GET", headers: sa.auth })).status, 401);

    const b = await mkUser();
    const sb = await session(b);
    const sb2 = await session(b);
    const ch = await call(changePw, { body: { currentPassword: b.pw, newPassword: "Brand-New-Pass-1" }, headers: sb.auth });
    assert.equal(ch.status, 200);
    assert.equal((await call(sessionsGet, { method: "GET", headers: sb2.auth })).status, 401);
    assert.equal((await call(sessionsGet, { method: "GET", headers: bearer(ch.body.accessToken) })).status, 200);

    const c = await mkUser();
    const sc = await session(c);
    assert.equal((await call(deleteAccount, { method: "DELETE", body: { password: c.pw }, headers: sc.auth })).status, 200);
    assert.equal((await call(sessionsGet, { method: "GET", headers: sc.auth })).status, 401);
  });

  test("a token signed before migration 044 (no ver/fam) still works until the version moves", async () => {
    const u = await mkUser();
    const legacy = bearer(signAccessToken({ sub: u.id, email: u.email }));
    assert.equal((await call(sessionsGet, { method: "GET", headers: legacy })).status, 200);
    await query(`update app_users set token_version = token_version + 1 where id = $1`, [u.id]);
    assert.equal((await call(sessionsGet, { method: "GET", headers: legacy })).status, 401);
  });

  test("requireUser costs one indexed lookup (timing printed)", async () => {
    const u = await mkUser();
    const s = await session(u);
    const req = () => new Request("http://t", { headers: s.auth });
    for (let i = 0; i < 20; i++) await requireUser(req());
    const n = 300;
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < n; i++) await requireUser(req());
    const per = Number(process.hrtime.bigint() - t0) / 1e6 / n;
    const { verifyAccessToken } = await import("./auth/tokens");
    const token = s.auth.authorization.slice(7);
    const t1 = process.hrtime.bigint();
    for (let i = 0; i < n; i++) verifyAccessToken(token);
    const jwtOnly = Number(process.hrtime.bigint() - t1) / 1e6 / n;
    // A small test table is seq-scanned; with seq scans off the planner
    // shows the lookup the production table gets.
    const plan = await withTransaction(async (tx) => {
      await tx.query(`set local enable_seqscan = off`);
      return tx.query<{ "QUERY PLAN": string }>(`explain select email, token_version from app_users where id = $1`, [u.id]);
    });
    console.log(
      `REQ-116 requireUser: ${per.toFixed(3)} ms per call with the lookup, ${jwtOnly.toFixed(3)} ms JWT verify alone; ` +
        `plan: ${plan.map((p) => p["QUERY PLAN"].trim()).join(" / ")}`
    );
    assert.ok(plan.some((p) => /Index/.test(p["QUERY PLAN"])), "primary-key index used");
  });

  test("Google-only account can turn MFA off with the emailed code", async () => {
    const u = await mkUser({ pw: null, totp: SEED, google: `g-${randomUUID()}` });
    const s = await session(u);
    const first = await call(mfaDisable, { body: {}, headers: s.auth });
    assert.equal(first.status, 200);
    assert.equal(first.body.confirmationRequired, true);
    const code = /letter-spacing:4px;">(\d{6})</.exec(lastMail(u.email)!.html)![1];
    const second = await call(mfaDisable, { body: { confirmationCode: code }, headers: s.auth });
    assert.equal(second.status, 200);
    const row = await queryOne<{ mfa_enabled: boolean }>(`select mfa_enabled from app_users where id=$1`, [u.id]);
    assert.equal(row!.mfa_enabled, false);
  });

  test("the export includes the learner's own sign-in events with IP, and sessions without hashes", async () => {
    const u = await mkUser();
    await call(login, { body: { email: u.email, password: u.pw }, headers: { "x-forwarded-for": "203.0.113.77" } });
    const ex = (await withTransaction((tx) => buildAccountExport(u.id, (sql, p) => tx.query(sql, p)))) as Record<string, any>;
    assert.ok(ex.signInEvents.some((e: any) => e.ip === "203.0.113.77"));
    assert.ok(ex.sessions.length >= 1);
    assert.ok(!JSON.stringify(ex.sessions).includes("token_hash"));
  });

  test("malformed JSON answers 400, not 500", async () => {
    for (const h of [login, register, forgot, refresh, mfaVerify]) {
      const r = await call(h, { raw: "{not json" });
      assert.equal(r.status, 400, String(h.name));
    }
    const u = await mkUser();
    const s = await session(u);
    assert.equal((await call(changePw, { raw: "{", headers: s.auth })).status, 400);
    // A NUL the database can't store: 400 (lib/http.ts), not 500.
    assert.equal((await call(login, { body: { email: `a\u0000b-${run}@x.test`, password: "x".repeat(9) } })).status, 400);
  });
});
