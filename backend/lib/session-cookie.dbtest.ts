// REQ-192: logout ends the session on the server; the web refresh token is
// an httpOnly cookie on /api/auth/refresh with an Origin check; an old web
// tab's sessionStorage token is exchanged once; native is unchanged. Real
// route handlers against a database with every migration applied.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-req192";
process.env.AUTH_ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString("base64");
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-req192";
process.env.RESEND_API_KEY ??= "re_fake";
process.env.APP_BASE_URL = "https://app.ascendra.test";
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { generate as totpGenerate } from "otplib";
import { query, queryOne, closePool } from "./db";
import { hashPassword } from "./auth/passwords";
import { encrypt } from "./auth/crypto";
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from "./auth/refreshCookie";
import { POST as login } from "../app/api/auth/login/route";
import { POST as mfaVerify } from "../app/api/auth/mfa/verify/route";
import { POST as refresh, DELETE as endWebSession } from "../app/api/auth/refresh/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { POST as logoutAll } from "../app/api/auth/logout-all/route";
import { GET as sessionsGet } from "../app/api/auth/sessions/route";

const origErr = console.error;
console.error = (...a: unknown[]) => {
  if (process.env.REQ192_DEBUG) origErr(...a);
};
const realFetch = globalThis.fetch;
globalThis.fetch = (async () =>
  new Response(JSON.stringify({ id: "x" }), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

const run = Date.now().toString(36);
const created: string[] = [];
const testPw = (s: string) => s;
const PW = testPw("Correct-Horse-192");
const ORIGIN = "https://app.ascendra.test";
const WEB = { "x-ascendra-platform": "web", "x-ascendra-app": "2.0.0+web", origin: ORIGIN };
const NATIVE = { "x-ascendra-platform": "android", "x-ascendra-app": "2.0.0+embedded" };
const SEED = "JBSWY3DPEHPK3PXP".repeat(2);

after(async () => {
  globalThis.fetch = realFetch;
  console.error = origErr;
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
    new Request(opts.url ?? `${ORIGIN}/api/auth/x`, {
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

function cookieValue(res: Res): string | null {
  const c = res.cookies.find((x) => x.startsWith(`${REFRESH_COOKIE}=`));
  if (!c) return null;
  const v = c.slice(REFRESH_COOKIE.length + 1).split(";")[0];
  return v ? decodeURIComponent(v) : "";
}
const withCookie = (token: string, extra: Record<string, string> = WEB) => ({ ...extra, cookie: `${REFRESH_COOKIE}=${encodeURIComponent(token)}` });

async function mkUser(opts: { totp?: string } = {}) {
  const id = randomUUID();
  created.push(id);
  const email = `req192-${run}-${created.length}@x.test`;
  await query(
    `insert into app_users (id,email,password_hash,email_verified_at,mfa_enabled,totp_secret_enc) values ($1,$2,$3,now(),$4,$5)`,
    [id, email, await hashPassword(PW), !!opts.totp, opts.totp ? encrypt(opts.totp) : null]
  );
  return { id, email };
}
const signIn = (email: string, headers: Record<string, string>) => call(login, { body: { email, password: PW }, headers });
// REQ-203: a replay within REFRESH_REUSE_GRACE_SECONDS of the rotation is a
// cross-tab race and is forgiven; these tests are about theft, so they let the
// window pass first.
const pastGraceWindow = (userId: string) =>
  query(`update refresh_tokens set revoked_at = revoked_at - interval '1 minute' where user_id = $1 and revoked_at is not null`, [userId]);
const liveTokens = async (userId: string) =>
  Number((await queryOne<{ n: string }>(`select count(*) n from refresh_tokens where user_id=$1 and revoked_at is null`, [userId]))!.n);

describe("native flows are unchanged", () => {
  test("login and refresh carry the token in the body and set no cookie; reuse still revokes the family", async () => {
    const u = await mkUser();
    const s = await signIn(u.email, NATIVE);
    assert.equal(s.status, 200);
    assert.equal(typeof s.body.refreshToken, "string");
    assert.deepEqual(s.cookies, []);
    const r = await call(refresh, { body: { refreshToken: s.body.refreshToken }, headers: NATIVE });
    assert.equal(r.status, 200);
    assert.equal(typeof r.body.refreshToken, "string");
    assert.notEqual(r.body.refreshToken, s.body.refreshToken);
    assert.deepEqual(r.cookies, []);
    await pastGraceWindow(u.id);
    assert.equal((await call(refresh, { body: { refreshToken: s.body.refreshToken }, headers: NATIVE })).status, 401);
    assert.equal((await call(refresh, { body: { refreshToken: r.body.refreshToken }, headers: NATIVE })).status, 401, "family revoked");
  });
  test("a legacy client (no app headers) and a body without a token behave as before", async () => {
    const u = await mkUser();
    const s = await signIn(u.email, {});
    assert.equal(typeof s.body.refreshToken, "string");
    assert.equal((await call(refresh, { body: {}, headers: {} })).status, 400);
    const r = await call(refresh, { body: { refreshToken: s.body.refreshToken } });
    assert.equal(r.status, 200);
    assert.equal(typeof r.body.refreshToken, "string");
  });
  test("a native client's cookie header is ignored (cookies are a web-only path)", async () => {
    const u = await mkUser();
    const s = await signIn(u.email, NATIVE);
    const r = await call(refresh, { headers: withCookie(s.body.refreshToken, NATIVE) });
    assert.equal(r.status, 403, "no web header: the cookie is never honoured");
    assert.equal((await call(refresh, { body: { refreshToken: s.body.refreshToken }, headers: NATIVE })).status, 200, "and the session was not spent");
  });
});

describe("logout revokes the session on the server (FAIL-690)", () => {
  test("native: logout with the refresh token ends it", async () => {
    const u = await mkUser();
    const s = await signIn(u.email, NATIVE);
    assert.equal((await call(logout, { body: { refreshToken: s.body.refreshToken }, headers: NATIVE })).status, 200);
    assert.equal((await call(refresh, { body: { refreshToken: s.body.refreshToken }, headers: NATIVE })).status, 401);
    assert.equal(await liveTokens(u.id), 0);
  });
  test("biometric unlock: logout with only the access token ends that session and no other", async () => {
    const u = await mkUser();
    const a = await signIn(u.email, NATIVE);
    const b = await signIn(u.email, { ...NATIVE, "user-agent": "other-device" });
    // The device rotated once (the sealed token is the newest one).
    const rotated = await call(refresh, { body: { refreshToken: a.body.refreshToken }, headers: NATIVE });
    const out = await call(logout, { headers: { ...NATIVE, authorization: `Bearer ${rotated.body.accessToken}` } });
    assert.equal(out.status, 200);
    assert.equal((await call(refresh, { body: { refreshToken: rotated.body.refreshToken }, headers: NATIVE })).status, 401, "the sealed token is dead");
    assert.equal((await call(refresh, { body: { refreshToken: b.body.refreshToken }, headers: NATIVE })).status, 200, "the other device is kept");
  });
  test("logout with neither a token nor a working access token is refused, not a silent success", async () => {
    assert.equal((await call(logout, { headers: NATIVE })).status, 400);
    assert.equal((await call(logout, { headers: { ...NATIVE, authorization: "Bearer junk" } })).status, 400);
  });
  test("web: DELETE /api/auth/refresh revokes the cookie session and clears the cookie, even with no access token", async () => {
    const u = await mkUser();
    const s = await signIn(u.email, WEB);
    const token = cookieValue(s)!;
    const out = await call(endWebSession, { method: "DELETE", headers: withCookie(token) });
    assert.equal(out.status, 200);
    assert.equal(cookieValue(out), "");
    assert.match(out.cookies[0], /Max-Age=0/);
    assert.equal(await liveTokens(u.id), 0);
    assert.equal((await call(refresh, { headers: withCookie(token) })).status, 401);
  });
});

describe("web: the refresh token is an httpOnly cookie, rotated on use", () => {
  test("login answers without a refresh token and sets the hardened cookie", async () => {
    const u = await mkUser();
    const s = await signIn(u.email, WEB);
    assert.equal(s.status, 200);
    assert.equal(s.body.refreshToken, undefined);
    assert.equal(typeof s.body.accessToken, "string");
    assert.equal(s.cookies.length, 1);
    const c = s.cookies[0];
    for (const attr of ["HttpOnly", "Secure", "SameSite=Strict", `Path=${REFRESH_COOKIE_PATH}`]) assert.ok(c.includes(attr), attr);
    assert.doesNotMatch(c, /Max-Age|Expires/, "a browser-session cookie, as sessionStorage was");
  });
  test("cookie refresh rotates: new cookie, old one is spent, replay ends the family", async () => {
    const u = await mkUser();
    const s = await signIn(u.email, WEB);
    const first = cookieValue(s)!;
    const r1 = await call(refresh, { headers: withCookie(first) });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.refreshToken, undefined);
    const second = cookieValue(r1)!;
    assert.ok(second && second !== first);
    const r2 = await call(refresh, { headers: withCookie(second) });
    assert.equal(r2.status, 200);
    await pastGraceWindow(u.id);
    const replay = await call(refresh, { headers: withCookie(first) });
    assert.equal(replay.status, 401);
    assert.equal(cookieValue(replay), "", "a refused cookie is cleared");
    assert.equal((await call(refresh, { headers: withCookie(cookieValue(r2)!) })).status, 401, "theft signal revoked the family");
  });
  test("no cookie answers 401 and clears, so the app goes to sign-in", async () => {
    const r = await call(refresh, { headers: WEB });
    assert.equal(r.status, 401);
    assert.equal(cookieValue(r), "");
  });
  test("two-factor sign-in sets the cookie too", async () => {
    const u = await mkUser({ totp: SEED });
    const s = await signIn(u.email, WEB);
    assert.equal(s.body.mfaRequired, true);
    const v = await call(mfaVerify, { body: { challengeToken: s.body.challengeToken, code: await totpGenerate({ secret: SEED }) }, headers: WEB });
    assert.equal(v.status, 200);
    assert.equal(v.body.refreshToken, undefined);
    assert.ok(cookieValue(v));
  });
  test("session listing and logout-all still work for a cookie session", async () => {
    const u = await mkUser();
    const web = await signIn(u.email, WEB);
    const phone = await signIn(u.email, { ...NATIVE, "user-agent": "phone" });
    const list = await call(sessionsGet, { method: "GET", headers: { ...WEB, authorization: `Bearer ${web.body.accessToken}` } });
    assert.equal(list.status, 200);
    assert.equal(list.body.sessions.length, 2);
    const all = await call(logoutAll, { headers: { ...WEB, authorization: `Bearer ${web.body.accessToken}` } });
    assert.equal(all.status, 200);
    assert.equal(cookieValue(all), "", "the browser's cookie is cleared");
    assert.equal(await liveTokens(u.id), 0);
    assert.equal((await call(refresh, { headers: withCookie(cookieValue(web)!) })).status, 401);
    assert.equal((await call(refresh, { body: { refreshToken: phone.body.refreshToken }, headers: NATIVE })).status, 401);
  });
});

describe("CSRF: a cookie refresh must come from our own origin (FAIL-692)", () => {
  test("a foreign, missing or null Origin is refused and the session is not spent", async () => {
    const u = await mkUser();
    const s = await signIn(u.email, WEB);
    const token = cookieValue(s)!;
    for (const origin of ["https://evil.test", "null", undefined]) {
      const headers: Record<string, string> = withCookie(token, { ...WEB });
      if (origin === undefined) delete headers.origin;
      else headers.origin = origin;
      const r = await call(refresh, { headers });
      assert.equal(r.status, 403, `origin ${origin}`);
      assert.equal(r.body.code, "csrf_rejected");
      assert.equal((await call(endWebSession, { method: "DELETE", headers })).status, 403, `logout, origin ${origin}`);
    }
    assert.equal(await liveTokens(u.id), 1, "nothing was rotated or revoked");
    assert.equal((await call(refresh, { headers: withCookie(token) })).status, 200, "the real app still refreshes");
  });
  test("APP_BASE_URL, the allowed origins and the request's own origin are accepted", async () => {
    const u = await mkUser();
    let token = cookieValue(await signIn(u.email, WEB))!;
    for (const [origin, url] of [
      ["https://app.ascendra.test", undefined],
      ["https://www.ascendra-learn.com", undefined],
      ["https://preview-123.vercel.test", "https://preview-123.vercel.test/api/auth/refresh"],
    ] as const) {
      const r = await call(refresh, { headers: withCookie(token, { ...WEB, origin }), url });
      assert.equal(r.status, 200, origin);
      token = cookieValue(r)!;
    }
  });
});

describe("migration: a web tab holding an old sessionStorage token", () => {
  test("exchanges it once for the cookie; the old token is then spent", async () => {
    const u = await mkUser();
    // Issued to the web app before REQ-192: in the body.
    const old = (await signIn(u.email, { "x-ascendra-app": "2.0.0+web" })).body.refreshToken as string;
    assert.equal(typeof old, "string");
    const m = await call(refresh, { body: { refreshToken: old }, headers: WEB });
    assert.equal(m.status, 200);
    assert.equal(m.body.refreshToken, undefined, "the new token is never handed to the page");
    const cookie = cookieValue(m)!;
    assert.ok(cookie);
    assert.equal((await call(refresh, { headers: withCookie(cookie) })).status, 200, "the cookie now carries the session");
  });
  test("an old token that no longer works answers 401 (the app falls back to sign-in) and leaves any cookie alone", async () => {
    const r = await call(refresh, { body: { refreshToken: "not-a-real-token" }, headers: WEB });
    assert.equal(r.status, 401);
    // REQ-203 (FAIL-868): only a cookie that itself failed is cleared.
    assert.deepEqual(r.cookies, []);
  });
});
