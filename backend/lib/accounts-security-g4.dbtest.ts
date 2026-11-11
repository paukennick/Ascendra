// REQ-219 (FAIL-1100..1129): accounts and security, fix batch G4. Each test
// reproduces a finding of the 2026-11 audit and failed before its fix, against
// a real Postgres with every migration applied (locally: DATABASE_URL=...
// PGSSLMODE=disable npm run test:db). Mail goes to a captured fake fetch; the
// Google verifier is stubbed; no model is called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-req219";
process.env.AUTH_ENCRYPTION_KEY ??= Buffer.alloc(32, 5).toString("base64");
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-req219";
process.env.RESEND_API_KEY ??= "re_fake";
process.env.APP_BASE_URL = "https://app.ascendra.test";
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { generate as totpGenerate } from "otplib";
import { query, queryOne, closePool } from "./db";
import { closeOwner } from "./test-owner";
import { __setTermsEnforcementForTest } from "./auth/requireUser";
import { hashPassword } from "./auth/passwords";
import { encrypt } from "./auth/crypto";
import { signAccessToken, createRefreshToken } from "./auth/tokens";
import { __setGoogleVerifierForTest } from "./auth/oauth";
import { hashEmailCode } from "./auth/mfa";
import { POST as mfaDisable } from "../app/api/auth/mfa/disable/route";
import { POST as emailMfaDisable } from "../app/api/auth/mfa/email/disable/route";
import { POST as login } from "../app/api/auth/login/route";
import { POST as backupCodes } from "../app/api/auth/mfa/backup-codes/route";
import { POST as googleSignIn } from "../app/api/auth/oauth/google/route";
import { POST as googleLink } from "../app/api/auth/oauth/google/link/route";
import { POST as mfaVerify } from "../app/api/auth/mfa/verify/route";
import { POST as sendEmailCode } from "../app/api/auth/mfa/challenge/send-email-code/route";
import { POST as forgotPassword } from "../app/api/auth/forgot-password/route";
import { POST as resendVerification } from "../app/api/auth/resend-verification/route";
import { POST as changePassword } from "../app/api/auth/change-password/route";
import { POST as resetPassword } from "../app/api/auth/reset-password/route";
import { POST as register } from "../app/api/auth/register/route";
import { GET as sessionsList } from "../app/api/auth/sessions/route";
import { DELETE as sessionRevoke } from "../app/api/auth/sessions/[id]/route";
import { POST as supportPost } from "../app/api/support/route";
import { POST as inboundPost } from "../app/api/inbound/email/route";
import { POST as reviewFindings } from "../app/api/catalog/review-findings/route";
import { createLoginChallenge } from "./auth/mfaChallenge";
import { GoogleTokenError } from "./auth/oauth";
import { setErrorTransport, setErrorScheduler } from "./error-tracker";
import { aiUserKind } from "./ai-access";
import { createHash, createHmac } from "node:crypto";
import { ipCounterKey, LOGIN_IP_EVENT, LOGIN_IP_LIMIT, GOOGLE_SIGNIN_IP_LIMIT } from "./auth/rateLimit";

__setTermsEnforcementForTest(true);
const testPw = (s: string) => s;
const PW = testPw("Correct-Horse-219");
const SEED = "JBSWY3DPEHPK3PXP".repeat(2);
const ORIGIN = "https://app.ascendra.test";
const NATIVE = { "x-ascendra-platform": "android", "x-ascendra-app": "2.0.0+embedded", "x-ascendra-legal": "2026-11-10" };

const origErr = console.error;
console.error = (...a: unknown[]) => {
  if (process.env.REQ219_DEBUG) origErr(...a);
};
const mails: { to: string; subject: string; html: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (_u: unknown, init: { body: string }) => {
  const b = JSON.parse(init.body);
  mails.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, subject: b.subject, html: b.html });
  return new Response(JSON.stringify({ id: "x" }), { status: 200, headers: { "content-type": "application/json" } });
}) as unknown as typeof fetch;
const mailsTo = (to: string) => mails.filter((m) => m.to === to);

const run = Date.now().toString(36);
const created: string[] = [];
const ipBase = `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
let ipSeq = 0;
const freshIp = () => `${ipBase}.${++ipSeq % 250}`;

after(async () => {
  globalThis.fetch = realFetch;
  console.error = origErr;
  __setGoogleVerifierForTest(null);
  await query(`delete from app_users where id = any($1::uuid[])`, [created]);
  await query(`delete from auth_events where identifier like $1 or identifier = any($2::text[]) or ip like $3`, [
    `%${run}%`,
    created,
    `${ipBase}.%`,
  ]);
  await closePool();
  await closeOwner();
});

interface Res {
  status: number;
  body: any;
  cookies: string[];
}

async function call(
  handler: Function,
  opts: { body?: unknown; headers?: Record<string, string>; method?: string; url?: string; params?: Record<string, string> } = {}
): Promise<Res> {
  const res: Response = await handler(
    new Request(opts.url ?? `${ORIGIN}/api/x`, {
      method: opts.method ?? "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": freshIp(), ...(opts.headers ?? {}) },
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
    }),
    { params: Promise.resolve(opts.params ?? {}) }
  );
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed, cookies: res.headers.getSetCookie() };
}

// Every account here has accepted the current Terms and Privacy Policy, as a
// real one does (REQ-219 enforces it on the server).
async function mkUser(
  opts: { pw?: string | null; totp?: string; emailMfa?: boolean; google?: string; accepted?: boolean } = {}
) {
  const id = randomUUID();
  created.push(id);
  const email = `req219-${run}-${created.length}@x.test`;
  const pw = opts.pw === undefined ? PW : opts.pw;
  await query(
    `insert into app_users (id,email,password_hash,email_verified_at,mfa_enabled,totp_secret_enc,email_mfa_enabled) values ($1,$2,$3,now(),$4,$5,$6)`,
    [id, email, pw ? await hashPassword(pw) : null, !!opts.totp || !!opts.emailMfa, opts.totp ? encrypt(opts.totp) : null, !!opts.emailMfa]
  );
  if (opts.google) {
    await query(`insert into oauth_accounts (user_id, provider, provider_account_id, email) values ($1,'google',$2,$3)`, [id, opts.google, email]);
  }
  if (opts.accepted !== false) {
    await query(
      `insert into legal_acceptances (user_id, document, version, source) values ($1,'terms','2026-11-10','prompt'),($1,'privacy','2026-11-10','prompt')`,
      [id]
    );
  }
  return { id, email, pw: pw ?? "" };
}

// A signed-in device: a real refresh family and an access token bound to it.
async function session(u: { id: string; email: string }, extra: Record<string, string> = NATIVE) {
  const r = await createRefreshToken(u.id, { userAgent: `ua-${randomUUID()}` });
  const v = await queryOne<{ token_version: number }>(`select token_version from app_users where id=$1`, [u.id]);
  const access = signAccessToken({ sub: u.id, email: u.email, ver: v!.token_version, fam: r.familyId });
  return { refreshToken: r.raw, familyId: r.familyId, access, auth: { authorization: `Bearer ${access}`, ...extra } };
}

const mfaRow = (id: string) =>
  queryOne<{ mfa_enabled: boolean; totp_secret_enc: string | null; email_mfa_enabled: boolean }>(
    `select mfa_enabled, totp_secret_enc, email_mfa_enabled from app_users where id=$1`,
    [id]
  );

describe("FAIL-1100: turning off both two-factor methods at once", () => {
  test("two simultaneous disables never leave 'on' with no method, and never skip the last-method code", async () => {
    // Several rounds: the race needs the two requests to interleave.
    for (let round = 0; round < 4; round++) {
      const u = await mkUser({ totp: SEED, emailMfa: true });
      const s = await session(u);
      const [a, b] = await Promise.all([
        call(mfaDisable, { body: { password: PW }, headers: s.auth }),
        call(emailMfaDisable, { body: { password: PW }, headers: s.auth }),
      ]);
      const row = (await mfaRow(u.id))!;
      const anyMethod = !!row.totp_secret_enc || row.email_mfa_enabled;
      assert.equal(row.mfa_enabled, anyMethod, `mfa_enabled matches the methods left (round ${round})`);
      // Exactly one method went off without a code; the other was either refused or asked for its emailed code.
      assert.ok(anyMethod, "the last method stays on until its emailed code is entered");
      const statuses = [a.status, b.status].sort();
      assert.ok(
        statuses.every((st) => st === 200 || st === 409),
        `answers: ${statuses}`
      );
      assert.ok([a, b].some((r) => r.status === 200 && r.body.enabled === false), "one turn-off went through");
    }
  });

  test("the last method asks for its emailed code; with it, both are off and the flag follows", async () => {
    const u = await mkUser({ totp: SEED });
    const s = await session(u);
    const first = await call(mfaDisable, { body: { password: PW }, headers: s.auth });
    assert.equal(first.body.confirmationRequired, true);
    assert.equal((await mfaRow(u.id))!.mfa_enabled, true);
    const code = "246810";
    await query(`update app_users set mfa_disable_confirmation_code_hash=$2 where id=$1`, [u.id, await hashEmailCode(code)]);
    const done = await call(mfaDisable, { body: { password: PW, confirmationCode: code }, headers: s.auth });
    assert.equal(done.status, 200);
    const row = (await mfaRow(u.id))!;
    assert.deepEqual([row.mfa_enabled, row.totp_secret_enc, row.email_mfa_enabled], [false, null, false]);
  });

  test("an account left 'on' with no method signs in without a code step", async () => {
    const u = await mkUser({ pw: PW });
    await query(`update app_users set mfa_enabled = true where id=$1`, [u.id]);
    const r = await call(login, { body: { email: u.email, password: PW } });
    assert.equal(r.status, 200);
    assert.ok(r.body.accessToken, "signed in");
    assert.equal(r.body.mfaRequired, undefined);
  });
});

// --- FAIL-1101 -------------------------------------------------------------
describe("FAIL-1101: backup codes for a Google-only account", () => {
  test("a Google-only account regenerates with a fresh Google sign-in or a code; nothing, or someone else's Google, is refused", async () => {
    const sub = `g-${run}-1101`;
    const u = await mkUser({ pw: null, totp: SEED, google: sub });
    const s = await session(u);
    const none = await call(backupCodes, { body: { method: "totp" }, headers: s.auth });
    assert.equal(none.status, 400);
    assert.equal(none.body.reauthRequired, true);
    assert.equal(none.body.methods.google, true);

    __setGoogleVerifierForTest(async () => ({ providerAccountId: `g-${run}-other`, email: u.email, emailVerified: true, name: null, issuedAt: Math.floor(Date.now() / 1000) - 5 }));
    assert.equal((await call(backupCodes, { body: { method: "totp", googleIdToken: "t" }, headers: s.auth })).status, 401);
    __setGoogleVerifierForTest(async () => ({ providerAccountId: sub, email: u.email, emailVerified: true, name: null, issuedAt: Math.floor(Date.now() / 1000) - 3600 }));
    assert.equal((await call(backupCodes, { body: { method: "totp", googleIdToken: "t" }, headers: s.auth })).status, 401, "a stale Google sign-in");

    __setGoogleVerifierForTest(async () => ({ providerAccountId: sub, email: u.email, emailVerified: true, name: null, issuedAt: Math.floor(Date.now() / 1000) - 5 }));
    const g = await call(backupCodes, { body: { method: "totp", googleIdToken: "t" }, headers: s.auth });
    assert.equal(g.status, 200);
    assert.equal(g.body.backupCodes.length, 10);
    __setGoogleVerifierForTest(null);
  });

  test("an authenticator code also confirms; the password path still works", async () => {
    const u = await mkUser({ pw: null, totp: SEED, google: `g-${run}-1101b` });
    const s = await session(u);
    assert.equal((await call(backupCodes, { body: { method: "totp", reauth: "000000" }, headers: s.auth })).status, 401);
    assert.equal((await call(backupCodes, { body: { method: "totp", reauth: await totpGenerate({ secret: SEED }) }, headers: s.auth })).status, 200);
    const p = await mkUser({ totp: SEED });
    const ps = await session(p);
    assert.equal((await call(backupCodes, { body: { method: "totp", password: PW }, headers: ps.auth })).status, 200);
    assert.equal((await call(backupCodes, { body: { method: "totp", password: "nope" }, headers: ps.auth })).status, 401);
  });
});

// --- FAIL-1102 / 1103 ------------------------------------------------------
describe("FAIL-1102: a rejected Google token", () => {
  test("is a 401, never reported to the error tracker; a server fault still is", async () => {
    const sent: string[] = [];
    process.env.ERROR_TRACKER_DSN = "https://key@tracker.test/1";
    setErrorTransport(async (url) => {
      sent.push(url);
    });
    setErrorScheduler((task) => void task());
    try {
      __setGoogleVerifierForTest(async () => {
        throw new GoogleTokenError();
      });
      const r = await call(googleSignIn, { body: { idToken: "forged" } });
      assert.equal(r.status, 401);
      assert.match(r.body.error, /couldn't be confirmed/);
      // The real verifier, given junk: rejected by the library, still a 401.
      __setGoogleVerifierForTest(null);
      process.env.GOOGLE_OAUTH_CLIENT_IDS = "client-1.apps.googleusercontent.com";
      const junk = await call(googleSignIn, { body: { idToken: "not.a.jwt" } });
      assert.equal(junk.status, 401);
      // The link route says the same, and tells the app not to refresh and resend.
      const u = await mkUser();
      const s = await session(u);
      const link = await call(googleLink, { body: { idToken: "not.a.jwt", reauth: PW }, headers: s.auth });
      assert.equal(link.status, 401);
      assert.equal(link.body.reauthRequired, true);
      assert.deepEqual(sent, [], "nothing reported for a caller's bad token");
      // A genuine fault (not a rejected token) is still a reported 500.
      __setGoogleVerifierForTest(async () => {
        throw new Error("boom");
      });
      assert.equal((await call(googleSignIn, { body: { idToken: "x" } })).status, 500);
      assert.equal(sent.length, 1);
    } finally {
      __setGoogleVerifierForTest(null);
      setErrorTransport(null);
      setErrorScheduler(null);
      delete process.env.ERROR_TRACKER_DSN;
    }
  });

  test("a per-IP limit like register's: attempts past it are 429", async () => {
    __setGoogleVerifierForTest(async () => {
      throw new GoogleTokenError();
    });
    const ip = freshIp();
    await query(`insert into auth_events (event_type, identifier) select 'oauth_google', $1 from generate_series(1, $2)`, [
      ipCounterKey(ip),
      GOOGLE_SIGNIN_IP_LIMIT.max,
    ]);
    const blocked = await call(googleSignIn, { body: { idToken: "x" }, headers: { "x-forwarded-for": ip } });
    assert.equal(blocked.status, 429);
    assert.equal((await call(googleSignIn, { body: { idToken: "x" } })).status, 401, "another address is not affected");
    __setGoogleVerifierForTest(null);
  });
});

describe("FAIL-1103: Google sign-in that attaches to an existing account mails its address", () => {
  const stub = (sub: string, email: string) =>
    __setGoogleVerifierForTest(async () => ({ providerAccountId: sub, email, emailVerified: true, name: null, issuedAt: Math.floor(Date.now() / 1000) }));

  test("first attach to a password account sends the alert; later sign-ins and brand-new accounts do not", async () => {
    const u = await mkUser();
    stub(`g-${run}-1103`, u.email);
    const before = mailsTo(u.email).length;
    const first = await call(googleSignIn, { body: { idToken: "t" } });
    assert.equal(first.status, 200);
    const alerts = mailsTo(u.email).slice(before).filter((m) => /Google sign-in connected/.test(m.subject));
    assert.equal(alerts.length, 1, "one alert to the account address");
    assert.match(alerts[0].html, new RegExp(u.email.replace(/[.+]/g, "\\$&")));
    assert.equal((await call(googleSignIn, { body: { idToken: "t" } })).status, 200);
    assert.equal(mailsTo(u.email).slice(before).filter((m) => /Google sign-in connected/.test(m.subject)).length, 1, "not again");

    const fresh = `req219-new-${run}@x.test`;
    created.push((await (async () => {
      stub(`g-${run}-1103b`, fresh);
      const r = await call(googleSignIn, { body: { idToken: "t", ageConfirmed: true } });
      assert.equal(r.status, 200);
      return queryOne<{ id: string }>(`select id from app_users where email=$1`, [fresh]);
    })())!.id);
    assert.equal(mailsTo(fresh).filter((m) => /Google sign-in connected/.test(m.subject)).length, 0);
    __setGoogleVerifierForTest(null);
  });
});

// --- FAIL-1105 -------------------------------------------------------------
describe("FAIL-1105: a per-IP ceiling on login", () => {
  test("one IP past the ceiling is refused like a wrong password, even with the right one; another IP is fine", async () => {
    const u = await mkUser();
    const ip = freshIp();
    await query(`insert into auth_events (event_type, identifier) select $1, $2 from generate_series(1, $3)`, [
      LOGIN_IP_EVENT,
      ipCounterKey(ip),
      LOGIN_IP_LIMIT.max,
    ]);
    const blocked = await call(login, { body: { email: u.email, password: PW }, headers: { "x-forwarded-for": ip } });
    assert.equal(blocked.status, 401);
    assert.match(blocked.body.error, /Incorrect email or password/);
    assert.equal((await call(login, { body: { email: u.email, password: PW } })).status, 200);
  });

  test("a different address each time still counts: wrong guesses fill the ceiling, correct sign-ins give theirs back", async () => {
    const u = await mkUser();
    const ip = freshIp();
    const key = ipCounterKey(ip);
    const count = async () => Number((await queryOne<{ n: string }>(`select count(*) n from auth_events where event_type=$1 and identifier=$2`, [LOGIN_IP_EVENT, key]))!.n);
    for (let i = 0; i < 3; i++) await call(login, { body: { email: `nobody-${i}-${run}@x.test`, password: testPw("wrong-guess-" + i) }, headers: { "x-forwarded-for": ip } });
    assert.equal(await count(), 3);
    assert.equal((await call(login, { body: { email: u.email, password: PW }, headers: { "x-forwarded-for": ip } })).status, 200);
    assert.equal(await count(), 3, "the correct sign-in did not use budget");
  });
});

// --- FAIL-1110 -------------------------------------------------------------
describe("FAIL-1110: sessions are listed and ended by family", () => {
  test("a family with two live tokens is one session, and signing it out ends both", async () => {
    const u = await mkUser();
    const a = await session(u);
    const b = await session(u);
    // A second live token in a's family (what a replayed rotation leaves).
    await query(
      `insert into refresh_tokens (user_id, family_id, token_hash, device_label, expires_at) values ($1,$2,$3,'Phone', now() + interval '1 day')`,
      [u.id, a.familyId, createHash("sha256").update(randomUUID()).digest("hex")]
    );
    const list = await call(sessionsList, { method: "GET", headers: b.auth });
    assert.equal(list.status, 200);
    assert.equal(list.body.sessions.length, 2, "two sessions, not three tokens");
    const rowOfA = await queryOne<{ id: string }>(`select id from refresh_tokens where family_id=$1 and revoked_at is null order by created_at limit 1`, [a.familyId]);
    const gone = await call(sessionRevoke, { method: "DELETE", headers: b.auth, params: { id: rowOfA!.id } });
    assert.equal(gone.status, 200);
    assert.equal(Number((await queryOne<{ n: string }>(`select count(*) n from refresh_tokens where family_id=$1 and revoked_at is null`, [a.familyId]))!.n), 0);
    assert.equal(Number((await queryOne<{ n: string }>(`select count(*) n from refresh_tokens where family_id=$1 and revoked_at is null`, [b.familyId]))!.n), 1, "the other session is untouched");
    // Somebody else's session id is not found.
    const other = await mkUser();
    const o = await session(other);
    const foreign = await queryOne<{ id: string }>(`select id from refresh_tokens where family_id=$1`, [o.familyId]);
    assert.equal((await call(sessionRevoke, { method: "DELETE", headers: b.auth, params: { id: foreign!.id } })).status, 404);
  });
});

// --- FAIL-1111 / 1112 ------------------------------------------------------
describe("FAIL-1111, FAIL-1112: password change and reset", () => {
  test("no password longer than register's ceiling on change or reset", async () => {
    const u = await mkUser();
    const s = await session(u);
    const long = "a".repeat(1025);
    assert.equal((await call(changePassword, { body: { currentPassword: PW, newPassword: long }, headers: s.auth })).status, 400);
    assert.equal((await call(resetPassword, { body: { token: "x".repeat(30), newPassword: long } })).status, 400);
    assert.equal((await call(register, { body: { email: `long-${run}@x.test`, password: long, ageConfirmed: true } })).status, 400);
    assert.equal((await call(changePassword, { body: { currentPassword: PW, newPassword: "a".repeat(1024) }, headers: s.auth })).status, 200);
  });

  test("a password change spends pending reset links and sign-in challenges, in the same transaction", async () => {
    const u = await mkUser();
    const s = await session(u);
    await query(`insert into password_reset_tokens (user_id, token_hash, expires_at) values ($1,$2, now() + interval '1 hour')`, [
      u.id,
      createHash("sha256").update(`reset-${run}`).digest("hex"),
    ]);
    await createLoginChallenge(u.id, {});
    const open = async () => {
      const row = (await queryOne<{ r: string | number; c: string | number }>(
        `select (select count(*) from password_reset_tokens where user_id=$1 and consumed_at is null) r,
                (select count(*) from login_challenges where user_id=$1 and consumed_at is null) c`,
        [u.id]
      ))!;
      return { r: Number(row.r), c: Number(row.c) };
    };
    assert.deepEqual(await open(), { r: 1, c: 1 });
    assert.equal((await call(changePassword, { body: { currentPassword: PW, newPassword: "Another-Pass-219" }, headers: s.auth })).status, 200);
    assert.deepEqual(await open(), { r: 0, c: 0 });
    // The mailed link no longer sets the password.
    assert.equal((await call(resetPassword, { body: { token: `reset-${run}`, newPassword: "Attacker-Pass-1" } })).status, 400);
  });
});

// --- FAIL-1113 -------------------------------------------------------------
describe("FAIL-1113: an authenticator code works once", () => {
  test("the same code is refused at sign-in the second time, and as proof; a later step works", async () => {
    const u = await mkUser({ totp: SEED });
    const code = await totpGenerate({ secret: SEED });
    const loginWith = async (c: string) => {
      const token = await createLoginChallenge(u.id, {});
      return call(mfaVerify, { body: { challengeToken: token, code: c } });
    };
    assert.equal((await loginWith(code)).status, 200);
    assert.equal((await loginWith(code)).status, 401, "replay inside its window");
    const s = await session(u);
    assert.equal((await call(backupCodes, { body: { method: "totp", reauth: code }, headers: s.auth })).status, 401, "and as a confirm-it's-you proof");
    // Time moves on: the last step is one the next code is newer than.
    await query(`update app_users set totp_last_step = totp_last_step - 2 where id=$1`, [u.id]);
    assert.equal((await loginWith(code)).status, 200, "a code from a step after the last one used is accepted");
  });

  test("two requests presenting one fresh code: exactly one wins", async () => {
    const u = await mkUser({ totp: SEED });
    const code = await totpGenerate({ secret: SEED });
    const tokens = await Promise.all([createLoginChallenge(u.id, {}), createLoginChallenge(u.id, {})]);
    const rs = await Promise.all(tokens.map((t) => call(mfaVerify, { body: { challengeToken: t, code } })));
    assert.deepEqual(rs.map((r) => r.status).sort(), [200, 401]);
  });
});

// --- FAIL-1114 -------------------------------------------------------------
describe("FAIL-1114: emailed sign-in codes count against the per-address mail limit", () => {
  test("after the hourly limit the code is refused with a plain 429 and nothing is mailed", async () => {
    const u = await mkUser({ emailMfa: true });
    const send = async () => call(sendEmailCode, { body: { challengeToken: await createLoginChallenge(u.id, {}) } });
    const before = mailsTo(u.email).length;
    for (let i = 0; i < 5; i++) assert.equal((await send()).status, 200, `mail ${i + 1}`);
    const blocked = await send();
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.error, /authenticator app or a backup code/);
    assert.equal(mailsTo(u.email).length - before, 5);
  });
});

// --- FAIL-1240 (REQ-226) ---------------------------------------------------
describe("FAIL-1240: sign-in codes have their own hourly mail budget", () => {
  const MAX = 5;
  const codeMails = (to: string) => mailsTo(to).filter((m) => /is your Ascendra verification code/.test(m.subject));
  const otherMails = (to: string) => mailsTo(to).filter((m) => !/is your Ascendra verification code/.test(m.subject));
  const count = async (event: string, email: string) =>
    Number((await queryOne<{ n: string }>(`select count(*)::text as n from auth_events where event_type = $1 and identifier = $2`, [event, email]))!.n);

  test("reset and verification mails that used up their budget do not block a sign-in code", async () => {
    const u = await mkUser({ emailMfa: true });
    await query(`update app_users set email_verified_at = null where id = $1`, [u.id]);
    // Anyone who knows the address can do this; no password needed.
    for (let i = 0; i < 3; i++) assert.equal((await call(forgotPassword, { body: { email: u.email } })).status, 200);
    for (let i = 0; i < 2; i++) assert.equal((await call(resendVerification, { body: { email: u.email } })).status, 200);
    assert.equal(otherMails(u.email).length, MAX, "five reset and verification mails went out");
    // The sixth is skipped (and answers the same), proving the shared budget really is spent.
    assert.equal((await call(forgotPassword, { body: { email: u.email } })).status, 200);
    assert.equal(otherMails(u.email).length, MAX, "the sixth reset mail was skipped");

    const send = async () => call(sendEmailCode, { body: { challengeToken: await createLoginChallenge(u.id, {}) } });
    for (let i = 0; i < MAX; i++) assert.equal((await send()).status, 200, `code ${i + 1} is sent`);
    assert.equal(codeMails(u.email).length, MAX);
  });

  test("sign-in codes that used up their budget do not block reset or verification mails, and cap themselves", async () => {
    const u = await mkUser({ emailMfa: true });
    await query(`update app_users set email_verified_at = null where id = $1`, [u.id]);
    const send = async () => call(sendEmailCode, { body: { challengeToken: await createLoginChallenge(u.id, {}) } });
    for (let i = 0; i < MAX; i++) assert.equal((await send()).status, 200, `code ${i + 1} is sent`);
    const blocked = await send();
    assert.equal(blocked.status, 429, "the sixth code in the hour is refused");
    assert.match(blocked.body.error, /authenticator app or a backup code/);
    assert.equal(codeMails(u.email).length, MAX, "nothing was mailed for the refused one");
    assert.equal(await count("mfa_code_mail_to", u.email), MAX, "a refused code records nothing");

    await call(forgotPassword, { body: { email: u.email } });
    await call(resendVerification, { body: { email: u.email } });
    assert.equal(otherMails(u.email).length, 2, "reset and verification mails still go out");
    assert.equal(await count("mail_to_address", u.email), 2, "and are counted on their own budget");
  });

  test("the budget is per address: another account's codes are unaffected", async () => {
    const a = await mkUser({ emailMfa: true });
    const b = await mkUser({ emailMfa: true });
    const send = async (u: { id: string }) => call(sendEmailCode, { body: { challengeToken: await createLoginChallenge(u.id, {}) } });
    for (let i = 0; i < MAX; i++) await send(a);
    assert.equal((await send(a)).status, 429);
    assert.equal((await send(b)).status, 200);
  });
});

// --- FAIL-1115 -------------------------------------------------------------
describe("FAIL-1115: a content report needs an objective the caller can see", () => {
  async function privateObjective(ownerId: string) {
    const track = randomUUID(), unit = randomUUID(), obj = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1,$2,'Private','certification',$3)`, [track, `P${run}`.slice(0, 40), ownerId]);
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1,$2,'U',1)`, [unit, track]);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1,$2,'O',1)`, [obj, unit]);
    return obj;
  }
  test("someone else's private objective is 'not found'; your own and the catalog's are accepted", async () => {
    const owner = await mkUser();
    const reader = await mkUser();
    const theirs = await privateObjective(owner.id);
    const mine = await privateObjective(reader.id);
    const catalog = (await queryOne<{ id: string }>(
      `select o.id from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id where st.user_id is null limit 1`
    ))!.id;
    const s = await session(reader);
    const report = (objectiveId: string) =>
      call(supportPost, { body: { kind: "content_report", subject: "Typo", body: "There is a typo here.", objectiveId }, headers: s.auth });
    const denied = await report(theirs);
    assert.equal(denied.status, 400);
    assert.match(denied.body.error, /objectiveId not found/);
    assert.equal((await report(mine)).status, 201);
    assert.equal((await report(catalog)).status, 201);
    await query(`delete from subject_tracks where code = $1`, [`P${run}`.slice(0, 40)]);
  });
});

// --- FAIL-1116 -------------------------------------------------------------
describe("FAIL-1116: a replayed inbound-mail delivery is forwarded once", () => {
  const SECRET_BYTES = Buffer.from("fedcba9876543210fedcba9876543210");
  const EMAIL_ID = "56761188-7520-42d8-8898-ff6fc54ce618";
  const eventBody = JSON.stringify({ type: "email.received", data: { email_id: EMAIL_ID } });
  const signed = (id: string) => {
    const ts = Math.floor(Date.now() / 1000);
    return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${createHmac("sha256", SECRET_BYTES).update(`${id}.${ts}.${eventBody}`).digest("base64")}` };
  };
  const deliver = (headers: Record<string, string>) => inboundPost(new Request("http://t/api/inbound/email", { method: "POST", headers, body: eventBody }));
  function fakeResend(sendStatus = 200) {
    const calls: string[] = [];
    const previous = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push(`${init?.method} ${url}`);
      if (init?.method === "GET") return new Response(JSON.stringify({ from: "L <l@example.test>", to: ["support@ascendra-learn.com"], subject: "Hi", text: "hello", headers: {} }), { status: 200 });
      return new Response(JSON.stringify({ id: "sent" }), { status: sendStatus });
    }) as unknown as typeof fetch;
    return { calls, restore: () => void (globalThis.fetch = previous) };
  }
  const env = (on: boolean) => {
    for (const [k, v] of Object.entries({ RESEND_WEBHOOK_SECRET: `whsec_${SECRET_BYTES.toString("base64")}`, RESEND_API_KEY: "re_test", SUPPORT_FORWARD_TO: "owner@example.test" })) {
      if (on) process.env[k] = v;
      else delete process.env[k];
    }
  };

  test("the same svix-id twice forwards once; a failed delivery can be retried; another id forwards", async () => {
    env(true);
    await query(`delete from auth_events where event_type = 'inbound_email'`);
    const id = `msg_${randomUUID()}`;
    try {
      const f = fakeResend(500);
      assert.equal((await deliver(signed(id))).status, 502);
      f.restore();
      const g = fakeResend(200);
      const retry = await deliver(signed(id));
      assert.equal(retry.status, 200);
      assert.deepEqual(await retry.json(), { forwarded: true }, "the retry of a failed delivery is processed");
      const replay = await deliver(signed(id));
      assert.deepEqual(await replay.json(), { duplicate: true });
      assert.equal(g.calls.filter((c) => c.startsWith("POST")).length, 1, "one message forwarded");
      assert.equal((await (await deliver(signed(`msg_${randomUUID()}`))).json()).forwarded, true);
      g.restore();
    } finally {
      env(false);
    }
    assert.equal((await query(`select 1 from inbound_email_events where svix_id = $1 and forwarded_at is not null`, [id])).length, 1);
  });

  test("a claim that never finished is taken over after the stale window; a bad id is refused", async () => {
    env(true);
    await query(`delete from auth_events where event_type = 'inbound_email'`);
    const id = `msg_${randomUUID()}`;
    await query(`insert into inbound_email_events (svix_id, claimed_at) values ($1, now())`, [id]);
    const f = fakeResend();
    try {
      assert.deepEqual(await (await deliver(signed(id))).json(), { duplicate: true }, "in flight");
      await query(`update inbound_email_events set claimed_at = now() - interval '6 minutes' where svix_id = $1`, [id]);
      assert.equal((await (await deliver(signed(id))).json()).forwarded, true, "a dead claim does not lose the message");
      assert.equal((await deliver(signed("bad id with spaces"))).status, 400);
    } finally {
      f.restore();
      env(false);
    }
  });
});

// --- FAIL-1117 -------------------------------------------------------------
describe("FAIL-1117: catalog review findings are validated and stored in one transaction", () => {
  const TOKEN = `agent-${run}`;
  const send = (body: unknown) =>
    reviewFindings(
      new Request("http://t/api/catalog/review-findings", {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  test("bad types, urls, lengths and dates are 400s; a future checkedAt is capped at now; both writes roll back together", async () => {
    process.env.CATALOG_REVIEW_AGENT_TOKEN = TOKEN;
    const code = `G4${run}`.slice(0, 30);
    const track = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1,$2,'G4 shared','certification',null)`, [track, code]);
    try {
      const good = { trackCode: code, conclusion: "current", evidenceUrl: "https://example.test/e", summary: "ok" };
      for (const bad of [
        { ...good, trackCode: { $ne: 1 } },
        { ...good, conclusion: ["current"] },
        { ...good, evidenceUrl: "javascript:alert(1)" },
        { ...good, evidenceUrl: { a: 1 } },
        { ...good, summary: "x".repeat(8001) },
        { ...good, summary: "bad\u0000nul" },
        { ...good, checkedAt: "not a date" },
        { ...good, checkedAt: 12345 },
      ]) {
        const r = await send(bad);
        assert.equal(r.status, 400, JSON.stringify(bad).slice(0, 60));
      }
      assert.equal((await query(`select 1 from content_review_findings where track_id=$1`, [track])).length, 0, "nothing stored by a refused call");

      const future = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
      const ok = await send({ ...good, checkedAt: future });
      assert.equal(ok.status, 201);
      const f = (await queryOne<{ checked_at: Date; source_verified_at: Date; content_review_due_at: Date }>(
        `select f.checked_at, t.source_verified_at, t.content_review_due_at from content_review_findings f join subject_tracks t on t.id = f.track_id where t.id=$1`,
        [track]
      ))!;
      assert.ok(f.checked_at.getTime() <= Date.now() + 1000, "checkedAt capped at now");
      assert.ok(f.source_verified_at.getTime() <= Date.now() + 1000);
      assert.ok(f.content_review_due_at.getTime() < Date.now() + 130 * 24 * 3600 * 1000);
    } finally {
      await query(`delete from subject_tracks where id=$1`, [track]);
      delete process.env.CATALOG_REVIEW_AGENT_TOKEN;
    }
  });
});

// --- FAIL-1118 -------------------------------------------------------------
describe("FAIL-1118: paid AI mode uses the entitlement rule, grace included", () => {
  const PAID = { AI_ACCESS_MODE: "paid" } as unknown as NodeJS.ProcessEnv;
  async function entitlement(userId: string, status: string, periodEnd: string | null) {
    await query(`delete from entitlements where user_id=$1`, [userId]);
    await query(
      `insert into entitlements (user_id, tier, source, external_id, status, period_end) values ($1,'plus','grant',$2,$3, ${periodEnd ? `now() + interval '${periodEnd}'` : "null"})`,
      [userId, randomUUID(), status]
    );
  }
  test("active, canceled-in-period and within-grace are paying; past the grace, expired or refunded are ordinary", async () => {
    const u = await mkUser();
    assert.equal(await aiUserKind(u.id, PAID), "ordinary");
    await entitlement(u.id, "active", "10 days");
    assert.equal(await aiUserKind(u.id, PAID), "paying");
    await entitlement(u.id, "canceled", "2 days");
    assert.equal(await aiUserKind(u.id, PAID), "paying");
    await entitlement(u.id, "active", "-23 hours");
    assert.equal(await aiUserKind(u.id, PAID), "paying", "inside the 24 h grace");
    await entitlement(u.id, "active", "-25 hours");
    assert.equal(await aiUserKind(u.id, PAID), "ordinary", "past the grace");
    await entitlement(u.id, "expired", null);
    assert.equal(await aiUserKind(u.id, PAID), "ordinary");
    await entitlement(u.id, "active", "10 days");
    assert.equal(await aiUserKind(u.id, {} as NodeJS.ProcessEnv), "ordinary", "not read at all outside paid mode");
  });
  test("the grace is defined once", async () => {
    const { GRACE_HOURS, GIVES_ACCESS } = await import("./entitlements");
    assert.match(GIVES_ACCESS, new RegExp(`hours => ${GRACE_HOURS}\\)`));
    const src = (await import("node:fs")).readFileSync("lib/ai-access.ts", "utf8");
    assert.equal(/make_interval\(hours/.test(src), false, "ai-access.ts no longer carries its own copy");
  });
});
