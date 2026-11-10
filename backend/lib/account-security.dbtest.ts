// REQ-203 (FAIL-860..870): account security regression tests, against a real
// Postgres with every migration applied (locally: DATABASE_URL=...
// PGSSLMODE=disable npm run test:db). Each reproduces a finding of the
// pre-launch audit's account-security batch and failed before its fix. Mail
// goes to a captured fake fetch; the Google verifier is stubbed; no model is
// called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-req203";
process.env.AUTH_ENCRYPTION_KEY ??= Buffer.alloc(32, 3).toString("base64");
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-req203";
process.env.RESEND_API_KEY ??= "re_fake";
process.env.APP_BASE_URL = "https://app.ascendra.test";
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { generate as totpGenerate } from "otplib";
import { query, queryOne, closePool } from "./db";
import { hashPassword } from "./auth/passwords";
import { encrypt } from "./auth/crypto";
import { signAccessToken, createRefreshToken, rotateRefreshToken, RefreshTokenError } from "./auth/tokens";
import { __setGoogleVerifierForTest } from "./auth/oauth";
import { generateBackupCodes, hashEmailCode } from "./auth/mfa";
import { REAUTH_LIMIT, REAUTH_SUCCESS_EVENT, REAUTH_SUCCESS_LIMIT } from "./auth/reauth";
import { REFRESH_COOKIE } from "./auth/refreshCookie";
import { POST as mfaSetup } from "../app/api/auth/mfa/setup/route";
import { POST as mfaEnable } from "../app/api/auth/mfa/enable/route";
import { POST as emailMfaEnable } from "../app/api/auth/mfa/email/enable/route";
import { POST as backupCodes } from "../app/api/auth/mfa/backup-codes/route";
import { POST as googleLink } from "../app/api/auth/oauth/google/link/route";
import { POST as unlock } from "../app/api/auth/unlock/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { POST as changePassword } from "../app/api/auth/change-password/route";
import { POST as refresh, DELETE as endWebSession } from "../app/api/auth/refresh/route";
import { POST as login } from "../app/api/auth/login/route";
import { DELETE as deleteAccount } from "../app/api/account/route";

const testPw = (s: string) => s;
const PW = testPw("Correct-Horse-203");
const SEED = "JBSWY3DPEHPK3PXP".repeat(2);
const ORIGIN = "https://app.ascendra.test";
const WEB = { "x-ascendra-platform": "web", "x-ascendra-app": "2.0.0+web", origin: ORIGIN };
const NATIVE = { "x-ascendra-platform": "android", "x-ascendra-app": "2.0.0+embedded" };

const origErr = console.error;
console.error = (...a: unknown[]) => {
  if (process.env.REQ203_DEBUG) origErr(...a);
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
const functions: string[] = [];

after(async () => {
  globalThis.fetch = realFetch;
  console.error = origErr;
  __setGoogleVerifierForTest(null);
  for (const f of functions) await query(`drop function if exists ${f}() cascade`).catch(() => undefined);
  await query(`delete from app_users where id = any($1::uuid[])`, [created]);
  await query(`delete from auth_events where identifier like $1 or identifier = any($2::text[])`, [`%${run}%`, created]);
  await closePool();
});

interface Res {
  status: number;
  body: any;
  cookies: string[];
}

async function call(
  handler: Function,
  opts: { body?: unknown; headers?: Record<string, string>; method?: string; url?: string } = {}
): Promise<Res> {
  const res: Response = await handler(
    new Request(opts.url ?? `${ORIGIN}/api/x`, {
      method: opts.method ?? "POST",
      headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
      ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
    }),
    { params: Promise.resolve({}) }
  );
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed, cookies: res.headers.getSetCookie() };
}

async function mkUser(opts: { pw?: string | null; totp?: string; google?: string } = {}) {
  const id = randomUUID();
  created.push(id);
  const email = `req203-${run}-${created.length}@x.test`;
  const pw = opts.pw === undefined ? PW : opts.pw;
  await query(
    `insert into app_users (id,email,password_hash,email_verified_at,mfa_enabled,totp_secret_enc) values ($1,$2,$3,now(),$4,$5)`,
    [id, email, pw ? await hashPassword(pw) : null, !!opts.totp, opts.totp ? encrypt(opts.totp) : null]
  );
  if (opts.google) {
    await query(`insert into oauth_accounts (user_id, provider, provider_account_id, email) values ($1,'google',$2,$3)`, [id, opts.google, email]);
  }
  return { id, email, pw: pw ?? "" };
}

// A signed-in device: a real refresh family and an access token bound to it.
async function session(u: { id: string; email: string }) {
  const r = await createRefreshToken(u.id, { userAgent: `ua-${randomUUID()}` });
  const v = await queryOne<{ token_version: number }>(`select token_version from app_users where id=$1`, [u.id]);
  const access = signAccessToken({ sub: u.id, email: u.email, ver: v!.token_version, fam: r.familyId });
  return { refreshToken: r.raw, familyId: r.familyId, access, auth: { authorization: `Bearer ${access}` } };
}

const liveTokens = async (userId: string) =>
  Number((await queryOne<{ n: string }>(`select count(*) n from refresh_tokens where user_id=$1 and revoked_at is null`, [userId]))!.n);
const liveInFamily = async (familyId: string) =>
  Number((await queryOne<{ n: string }>(`select count(*) n from refresh_tokens where family_id=$1 and revoked_at is null`, [familyId]))!.n);

// Time passing: a rotated token's rotation moved out of the reuse grace window.
const pastGraceWindow = (userId: string) =>
  query(`update refresh_tokens set revoked_at = revoked_at - interval '1 minute' where user_id = $1 and revoked_at is not null`, [userId]);

function stubGoogle(sub: string, email: string, issuedAgoSeconds = 5) {
  __setGoogleVerifierForTest(async () => ({
    providerAccountId: sub,
    email,
    emailVerified: true,
    name: null,
    issuedAt: Math.floor(Date.now() / 1000) - issuedAgoSeconds,
  }));
}

// A trigger that makes one named step fail for one user, to prove the writes
// around it roll back together.
async function failOnceFor(userId: string, table: string, when: "insert" | "update", condition: string) {
  const fn = `req203_fail_${run}_${functions.length}`;
  functions.push(fn);
  await query(`create or replace function ${fn}() returns trigger language plpgsql as $$ begin raise exception 'req203 injected failure'; end $$`);
  await query(
    `create trigger ${fn} before ${when} on ${table} for each row when (${condition.replace("$USER", `'${userId}'`)}) execute function ${fn}()`
  );
  return async () => {
    await query(`drop trigger if exists ${fn} on ${table}`);
  };
}

describe("FAIL-860: adding an authenticator needs proof it's the owner, with or without MFA on", () => {
  test("a password account with MFA off is refused without the password; nothing is stored", async () => {
    const u = await mkUser();
    const s = await session(u);
    const r = await call(mfaSetup, { headers: s.auth });
    assert.notEqual(r.status, 200);
    assert.equal(r.body.reauthRequired, true);
    const row = await queryOne<{ totp_pending_secret_enc: string | null }>(`select totp_pending_secret_enc from app_users where id=$1`, [u.id]);
    assert.equal(row!.totp_pending_secret_enc, null);
    assert.equal((await call(mfaSetup, { body: { reauth: "not-it" }, headers: s.auth })).status, 401);
  });

  test("with the password, setup and enable work, the owner is emailed, other sessions end", async () => {
    const u = await mkUser();
    const s = await session(u);
    const other = await session(u);
    const setup = await call(mfaSetup, { body: { reauth: PW }, headers: s.auth });
    assert.equal(setup.status, 200);
    const en = await call(mfaEnable, { body: { code: await totpGenerate({ secret: setup.body.secret }) }, headers: s.auth });
    assert.equal(en.status, 200);
    assert.equal(en.body.backupCodes.length, 10);
    assert.equal(await liveInFamily(other.familyId), 0);
    const alert = mailsTo(u.email).find((m) => /Two-factor authentication was turned on/.test(m.subject));
    assert.ok(alert, "security alert to the account address");
  });

  test("a pending secret started without proof can't be enabled", async () => {
    const u = await mkUser();
    const s = await session(u);
    // What the old setup route left behind: a pending secret, no proof recorded.
    await query(`update app_users set totp_pending_secret_enc=$2, totp_pending_expires_at = now() + interval '10 minutes' where id=$1`, [u.id, encrypt(SEED)]);
    const en = await call(mfaEnable, { body: { code: await totpGenerate({ secret: SEED }) }, headers: s.auth });
    assert.equal(en.status, 401);
    assert.equal(en.body.reauthRequired, true);
    const row = await queryOne<{ mfa_enabled: boolean }>(`select mfa_enabled from app_users where id=$1`, [u.id]);
    assert.equal(row!.mfa_enabled, false);
  });

  test("a Google-only account without MFA must present a fresh Google sign-in", async () => {
    const sub = `g-${run}-860`;
    const u = await mkUser({ pw: null, google: sub });
    const s = await session(u);
    assert.equal((await call(mfaSetup, { headers: s.auth })).body.reauthRequired, true);
    stubGoogle(sub, u.email);
    assert.equal((await call(mfaSetup, { body: { googleIdToken: "tok" }, headers: s.auth })).status, 200);
    __setGoogleVerifierForTest(null);
  });
});

describe("FAIL-861: linking a Google identity needs proof and alerts the owner", () => {
  test("an access token alone links nothing", async () => {
    const u = await mkUser();
    const s = await session(u);
    stubGoogle(`g-${run}-attacker`, "attacker@example.test");
    const r = await call(googleLink, { body: { idToken: "tok" }, headers: s.auth });
    assert.notEqual(r.status, 200);
    assert.equal(r.body.reauthRequired, true);
    assert.equal((await query(`select 1 from oauth_accounts where user_id=$1`, [u.id])).length, 0);
    const wrong = await call(googleLink, { body: { idToken: "tok", reauth: "nope" }, headers: s.auth });
    assert.equal(wrong.status, 401);
    assert.equal((await query(`select 1 from oauth_accounts where user_id=$1`, [u.id])).length, 0);
    __setGoogleVerifierForTest(null);
  });

  test("with the password it links, and the account address is emailed which Google account", async () => {
    const u = await mkUser();
    const s = await session(u);
    const gmail = `linked-${run}@example.test`;
    stubGoogle(`g-${run}-ok`, gmail);
    const r = await call(googleLink, { body: { idToken: "tok", reauth: PW }, headers: s.auth });
    assert.equal(r.status, 200);
    assert.equal((await query(`select 1 from oauth_accounts where user_id=$1`, [u.id])).length, 1);
    const alert = mailsTo(u.email).find((m) => /Google account was connected/.test(m.subject));
    assert.ok(alert);
    assert.ok(alert.html.includes(gmail));
    // Linking the same identity again changes nothing and says nothing.
    const before = mailsTo(u.email).length;
    assert.equal((await call(googleLink, { body: { idToken: "tok", reauth: PW }, headers: s.auth })).status, 200);
    assert.equal(mailsTo(u.email).length, before);
    __setGoogleVerifierForTest(null);
  });
});

describe("FAIL-862: the pending email code has an attempt limit", () => {
  async function pendingEmailCode(u: { id: string }, code: string) {
    await query(`update app_users set email_mfa_pending_code_hash=$2, email_mfa_pending_expires_at = now() + interval '10 minutes' where id=$1`, [
      u.id,
      await hashEmailCode(code),
    ]);
  }

  test("five wrong codes drop the pending code; the right one no longer works; later tries get 429", async () => {
    const u = await mkUser();
    const s = await session(u);
    await pendingEmailCode(u, "123456");
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await call(emailMfaEnable, { body: { code: `00000${i}` }, headers: s.auth })).status);
    assert.deepEqual(statuses, [401, 401, 401, 401, 401]);
    const row = await queryOne<{ email_mfa_pending_code_hash: string | null }>(`select email_mfa_pending_code_hash from app_users where id=$1`, [u.id]);
    assert.equal(row!.email_mfa_pending_code_hash, null, "pending code cleared after five misses");
    assert.equal((await call(emailMfaEnable, { body: { code: "123456" }, headers: s.auth })).status, 429);
    const after = await queryOne<{ email_mfa_enabled: boolean }>(`select email_mfa_enabled from app_users where id=$1`, [u.id]);
    assert.equal(after!.email_mfa_enabled, false);
  });

  test("the right code within the limit enables, emails the owner and resets the count", async () => {
    const u = await mkUser();
    const s = await session(u);
    await pendingEmailCode(u, "654321");
    for (let i = 0; i < 3; i++) assert.equal((await call(emailMfaEnable, { body: { code: "000000" }, headers: s.auth })).status, 401);
    const ok = await call(emailMfaEnable, { body: { code: "654321" }, headers: s.auth });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.backupCodes.length, 10);
    assert.ok(mailsTo(u.email).find((m) => /Two-factor authentication was turned on/.test(m.subject)));
  });

  test("concurrent guesses cannot exceed the limit", async () => {
    const u = await mkUser();
    const s = await session(u);
    await pendingEmailCode(u, "111111");
    const rs = await Promise.all(Array.from({ length: 12 }, (_, i) => call(emailMfaEnable, { body: { code: `22222${i % 10}` }, headers: s.auth })));
    // Five get to check their guess (a 401, or a 400 if an earlier miss had
    // already dropped the code); the other seven are refused before looking.
    assert.equal(rs.filter((r) => r.status !== 429).length, 5, rs.map((r) => r.status).join(","));
    assert.equal(rs.filter((r) => r.status === 429).length, 7);
  });
});

describe("FAIL-863: backup-code regeneration spends the shared reauth budget", () => {
  test("wrong passwords are capped; then even the right one waits", async () => {
    const u = await mkUser({ totp: SEED });
    const s = await session(u);
    const statuses: number[] = [];
    for (let i = 0; i < REAUTH_LIMIT.max; i++) statuses.push((await call(backupCodes, { body: { password: `guess-${i}`, method: "totp" }, headers: s.auth })).status);
    assert.ok(statuses.every((x) => x === 401), statuses.join(","));
    const good = await call(backupCodes, { body: { password: PW, method: "totp" }, headers: s.auth });
    assert.equal(good.status, 429);
    const regen = await queryOne<{ n: string }>(`select count(*) n from mfa_backup_codes where user_id=$1`, [u.id]);
    assert.equal(Number(regen!.n), 0);
  });

  test("the budget is the one the unlock screen and change-password use", async () => {
    const u = await mkUser({ totp: SEED });
    const s = await session(u);
    for (let i = 0; i < REAUTH_LIMIT.max; i++) await call(backupCodes, { body: { password: `g${i}`, method: "totp" }, headers: s.auth });
    assert.equal((await call(unlock, { body: { reauth: PW }, headers: s.auth })).status, 429);
  });
});

describe("FAIL-864: correct unlocks don't count toward the lockout", () => {
  test("twenty correct unlocks in a row all succeed", async () => {
    const u = await mkUser();
    const s = await session(u);
    for (let i = 0; i < 20; i++) assert.equal((await call(unlock, { body: { reauth: PW }, headers: s.auth })).status, 200, `unlock ${i + 1}`);
  });

  test("wrong guesses still lock at the limit, and correct unlocks in between don't buy extra", async () => {
    const u = await mkUser();
    const s = await session(u);
    for (let i = 0; i < REAUTH_LIMIT.max - 1; i++) {
      assert.equal((await call(unlock, { body: { reauth: `guess-${i}` }, headers: s.auth })).status, 401);
      assert.equal((await call(unlock, { body: { reauth: PW }, headers: s.auth })).status, 200);
    }
    assert.equal((await call(unlock, { body: { reauth: "guess-last" }, headers: s.auth })).status, 401);
    assert.equal((await call(unlock, { body: { reauth: PW }, headers: s.auth })).status, 429, "ten wrong guesses lock it");
  });

  test("concurrent guesses are still capped (the attempt counts while it is checked)", async () => {
    const u = await mkUser();
    const s = await session(u);
    const rs = await Promise.all(Array.from({ length: 16 }, (_, i) => call(unlock, { body: { reauth: `bad-${i}` }, headers: s.auth })));
    assert.equal(rs.filter((r) => r.status === 401).length, REAUTH_LIMIT.max);
    assert.equal(rs.filter((r) => r.status === 429).length, 16 - REAUTH_LIMIT.max);
  });

  test("successes have their own generous ceiling", async () => {
    const u = await mkUser();
    const s = await session(u);
    await query(
      `insert into auth_events (event_type, identifier, user_id) select $1::varchar, $2::varchar, $3::uuid from generate_series(1, $4::int)`,
      [REAUTH_SUCCESS_EVENT, u.id, u.id, REAUTH_SUCCESS_LIMIT.max]
    );
    assert.equal((await call(unlock, { body: { reauth: PW }, headers: s.auth })).status, 429);
  });
});

describe("FAIL-865: two simultaneous refreshes don't sign the learner out", () => {
  test("five concurrent rotations of one token all get a live token; the family stays live", async () => {
    const u = await mkUser();
    const { raw, familyId } = await createRefreshToken(u.id);
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => rotateRefreshToken(raw)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 5, JSON.stringify(results.filter((r) => r.status === "rejected")));
    const raws = results.map((r) => (r as PromiseFulfilledResult<{ raw: string }>).value.raw);
    assert.equal(new Set(raws).size, 5, "each caller gets its own token");
    assert.equal(await liveInFamily(familyId), 5);
    for (const t of raws) await rotateRefreshToken(t); // every one of them works
  });

  test("a native client's second refresh with the same token answers 200 inside the window", async () => {
    const u = await mkUser();
    const { raw } = await createRefreshToken(u.id);
    const [a, b] = await Promise.all([
      call(refresh, { body: { refreshToken: raw }, headers: NATIVE }),
      call(refresh, { body: { refreshToken: raw }, headers: NATIVE }),
    ]);
    assert.deepEqual([a.status, b.status], [200, 200]);
    assert.notEqual(a.body.refreshToken, b.body.refreshToken);
    assert.equal((await call(refresh, { body: { refreshToken: a.body.refreshToken }, headers: NATIVE })).status, 200);
  });

  test("outside the window the same replay is theft: the whole family is revoked", async () => {
    const u = await mkUser();
    const { raw, familyId } = await createRefreshToken(u.id);
    const next = await rotateRefreshToken(raw);
    await pastGraceWindow(u.id);
    await assert.rejects(() => rotateRefreshToken(raw), RefreshTokenError);
    assert.equal(await liveInFamily(familyId), 0);
    await assert.rejects(() => rotateRefreshToken(next.raw), RefreshTokenError);
  });

  test("a replay inside the window doesn't outlive a sign-out", async () => {
    const u = await mkUser();
    const s = await session(u);
    await rotateRefreshToken(s.refreshToken);
    assert.equal((await call(logout, { body: { refreshToken: s.refreshToken }, headers: NATIVE })).status, 200);
    await assert.rejects(() => rotateRefreshToken(s.refreshToken), RefreshTokenError);
    assert.equal(await liveInFamily(s.familyId), 0);
  });

  test("replays are bounded: a flood of the same old token stops minting", async () => {
    const u = await mkUser();
    const { raw, familyId } = await createRefreshToken(u.id);
    await rotateRefreshToken(raw);
    let minted = 0;
    for (let i = 0; i < 12; i++) {
      try {
        await rotateRefreshToken(raw);
        minted++;
      } catch {
        break;
      }
    }
    assert.ok(minted >= 1 && minted <= 6, `minted ${minted}`);
    assert.equal(await liveInFamily(familyId), 0, "and the flood revoked the family");
  });

  test("an expired family is not forgiven inside the window", async () => {
    const u = await mkUser();
    const { raw } = await createRefreshToken(u.id);
    await rotateRefreshToken(raw);
    await query(`update refresh_tokens set expires_at = now() - interval '1 minute' where user_id = $1`, [u.id]);
    await assert.rejects(() => rotateRefreshToken(raw), RefreshTokenError);
  });
});

describe("FAIL-866: sign-out with an expired access token ends the session", () => {
  const expired = (u: { id: string; email: string }, fam: string, opts: { ageSeconds?: number; secret?: string } = {}) => {
    const iat = Math.floor(Date.now() / 1000) - (opts.ageSeconds ?? 3600);
    return jwt.sign({ sub: u.id, email: u.email, ver: 0, fam, iat, exp: iat + 900 }, opts.secret ?? process.env.AUTH_JWT_SECRET!);
  };

  test("a signed but expired token revokes its family and no other", async () => {
    const u = await mkUser();
    const a = await session(u);
    const b = await session(u);
    const r = await call(logout, { headers: { ...NATIVE, authorization: `Bearer ${expired(u, a.familyId)}` } });
    assert.equal(r.status, 200);
    assert.equal(await liveInFamily(a.familyId), 0);
    assert.equal(await liveInFamily(b.familyId), 1);
  });

  test("a forged, unsigned or very old token ends nothing", async () => {
    const u = await mkUser();
    const a = await session(u);
    const bad = [
      expired(u, a.familyId, { secret: "some-other-secret" }),
      jwt.sign({ sub: u.id, fam: a.familyId }, "x", { algorithm: "HS256" }),
      expired(u, a.familyId, { ageSeconds: 31 * 24 * 3600 }),
      "junk",
    ];
    for (const t of bad) {
      assert.equal((await call(logout, { headers: { ...NATIVE, authorization: `Bearer ${t}` } })).status, 400);
    }
    assert.equal(await liveInFamily(a.familyId), 1);
  });

  test("a family id from someone else's token can't end my session (revoke is scoped by user)", async () => {
    const mine = await mkUser();
    const theirs = await mkUser();
    const m = await session(mine);
    const t = await session(theirs);
    const forged = expired(theirs, m.familyId);
    await call(logout, { headers: { ...NATIVE, authorization: `Bearer ${forged}` } });
    assert.equal(await liveInFamily(m.familyId), 1);
    assert.equal(await liveInFamily(t.familyId), 1);
  });
});

describe("FAIL-867: sign-out with an already-rotated refresh token ends the live successor too", () => {
  test("POST /logout with the previous token", async () => {
    const u = await mkUser();
    const s = await session(u);
    const next = await rotateRefreshToken(s.refreshToken);
    assert.equal((await call(logout, { body: { refreshToken: s.refreshToken }, headers: NATIVE })).status, 200);
    assert.equal(await liveInFamily(s.familyId), 0);
    await assert.rejects(() => rotateRefreshToken(next.raw), RefreshTokenError);
  });

  test("web DELETE /api/auth/refresh with a rotated cookie", async () => {
    const u = await mkUser();
    const l = await call(login, { body: { email: u.email, password: PW }, headers: WEB });
    const first = decodeURIComponent(l.cookies[0].slice(REFRESH_COOKIE.length + 1).split(";")[0]);
    const r1 = await call(refresh, { headers: { ...WEB, cookie: `${REFRESH_COOKIE}=${encodeURIComponent(first)}` } });
    assert.equal(r1.status, 200);
    assert.equal(await liveTokens(u.id), 1);
    const out = await call(endWebSession, { method: "DELETE", headers: { ...WEB, cookie: `${REFRESH_COOKIE}=${encodeURIComponent(first)}` } });
    assert.equal(out.status, 200);
    assert.equal(await liveTokens(u.id), 0);
  });
});

describe("FAIL-868: a junk token in the body doesn't clear a valid web cookie", () => {
  test("junk body + valid cookie: 401, no clearing Set-Cookie, the cookie still refreshes", async () => {
    const u = await mkUser();
    const l = await call(login, { body: { email: u.email, password: PW }, headers: WEB });
    const cookie = decodeURIComponent(l.cookies[0].slice(REFRESH_COOKIE.length + 1).split(";")[0]);
    const headers = { ...WEB, cookie: `${REFRESH_COOKIE}=${encodeURIComponent(cookie)}` };
    for (const body of [{ refreshToken: "not-a-real-token" }, { refreshToken: 12 }, { refreshToken: "" }]) {
      const r = await call(refresh, { body, headers });
      assert.equal(r.status, 401, JSON.stringify(body));
      assert.deepEqual(r.cookies, [], "the session cookie is left alone");
    }
    assert.equal((await call(refresh, { headers })).status, 200);
  });

  test("a cookie that itself fails is still cleared", async () => {
    const r = await call(refresh, { headers: { ...WEB, cookie: `${REFRESH_COOKIE}=nope` } });
    assert.equal(r.status, 401);
    assert.match(r.cookies[0] ?? "", /Max-Age=0/);
  });
});

describe("FAIL-869: multi-statement writes are all-or-nothing", () => {
  test("change-password: a failure after the new hash rolls the hash back", async () => {
    const u = await mkUser();
    const s = await session(u);
    const before = await queryOne<{ password_hash: string }>(`select password_hash from app_users where id=$1`, [u.id]);
    const drop = await failOnceFor(u.id, "app_users", "update", "new.id = $USER and new.token_version <> old.token_version");
    try {
      const r = await call(changePassword, { body: { currentPassword: PW, newPassword: "A-brand-new-password-1" }, headers: s.auth });
      assert.equal(r.status, 500);
    } finally {
      await drop();
    }
    const after = await queryOne<{ password_hash: string }>(`select password_hash from app_users where id=$1`, [u.id]);
    assert.equal(after!.password_hash, before!.password_hash);
    assert.equal(await liveInFamily(s.familyId), 1);
    const ok = await call(changePassword, { body: { currentPassword: PW, newPassword: "A-brand-new-password-1" }, headers: s.auth });
    assert.equal(ok.status, 200);
  });

  test("mfa/enable: a failure storing backup codes leaves MFA off and the pending secret in place", async () => {
    const u = await mkUser();
    const s = await session(u);
    const setup = await call(mfaSetup, { body: { reauth: PW }, headers: s.auth });
    const drop = await failOnceFor(u.id, "mfa_backup_codes", "insert", "new.user_id = $USER");
    try {
      const r = await call(mfaEnable, { body: { code: await totpGenerate({ secret: setup.body.secret }) }, headers: s.auth });
      assert.equal(r.status, 500);
    } finally {
      await drop();
    }
    const row = await queryOne<{ mfa_enabled: boolean; totp_secret_enc: string | null; totp_pending_secret_enc: string | null }>(
      `select mfa_enabled, totp_secret_enc, totp_pending_secret_enc from app_users where id=$1`,
      [u.id]
    );
    assert.equal(row!.mfa_enabled, false);
    assert.equal(row!.totp_secret_enc, null);
    assert.ok(row!.totp_pending_secret_enc, "can retry with the same QR code");
    const retry = await call(mfaEnable, { body: { code: await totpGenerate({ secret: setup.body.secret }) }, headers: s.auth });
    assert.equal(retry.status, 200);
  });

  test("mfa/enable: two requests with the same good code enable once", async () => {
    const u = await mkUser();
    const s = await session(u);
    const setup = await call(mfaSetup, { body: { reauth: PW }, headers: s.auth });
    const code = await totpGenerate({ secret: setup.body.secret });
    const rs = await Promise.all([call(mfaEnable, { body: { code }, headers: s.auth }), call(mfaEnable, { body: { code }, headers: s.auth })]);
    assert.deepEqual(rs.map((r) => r.status).sort(), [200, 400]);
    const n = await queryOne<{ n: string }>(`select count(*) n from mfa_backup_codes where user_id=$1 and method='totp'`, [u.id]);
    assert.equal(Number(n!.n), 10);
  });

  test("mfa/email/enable: a failure storing backup codes leaves email MFA off, the code usable", async () => {
    const u = await mkUser();
    const s = await session(u);
    await query(`update app_users set email_mfa_pending_code_hash=$2, email_mfa_pending_expires_at = now() + interval '10 minutes' where id=$1`, [
      u.id,
      await hashEmailCode("135790"),
    ]);
    const drop = await failOnceFor(u.id, "mfa_backup_codes", "insert", "new.user_id = $USER");
    try {
      assert.equal((await call(emailMfaEnable, { body: { code: "135790" }, headers: s.auth })).status, 500);
    } finally {
      await drop();
    }
    const row = await queryOne<{ email_mfa_enabled: boolean; email_mfa_pending_code_hash: string | null }>(
      `select email_mfa_enabled, email_mfa_pending_code_hash from app_users where id=$1`,
      [u.id]
    );
    assert.equal(row!.email_mfa_enabled, false);
    assert.ok(row!.email_mfa_pending_code_hash);
    assert.equal((await call(emailMfaEnable, { body: { code: "135790" }, headers: s.auth })).status, 200);
  });

  test("backup-codes: a failure inserting the new codes keeps the old ones", async () => {
    const u = await mkUser({ totp: SEED });
    const s = await session(u);
    const { hashed } = await generateBackupCodes();
    await query(`insert into mfa_backup_codes (user_id, method, code_hash) select $1, 'totp', unnest($2::text[])`, [u.id, hashed]);
    const drop = await failOnceFor(u.id, "mfa_backup_codes", "insert", "new.user_id = $USER");
    try {
      assert.equal((await call(backupCodes, { body: { password: PW, method: "totp" }, headers: s.auth })).status, 500);
    } finally {
      await drop();
    }
    const n = await queryOne<{ n: string }>(`select count(*) n from mfa_backup_codes where user_id=$1 and method='totp'`, [u.id]);
    assert.equal(Number(n!.n), hashed.length);
    assert.equal((await call(backupCodes, { body: { password: PW, method: "totp" }, headers: s.auth })).status, 200);
  });
});

describe("FAIL-870: deleting a Google-only account needs proof", () => {
  test("an access token alone deletes nothing; a fresh Google sign-in does", async () => {
    const sub = `g-${run}-870`;
    const u = await mkUser({ pw: null, google: sub });
    const s = await session(u);
    const bare = await call(deleteAccount, { method: "DELETE", headers: s.auth });
    assert.notEqual(bare.status, 200);
    assert.equal(bare.body.reauthRequired, true);
    assert.equal(bare.body.methods.google, true);
    assert.ok(await queryOne(`select 1 from app_users where id=$1`, [u.id]));

    stubGoogle(`g-${run}-someone-else`, u.email);
    assert.equal((await call(deleteAccount, { method: "DELETE", body: { googleIdToken: "t" }, headers: s.auth })).status, 401);
    stubGoogle(sub, u.email, 3600);
    assert.equal((await call(deleteAccount, { method: "DELETE", body: { googleIdToken: "t" }, headers: s.auth })).status, 401, "stale sign-in");
    assert.ok(await queryOne(`select 1 from app_users where id=$1`, [u.id]));

    stubGoogle(sub, u.email, 5);
    const done = await call(deleteAccount, { method: "DELETE", body: { googleIdToken: "t" }, headers: s.auth });
    assert.equal(done.status, 200);
    assert.equal(await queryOne(`select 1 from app_users where id=$1`, [u.id]), null);
    __setGoogleVerifierForTest(null);
  });

  test("a Google-only account with an authenticator can confirm with a code", async () => {
    const u = await mkUser({ pw: null, totp: SEED, google: `g-${run}-870b` });
    const s = await session(u);
    assert.equal((await call(deleteAccount, { method: "DELETE", body: { reauth: "000000" }, headers: s.auth })).status, 401);
    assert.equal((await call(deleteAccount, { method: "DELETE", body: { reauth: await totpGenerate({ secret: SEED }) }, headers: s.auth })).status, 200);
  });

  test("a password account still deletes with its password", async () => {
    const u = await mkUser();
    const s = await session(u);
    assert.equal((await call(deleteAccount, { method: "DELETE", body: { password: "wrong" }, headers: s.auth })).status, 400);
    assert.equal((await call(deleteAccount, { method: "DELETE", body: { password: PW }, headers: s.auth })).status, 200);
  });
});
