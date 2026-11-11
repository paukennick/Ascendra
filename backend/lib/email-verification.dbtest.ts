// REQ-191: sign-up, email verification and account recovery, end to end
// against a real database. Mail goes to a test transport (lib/email.ts
// __setEmailTransportForTest) or, for the SDK test, to a stubbed fetch
// behind the real Resend client; no mail is sent. Pages are exercised by
// calling the page component (the GET render) and the server action (the
// button's POST) directly.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-req191";
process.env.AUTH_ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString("base64");
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-req191";
process.env.RESEND_API_KEY ??= "re_fake";
process.env.APP_BASE_URL ??= "http://t";
import { test, after, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { isValidElement, type ReactNode } from "react";
import { query, queryOne, closePool } from "./db";
import { hashPassword } from "./auth/passwords";
import { signAccessToken, createRefreshToken } from "./auth/tokens";
import { __setEmailTransportForTest, sendVerificationEmail, EmailSendError, type EmailPayload } from "./email";
import { POST as register } from "../app/api/auth/register/route";
import { POST as login } from "../app/api/auth/login/route";
import { POST as resend } from "../app/api/auth/resend-verification/route";
import { POST as forgot } from "../app/api/auth/forgot-password/route";
import { POST as reset } from "../app/api/auth/reset-password/route";
import { POST as emailChange } from "../app/api/account/email/route";
import { POST as mfaEmailSetup } from "../app/api/auth/mfa/email/setup/route";
import VerifyEmailPage from "../app/verify-email/page";
import { confirmVerifyEmail } from "../app/verify-email/actions";
import { __setResetHandoffForTest } from "./reset-handoff";
import ConfirmEmailChangePage from "../app/confirm-email-change/page";
import { confirmEmailChange } from "../app/confirm-email-change/actions";
import CancelEmailChangePage from "../app/cancel-email-change/page";
import { cancelEmailChange } from "../app/cancel-email-change/actions";

// REQ-219 (FAIL-1107): the reset token is handed to the result page in a
// cookie, which a server action can't set outside a request; a stand-in keeps it.
let handoff: string | null = null;
__setResetHandoffForTest({
  set: async (t) => {
    handoff = t;
  },
  get: async () => handoff,
});

const testPw = (s: string) => s;
const run = Date.now().toString(36);
const created: string[] = [];

// --- mail capture ---------------------------------------------------------
type Captured = EmailPayload;
const mails: Captured[] = [];
let failNext: { name: string; statusCode: number | null } | null = null;
function captureTransport() {
  __setEmailTransportForTest(async (p) => {
    if (failNext) {
      const e = failNext;
      failNext = null;
      return { error: e };
    }
    mails.push(p);
    return { error: null };
  });
}
captureTransport();
const lastMail = (to: string) => mails.filter((m) => m.to === to).at(-1);
const tokenIn = (html: string, page: string) => decodeURIComponent(new RegExp(`${page}\\?token=([^"&]+)`).exec(html)![1]);

// --- console capture (structured failure logs) ----------------------------
const logged: string[] = [];
const origErr = console.error;
console.error = (...a: unknown[]) => {
  logged.push(a.map(String).join(" "));
  if (process.env.REQ191_DEBUG) origErr(...a);
};

// --- request helpers ------------------------------------------------------
// Fresh addresses per run: the per-IP limits (register, resend, forgot: 5 an
// hour) would otherwise trip when the suite is run repeatedly.
const ipBase = `10.${1 + Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
let ipSeq = 0;
async function call(handler: Function, body: unknown, headers: Record<string, string> = {}) {
  ipSeq++;
  const res: Response = await handler(
    new Request("http://t/x", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `${ipBase}.${ipSeq & 255}`, ...headers },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) }
  );
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed };
}

// Renders a server component tree far enough to read it: calls function
// components (sync or async) and collects text, forms and links.
async function render(node: unknown): Promise<{ text: string; forms: { token: string }[]; links: string[] }> {
  const out = { text: "", forms: [] as { token: string }[], links: [] as string[] };
  async function walk(n: unknown): Promise<void> {
    if (n === null || n === undefined || typeof n === "boolean") return;
    if (typeof n === "string" || typeof n === "number") {
      out.text += String(n);
      return;
    }
    if (Array.isArray(n)) {
      for (const c of n) await walk(c);
      return;
    }
    if (n instanceof Promise) return walk(await n);
    if (isValidElement(n)) {
      const props = n.props as { children?: ReactNode; href?: string; name?: string; value?: string };
      if (typeof n.type === "function") return walk(await (n.type as Function)(props));
      if (n.type === "a" && props.href) out.links.push(props.href);
      if (n.type === "input" && props.name === "token") out.forms.push({ token: String(props.value) });
      out.text += " ";
      return walk(props.children);
    }
  }
  await walk(node);
  return out;
}
const page = (Page: Function, params: Record<string, string>) => render(Page({ searchParams: Promise.resolve(params) }));

// Calls a server action like the form's POST and returns where it redirects.
async function post(action: (fd: FormData) => Promise<void>, token: string): Promise<URL> {
  const fd = new FormData();
  fd.set("token", token);
  try {
    await action(fd);
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      return new URL(digest.split(";").slice(2, -2).join(";"), "http://t");
    }
    throw err;
  }
  throw new Error("server action did not redirect");
}
const paramsOf = (u: URL) => Object.fromEntries(u.searchParams.entries());

async function newEmail(prefix: string) {
  return `${prefix}-${run}-${randomUUID().slice(0, 8)}@x.test`;
}
async function track(email: string) {
  const row = await queryOne<{ id: string }>(`select id from app_users where email = $1`, [email]);
  if (row) created.push(row.id);
  return row!.id;
}
const userRow = (id: string) =>
  queryOne<{ email: string; email_verified_at: Date | null; password_hash: string | null }>(
    `select email, email_verified_at, password_hash from app_users where id = $1`,
    [id]
  );
const openTokens = async (id: string) =>
  Number(
    (await queryOne<{ n: string }>(
      `select count(*) as n from email_verification_tokens where user_id = $1 and consumed_at is null`,
      [id]
    ))!.n
  );

async function signUp(prefix: string, password = testPw("Learner-Pass-191")) {
  const email = await newEmail(prefix);
  const r = await call(register, { email, password: testPw(password), ageConfirmed: true });
  assert.equal(r.status, 201);
  const id = await track(email);
  return { email, id, password, link: tokenIn(lastMail(email)!.html, "verify-email") };
}

beforeEach(() => {
  failNext = null;
  logged.length = 0;
});

after(async () => {
  __setEmailTransportForTest(null);
  console.error = origErr;
  await query(`delete from app_users where id = any($1::uuid[])`, [created]);
  await query(`delete from auth_events where identifier like $1`, [`%${run}%`]);
  await closePool();
});

describe("register then verify then log in (FAIL-670)", () => {
  test("GET of the verify page spends nothing; the POST verifies; login then works", async () => {
    const u = await signUp("flow");
    assert.equal((await call(login, { email: u.email, password: u.password })).status, 403);

    const shown = await page(VerifyEmailPage, { token: u.link });
    assert.match(shown.text, /Confirm your email address/);
    assert.deepEqual(shown.forms, [{ token: u.link }], "a confirm button carrying the token");
    assert.equal((await userRow(u.id))!.email_verified_at, null, "GET did not verify");
    assert.equal(await openTokens(u.id), 1, "GET did not spend the token");

    const to = await post(confirmVerifyEmail, u.link);
    assert.equal(to.pathname, "/verify-email");
    assert.deepEqual(paramsOf(to), { result: "verified" });
    assert.match((await page(VerifyEmailPage, paramsOf(to))).text, /Your email is verified/);
    assert.ok((await userRow(u.id))!.email_verified_at);
    assert.equal((await call(login, { email: u.email, password: u.password })).status, 200);
  });
});

describe("mail scanners (FAIL-670)", () => {
  test("a scanner's GETs before the click leave the link working; later clicks say already verified", async () => {
    const u = await signUp("scan");
    for (let i = 0; i < 3; i++) await page(VerifyEmailPage, { token: u.link });
    assert.equal(await openTokens(u.id), 1);

    assert.equal(paramsOf(await post(confirmVerifyEmail, u.link)).result, "verified");
    // A second click, or the scanner re-opening the link afterwards:
    assert.equal(paramsOf(await post(confirmVerifyEmail, u.link)).result, "already_verified");
    const again = await page(VerifyEmailPage, { token: u.link });
    assert.match(again.text, /Your email is already verified\. You can log in\./);
    assert.equal(again.forms.length, 0);
  });

  test("a spent link on an account still unverified is still 'invalid'", async () => {
    const u = await signUp("spent");
    await query(`update email_verification_tokens set consumed_at = now() where user_id = $1`, [u.id]);
    assert.match((await page(VerifyEmailPage, { token: u.link })).text, /invalid or has expired/);
    assert.equal(paramsOf(await post(confirmVerifyEmail, u.link)).result, "invalid");
    assert.equal((await userRow(u.id))!.email_verified_at, null);
  });

  test("an unknown token and a missing token", async () => {
    assert.match((await page(VerifyEmailPage, { token: "nope-" + run })).text, /invalid or has expired/);
    assert.match((await page(VerifyEmailPage, {})).text, /Missing verification token/);
  });

  test("result codes in the URL render fixed text only; a malformed reset token is not linked", async () => {
    handoff = 'x"><script>';
    const r = await page(VerifyEmailPage, { result: "set_password", reset: "ignored-" + "a".repeat(30) });
    assert.equal(r.links.length, 0, "neither a malformed cookie nor a URL parameter is linked");
    assert.match(r.text, /Forgot password/);
    handoff = null;
    assert.match((await page(VerifyEmailPage, { result: "bogus" })).text, /Missing verification token/);
  });
});

describe("resend after expiry", () => {
  test("an expired link says so; a resent link verifies; the old link then says already verified", async () => {
    const u = await signUp("expire");
    await query(`update email_verification_tokens set expires_at = now() - interval '1 minute' where user_id = $1`, [u.id]);
    assert.match((await page(VerifyEmailPage, { token: u.link })).text, /invalid or has expired/);

    const r = await call(resend, { email: u.email });
    assert.equal(r.status, 200);
    const fresh = tokenIn(lastMail(u.email)!.html, "verify-email");
    assert.notEqual(fresh, u.link);
    assert.equal(paramsOf(await post(confirmVerifyEmail, fresh)).result, "verified");
    assert.match((await page(VerifyEmailPage, { token: u.link })).text, /already verified/);
    assert.equal((await call(login, { email: u.email, password: u.password })).status, 200);
  });
});

describe("forgot password then reset then log in (FAIL-673)", () => {
  async function resetVia(email: string, pw: string) {
    assert.equal((await call(forgot, { email })).status, 200);
    const t = tokenIn(lastMail(email)!.html, "reset-password");
    const r = await call(reset, { token: t, newPassword: testPw(pw) });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }

  test("verified account: reset then login; verification time kept", async () => {
    const u = await signUp("reset-v");
    await post(confirmVerifyEmail, u.link);
    const before = (await userRow(u.id))!.email_verified_at!;
    await resetVia(u.email, "Brand-New-Pass-1");
    assert.equal((await call(login, { email: u.email, password: testPw("Brand-New-Pass-1") })).status, 200);
    assert.equal((await userRow(u.id))!.email_verified_at!.getTime(), before.getTime());
  });

  test("unverified account: a completed reset verifies the address, so login no longer answers 403", async () => {
    const u = await signUp("reset-u");
    assert.equal((await call(login, { email: u.email, password: u.password })).status, 403);
    await resetVia(u.email, "Brand-New-Pass-2");
    assert.ok((await userRow(u.id))!.email_verified_at, "reset proved the inbox");
    assert.equal(await openTokens(u.id), 0, "pending verification links spent");
    assert.equal((await call(login, { email: u.email, password: testPw("Brand-New-Pass-2") })).status, 200);
    assert.match((await page(VerifyEmailPage, { token: u.link })).text, /already verified/);
  });

  test("an unverified account that reset its password can't have it cleared by an old set_password link", async () => {
    const u = await signUp("reset-sp");
    // A second registration flags the account's links as set_password (REQ-116).
    await call(register, { email: u.email, password: testPw("Someone-Else-99"), ageConfirmed: true });
    const setPwLink = tokenIn(lastMail(u.email)!.html, "verify-email");
    await resetVia(u.email, "Owner-Chosen-Pw-3");
    assert.equal(paramsOf(await post(confirmVerifyEmail, setPwLink)).result, "already_verified");
    assert.ok((await userRow(u.id))!.password_hash, "password kept");
    assert.equal((await call(login, { email: u.email, password: testPw("Owner-Chosen-Pw-3") })).status, 200);
  });
});

describe("REQ-116 set_password (squatting) path scanner-safe (FAIL-670)", () => {
  test("scanner GET changes nothing; the owner's POST clears the squatter's password and shows the reset link", async () => {
    const squat = await signUp("squat", "Squatter-Pw-123");
    const hashBefore = (await userRow(squat.id))!.password_hash;
    await call(register, { email: squat.email, password: testPw("Owner-Pw-12345"), ageConfirmed: true });
    assert.match(lastMail(squat.email)!.subject, /Finish setting up/);
    const link = tokenIn(lastMail(squat.email)!.html, "verify-email");

    const scanned = await page(VerifyEmailPage, { token: link });
    assert.match(scanned.text, /Any password set on this account before is removed/);
    assert.equal(scanned.forms.length, 1);
    const afterScan = (await userRow(squat.id))!;
    assert.equal(afterScan.password_hash, hashBefore, "scanner GET did not clear the password");
    assert.equal(afterScan.email_verified_at, null);
    // The first registrant's original (now flagged) link shows the same button.
    assert.equal((await page(VerifyEmailPage, { token: squat.link })).forms.length, 1);

    const to = await post(confirmVerifyEmail, link);
    const p = paramsOf(to);
    assert.equal(p.result, "set_password");
    assert.deepEqual(p, { result: "set_password" }, "FAIL-1107: no token in the redirect URL");
    assert.ok(handoff, "the token was handed over out of band");
    const resetToken = handoff!;
    const done = await page(VerifyEmailPage, p);
    assert.match(done.text, /any password set before has been removed/);
    assert.deepEqual(done.links, [`/reset-password?token=${encodeURIComponent(resetToken)}`], "the page that spent it shows the reset link");

    const row = (await userRow(squat.id))!;
    assert.equal(row.password_hash, null);
    assert.ok(row.email_verified_at);
    assert.equal(await openTokens(squat.id), 0, "every other verification link spent");
    assert.equal((await call(login, { email: squat.email, password: testPw("Squatter-Pw-123") })).status, 401);
    assert.equal((await call(reset, { token: resetToken, newPassword: testPw("Owner-Final-Pw-1") })).status, 200);
    assert.equal((await call(login, { email: squat.email, password: testPw("Owner-Final-Pw-1") })).status, 200);
  });
});

describe("email change confirm and cancel (FAIL-672)", () => {
  async function verifiedUser() {
    const id = randomUUID();
    created.push(id);
    const email = await newEmail("chg");
    await query(`insert into app_users (id, email, password_hash, email_verified_at) values ($1, $2, $3, now())`, [
      id,
      email,
      await hashPassword("Change-Pass-191"),
    ]);
    const r = await createRefreshToken(id, { userAgent: `ua-${randomUUID()}` });
    const v = await queryOne<{ token_version: number }>(`select token_version from app_users where id = $1`, [id]);
    const access = signAccessToken({ sub: id, email, ver: v!.token_version, fam: r.familyId });
    return { id, email, auth: { authorization: `Bearer ${access}` } };
  }
  const liveSessions = async (id: string) =>
    Number(
      (await queryOne<{ n: string }>(`select count(*) as n from refresh_tokens where user_id = $1 and revoked_at is null`, [id]))!.n
    );

  test("confirm: GET shows the new address and changes nothing; POST changes it", async () => {
    const u = await verifiedUser();
    const target = await newEmail("chg-new");
    const r = await call(emailChange, { newEmail: target, reauth: testPw("Change-Pass-191") }, u.auth);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const t = tokenIn(lastMail(target)!.html, "confirm-email-change");

    const shown = await page(ConfirmEmailChangePage, { token: t });
    assert.ok(shown.text.includes(target));
    assert.equal(shown.forms.length, 1);
    assert.equal((await userRow(u.id))!.email, u.email, "GET changed nothing");

    assert.deepEqual(paramsOf(await post(confirmEmailChange, t)), { result: "changed" });
    assert.equal((await userRow(u.id))!.email, target);
    assert.match((await page(ConfirmEmailChangePage, { token: t })).text, /invalid or has expired/);
    assert.match((await page(ConfirmEmailChangePage, { result: "changed" })).text, /has been updated/);
  });

  test("cancel: GET signs nobody out; POST cancels and signs out every device", async () => {
    const u = await verifiedUser();
    const target = await newEmail("chg-cx");
    await call(emailChange, { newEmail: target, reauth: testPw("Change-Pass-191") }, u.auth);
    const cancel = tokenIn(lastMail(u.email)!.html, "cancel-email-change");
    const confirm = tokenIn(lastMail(target)!.html, "confirm-email-change");

    const shown = await page(CancelEmailChangePage, { token: cancel });
    assert.equal(shown.forms.length, 1);
    assert.equal(await liveSessions(u.id), 1, "GET signed nobody out");

    assert.deepEqual(paramsOf(await post(cancelEmailChange, cancel)), { result: "cancelled" });
    assert.equal(await liveSessions(u.id), 0);
    assert.match((await page(CancelEmailChangePage, { token: cancel })).text, /already been used/);
    assert.equal(paramsOf(await post(confirmEmailChange, confirm)).result, "invalid");
    assert.equal((await userRow(u.id))!.email, u.email);
  });
});

describe("Resend errors surface as EmailSendError (FAIL-674)", () => {
  test("the real Resend client's refused send (resend.dev 403) throws, without the address in the error", async () => {
    __setEmailTransportForTest(null);
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          statusCode: 403,
          name: "validation_error",
          message: "You can only send testing emails to your own email address (owner@example.test).",
        }),
        { status: 403, headers: { "content-type": "application/json" } }
      )) as unknown as typeof fetch;
    try {
      await assert.rejects(sendVerificationEmail("learner@x.test", "tok-secret-191"), (err: unknown) => {
        assert.ok(err instanceof EmailSendError);
        assert.equal(err.kind, "verification");
        assert.equal(err.code, "validation_error");
        assert.equal(err.statusCode, 403);
        assert.doesNotMatch(err.message, /@|tok-secret/);
        return true;
      });
    } finally {
      globalThis.fetch = realFetch;
      captureTransport();
    }
  });

  test("register keeps its generic 201 and logs one structured line with no address or token", async () => {
    const email = await newEmail("fail-reg");
    failNext = { name: "validation_error", statusCode: 403 };
    const r = await call(register, { email, password: testPw("Learner-Pass-191"), ageConfirmed: true });
    await track(email);
    assert.equal(r.status, 201);
    assert.match(r.body.message, /Check your email/);
    const line = logged.find((l) => l.includes("email_send_failed"));
    assert.ok(line, "failure logged");
    assert.deepEqual(JSON.parse(line!), {
      event: "email_send_failed",
      route: "auth/register",
      kind: "verification",
      code: "validation_error",
      statusCode: 403,
    });
    assert.ok(!line!.includes(email) && !line!.includes("@"));
  });

  test("forgot-password and resend-verification keep their generic answers and log", async () => {
    const u = await signUp("fail-fp");
    failNext = { name: "daily_quota_exceeded", statusCode: 429 };
    assert.equal((await call(forgot, { email: u.email })).status, 200);
    failNext = { name: "daily_quota_exceeded", statusCode: 429 };
    assert.equal((await call(resend, { email: u.email })).status, 200);
    const lines = logged.filter((l) => l.includes("email_send_failed")).map((l) => JSON.parse(l));
    assert.deepEqual(
      lines.map((l) => [l.route, l.kind]),
      [
        ["auth/forgot-password", "password_reset"],
        ["auth/resend-verification", "verification"],
      ]
    );
  });

  test("a signed-in action whose mail fails answers 409 (readable by the app) instead of 'sent'", async () => {
    const id = randomUUID();
    created.push(id);
    const email = await newEmail("fail-mfa");
    await query(`insert into app_users (id, email, password_hash, email_verified_at) values ($1, $2, $3, now())`, [
      id,
      email,
      await hashPassword("Mfa-Pass-191"),
    ]);
    const r0 = await createRefreshToken(id, { userAgent: "ua-191" });
    const access = signAccessToken({ sub: id, email, ver: 0, fam: r0.familyId });
    failNext = { name: "application_error", statusCode: 500 };
    const r = await call(mfaEmailSetup, {}, { authorization: `Bearer ${access}` });
    assert.equal(r.status, 409, JSON.stringify(r.body));
    assert.equal(r.body.retryable, true);
    assert.match(r.body.error, /couldn't send the email/);
    assert.ok(logged.some((l) => l.includes('"kind":"mfa_code"')));
  });
});
