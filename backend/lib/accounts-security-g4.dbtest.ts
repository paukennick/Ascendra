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
import { hashPassword } from "./auth/passwords";
import { encrypt } from "./auth/crypto";
import { signAccessToken, createRefreshToken } from "./auth/tokens";
import { __setGoogleVerifierForTest } from "./auth/oauth";
import { hashEmailCode } from "./auth/mfa";
import { POST as mfaDisable } from "../app/api/auth/mfa/disable/route";
import { POST as emailMfaDisable } from "../app/api/auth/mfa/email/disable/route";
import { POST as login } from "../app/api/auth/login/route";

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
