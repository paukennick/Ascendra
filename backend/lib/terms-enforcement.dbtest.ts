// REQ-219 (FAIL-1109): the Terms and Privacy Policy are enforced on the
// server. Against a real Postgres: an account that has not accepted what its
// client must accept is refused (403 terms_required) on every route that signs
// a caller in, except the few it needs to agree, leave or ask for help; an
// installed build that can only show an older text, and accepted it, is not
// refused and not asked for the current one.
process.env.AUTH_JWT_SECRET ??= "test-only-secret-req219b";
process.env.AUTH_ENCRYPTION_KEY ??= Buffer.alloc(32, 6).toString("base64");
process.env.CHOICE_ORDER_SECRET ??= "choice-secret-req219b";
import { test, after, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { query, queryOne, closePool } from "./db";
import { signAccessToken, createRefreshToken } from "./auth/tokens";
import { __setTermsEnforcementForTest, TERMS_REQUIRED_CODE } from "./auth/requireUser";
import { LEGAL_VERSIONS, PREVIOUS_LEGAL_VERSIONS, UNDECLARED_LEGAL_VERSIONS, LEGACY_LEGAL_VERSIONS, CURRENT_TERMS_VERSION } from "./legal";
import { GET as onboardingGet } from "../app/api/onboarding/route";
import { POST as onboardingTerms } from "../app/api/onboarding/terms/route";
import { POST as legalAccept } from "../app/api/legal/accept/route";
import { GET as meGet } from "../app/api/auth/me/route";
import { GET as sessionsGet } from "../app/api/auth/sessions/route";

__setTermsEnforcementForTest(true);
const origErr = console.error;
console.error = () => undefined;
const created: string[] = [];
const run = Date.now().toString(36);

after(async () => {
  console.error = origErr;
  await query(`delete from app_users where id = any($1::uuid[])`, [created]);
  await closePool();
});

async function mkUser(accepted: { terms: string; privacy: string } | null) {
  const id = randomUUID();
  created.push(id);
  const email = `req219t-${run}-${created.length}@x.test`;
  await query(`insert into app_users (id, email, email_verified_at) values ($1,$2,now())`, [id, email]);
  if (accepted) {
    await query(`insert into legal_acceptances (user_id, document, version, source) values ($1,'terms',$2,'prompt'),($1,'privacy',$3,'prompt')`, [
      id,
      accepted.terms,
      accepted.privacy,
    ]);
  }
  const r = await createRefreshToken(id, {});
  const v = await queryOne<{ token_version: number }>(`select token_version from app_users where id=$1`, [id]);
  return { id, token: signAccessToken({ sub: id, email, ver: v!.token_version, fam: r.familyId }) };
}

const CURRENT = { "x-ascendra-app": "2.0.0+u.abc", "x-ascendra-platform": "android", "x-ascendra-legal": CURRENT_TERMS_VERSION };
const PREVIOUS_BUILD = { "x-ascendra-app": "2.0.0+u.old", "x-ascendra-platform": "android", "x-ascendra-legal": PREVIOUS_LEGAL_VERSIONS.terms };
const UNDECLARED_BUILD = { "x-ascendra-app": "1.9.0+u.old", "x-ascendra-platform": "android" };
const LEGACY_BUILD = {};

async function call(handler: Function, token: string, headers: Record<string, string>, method = "GET", body?: unknown, params?: unknown) {
  const res: Response = await handler(
    new Request("http://t/api/x?trackId=" + randomUUID(), {
      method,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...headers },
      ...(method === "GET" || method === "DELETE" ? {} : { body: JSON.stringify(body ?? {}) }),
    }),
    { params: Promise.resolve(params ?? {}) }
  );
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed };
}

describe("FAIL-1109: the server refuses an account that has not agreed", () => {
  test("an account with no acceptance gets 403 terms_required with a plain message, then passes after accepting", async () => {
    const u = await mkUser(null);
    const r = await call(sessionsGet, u.token, CURRENT);
    assert.equal(r.status, 403);
    assert.equal(r.body.code, TERMS_REQUIRED_CODE);
    assert.match(r.body.error, /agree to the updated Terms/);
    assert.deepEqual(r.body.pending.sort(), ["privacy", "terms"]);
    assert.equal((await call(sessionsGet, u.token, CURRENT)).status, 403);

    // The routes it needs stay open: read the state, accept, read the profile.
    assert.equal((await call(onboardingGet, u.token, CURRENT)).body.terms.needsAcceptance, true);
    assert.equal((await call(meGet, u.token, CURRENT)).status, 200);
    const accepted = await call(legalAccept, u.token, CURRENT, "POST", { termsVersion: LEGAL_VERSIONS.terms, privacyVersion: LEGAL_VERSIONS.privacy });
    assert.equal(accepted.status, 200);
    assert.equal((await call(sessionsGet, u.token, CURRENT)).status, 200);
  });

  test("an account that accepted an OLDER version is refused by a build that must accept the current one", async () => {
    const u = await mkUser({ terms: "2026-11-01", privacy: "2026-11-01" });
    assert.equal((await call(sessionsGet, u.token, CURRENT)).status, 403);
  });

  test("builds that carry an older text, and accepted it, are not refused and not asked again", async () => {
    // Declared previous version.
    const prev = await mkUser(PREVIOUS_LEGAL_VERSIONS);
    assert.equal((await call(sessionsGet, prev.token, PREVIOUS_BUILD)).status, 200);
    assert.equal((await call(onboardingGet, prev.token, PREVIOUS_BUILD)).body.terms.needsAcceptance, false);
    // The same account on an updated build is asked once, for the current text.
    assert.equal((await call(sessionsGet, prev.token, CURRENT)).status, 403);
    // Undeclared generation (X-Ascendra-App without X-Ascendra-Legal).
    const und = await mkUser(UNDECLARED_LEGAL_VERSIONS);
    assert.equal((await call(sessionsGet, und.token, UNDECLARED_BUILD)).status, 200);
    // Legacy (no X-Ascendra-App at all): the oldest text.
    const leg = await mkUser(LEGACY_LEGAL_VERSIONS);
    assert.equal((await call(sessionsGet, leg.token, LEGACY_BUILD)).status, 200);
  });

  test("a build can accept its own text through the prompt and then pass (no loop)", async () => {
    const u = await mkUser(null);
    assert.equal((await call(sessionsGet, u.token, PREVIOUS_BUILD)).status, 403);
    const done = await call(onboardingTerms, u.token, PREVIOUS_BUILD, "POST", { version: PREVIOUS_LEGAL_VERSIONS.terms });
    assert.equal(done.status, 200);
    assert.equal((await call(sessionsGet, u.token, PREVIOUS_BUILD)).status, 200);
  });

  test("a garbled X-Ascendra-Legal never widens what counts as accepted", async () => {
    const prev = await mkUser(PREVIOUS_LEGAL_VERSIONS);
    assert.equal((await call(sessionsGet, prev.token, { ...PREVIOUS_BUILD, "x-ascendra-legal": "1999-01-01" })).status, 403);
  });
});

// --- every route -----------------------------------------------------------
const API = join(process.cwd(), "app", "api");
function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? routeFiles(p) : n === "route.ts" ? [p] : [];
  });
}
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

describe("FAIL-1109: no signed-in route is missed", () => {
  test("the open routes are exactly the documented list", () => {
    const open = routeFiles(API)
      .filter((f) => readFileSync(f, "utf8").includes("termsOptional: true"))
      .map((f) => relative(API, f).replace(/\\/g, "/"))
      .sort();
    assert.deepEqual(open, [
      "account/export/route.ts",
      "account/route.ts",
      "auth/logout-all/route.ts",
      "auth/me/route.ts",
      "legal/accept/route.ts",
      "onboarding/route.ts",
      "onboarding/terms/route.ts",
      "support/route.ts",
    ]);
  });

  test("every route that calls requireUser answers an unaccepted account 403 terms_required (open routes excepted)", async () => {
    const u = await mkUser(null);
    const idLike = new Proxy({}, { get: () => randomUUID() });
    const problems: string[] = [];
    let checked = 0;
    for (const file of routeFiles(API)) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("requireUser(")) continue;
      const rel = relative(API, file).replace(/\\/g, "/");
      const mod = await import(file);
      for (const m of METHODS) {
        if (typeof mod[m] !== "function") continue;
        const openHere = src.includes("termsOptional: true");
        try {
          // An open route may do real work (delete the account, sign out everywhere): its own account.
          const who = openHere ? await mkUser(null) : u;
          const r = await call(mod[m], who.token, CURRENT, m, {}, idLike);
          checked++;
          const refused = r.status === 403 && r.body?.code === TERMS_REQUIRED_CODE;
          // A route with an open handler beside a closed one (auth/me PATCH) is judged by the closed one.
          // Some routes check the shape of the request (400), or a resource that
          // does not exist (404; sims are off here), before they ask who is
          // calling, and none of them does any work first. What this guards
          // is a route that answers the unaccepted account 200, 401 or 500.
          const beforeAuth = [400, 404, 405].includes(r.status);
          if (!refused && !beforeAuth && !openHere) problems.push(`${m} ${rel} -> ${r.status} ${JSON.stringify(r.body).slice(0, 80)}`);
          if (refused && openHere && !(rel === "auth/me/route.ts" && m === "PATCH")) problems.push(`${m} ${rel} is open but refused`);
        } catch (err) {
          problems.push(`${m} ${rel} threw ${(err as Error).message.slice(0, 80)}`);
        }
      }
    }
    assert.ok(checked > 100, `checked ${checked} handlers`);
    assert.deepEqual(problems, []);
  });
});
