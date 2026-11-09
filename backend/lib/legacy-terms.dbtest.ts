// REQ-175 (FAIL-560): app builds from before the X-Ascendra-App header
// ("legacy clients") carry the previous Terms text and send its version.
// After the Terms moved to a new version they could never get past the
// Terms gate. Through the real routes against a real Postgres: a legacy
// client may accept the previous version, it is recorded exactly as sent,
// and it satisfies the legacy gate only; a headered client still needs the
// current version.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import {
  CURRENT_TERMS_VERSION,
  LEGAL_VERSIONS,
  PREVIOUS_LEGAL_VERSIONS,
  PREVIOUS_TERMS_VERSION,
  recordSignupTermsAcceptance,
  signupAcceptedVersion,
} from "./legal";
import { APP_VERSION_HEADER, APP_PLATFORM_HEADER } from "./client-version";
import { GET as onboardingGet } from "../app/api/onboarding/route";
import { POST as termsPost } from "../app/api/onboarding/terms/route";
import { POST as legalAcceptPost } from "../app/api/legal/accept/route";
import { GET as meGet } from "../app/api/auth/me/route";

const run = Date.now().toString(36);
const users: string[] = [];

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `lt-${run}-${users.length}@example.test`]);
  return u;
}

type Client = "legacy" | "app";
function req(u: string, client: Client, url: string, method = "GET", body?: unknown): Request {
  const headers: Record<string, string> = {
    authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
    "content-type": "application/json",
  };
  if (client === "app") {
    headers[APP_VERSION_HEADER] = "2.0.0+u.abcdef12";
    headers[APP_PLATFORM_HEADER] = "android";
  }
  return new Request(`http://t${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
const recorded = (u: string) =>
  query<{ document: string; version: string; source: string }>(
    `select document, version, source from legal_acceptances where user_id = $1 and document in ('terms', 'privacy') order by document, version`,
    [u]
  );

after(async () => {
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("legacy clients and the Terms gate (REQ-175, FAIL-560)", () => {
  test("the previous version really is older than the current one", () => {
    assert.notEqual(PREVIOUS_TERMS_VERSION, CURRENT_TERMS_VERSION);
    assert.ok(PREVIOUS_TERMS_VERSION < CURRENT_TERMS_VERSION);
    for (const d of ["terms", "privacy"] as const) assert.ok(PREVIOUS_LEGAL_VERSIONS[d] < LEGAL_VERSIONS[d]);
  });

  test("an old build (no header) accepts the previous version; it is recorded as sent and clears its gate", async () => {
    const u = await newUser();
    assert.equal((await json(await onboardingGet(req(u, "legacy", "/api/onboarding")))).terms.needsAcceptance, true);

    const s = await json(await termsPost(req(u, "legacy", "/api/onboarding/terms", "POST", { version: PREVIOUS_TERMS_VERSION })));
    assert.equal(s.terms.needsAcceptance, false, "the old build stops looping");
    assert.equal(s.terms.acceptedVersion, PREVIOUS_TERMS_VERSION);
    assert.deepEqual(s.terms.pending, []);
    assert.deepEqual(await recorded(u), [
      { document: "privacy", version: PREVIOUS_LEGAL_VERSIONS.privacy, source: "prompt" },
      { document: "terms", version: PREVIOUS_LEGAL_VERSIONS.terms, source: "prompt" },
    ], "never recorded as the current version");

    // The same account on the old build again: still not asked.
    assert.equal((await json(await onboardingGet(req(u, "legacy", "/api/onboarding")))).terms.needsAcceptance, false);
    const me = await json(await meGet(req(u, "legacy", "/api/auth/me")));
    assert.deepEqual(me.user.legalPending, []);
  });

  test("after updating, the same account is asked once for the current version", async () => {
    const u = await newUser();
    await json(await termsPost(req(u, "legacy", "/api/onboarding/terms", "POST", { version: PREVIOUS_TERMS_VERSION })));

    let s = await json(await onboardingGet(req(u, "app", "/api/onboarding")));
    assert.equal(s.terms.needsAcceptance, true);
    assert.deepEqual(s.terms.pending, ["terms", "privacy"]);
    assert.equal(s.terms.acceptedVersion, PREVIOUS_TERMS_VERSION, "the agree screen says the terms changed");
    assert.deepEqual((await json(await meGet(req(u, "app", "/api/auth/me")))).user.legalPending, ["terms", "privacy"]);

    s = await json(await termsPost(req(u, "app", "/api/onboarding/terms", "POST", { version: CURRENT_TERMS_VERSION })));
    assert.equal(s.terms.needsAcceptance, false);
    assert.equal(s.terms.acceptedVersion, CURRENT_TERMS_VERSION);
    assert.equal((await recorded(u)).length, 4, "both versions kept, each as accepted");
  });

  test("a build that sends the header cannot accept the previous version", async () => {
    const u = await newUser();
    const err = await json(await termsPost(req(u, "app", "/api/onboarding/terms", "POST", { version: PREVIOUS_TERMS_VERSION })), 400);
    assert.doesNotMatch(err.error, /version must be/, "no raw internal string");
    assert.deepEqual(await recorded(u), []);
    // An unreadable header is not legacy either.
    const garbled = new Request("http://t/api/onboarding/terms", {
      method: "POST",
      headers: { ...Object.fromEntries(req(u, "app", "/x").headers), [APP_VERSION_HEADER]: "garbage" },
      body: JSON.stringify({ version: PREVIOUS_TERMS_VERSION }),
    });
    await json(await termsPost(garbled), 400);
    assert.deepEqual(await recorded(u), []);
  });

  test("an older-than-previous version is refused from anyone", async () => {
    const u = await newUser();
    await json(await termsPost(req(u, "legacy", "/api/onboarding/terms", "POST", { version: "2020-01-01" })), 400);
    assert.deepEqual(await recorded(u), []);
  });

  test("a legacy client may still accept the current version (a cached web bundle from #67)", async () => {
    const u = await newUser();
    const s = await json(await termsPost(req(u, "legacy", "/api/onboarding/terms", "POST", { version: CURRENT_TERMS_VERSION })));
    assert.equal(s.terms.acceptedVersion, CURRENT_TERMS_VERSION);
    assert.equal((await json(await onboardingGet(req(u, "app", "/api/onboarding")))).terms.needsAcceptance, false);
  });

  test("POST /api/legal/accept: previous pair from a legacy client only, recorded as sent", async () => {
    const u = await newUser();
    const prev = { termsVersion: PREVIOUS_LEGAL_VERSIONS.terms, privacyVersion: PREVIOUS_LEGAL_VERSIONS.privacy };
    await json(await legalAcceptPost(req(u, "app", "/api/legal/accept", "POST", prev)), 400);
    assert.deepEqual(await recorded(u), []);
    const r = await json(await legalAcceptPost(req(u, "legacy", "/api/legal/accept", "POST", prev)));
    assert.deepEqual(r.accepted, { terms: PREVIOUS_LEGAL_VERSIONS.terms, privacy: PREVIOUS_LEGAL_VERSIONS.privacy });
    assert.deepEqual(
      (await recorded(u)).map((x) => x.version),
      [PREVIOUS_LEGAL_VERSIONS.privacy, PREVIOUS_LEGAL_VERSIONS.terms]
    );
  });

  test("sign-up: a legacy client's previous version is recorded as sent; a headered one's is not recorded", async () => {
    const legacy = { legacy: true };
    const app = { legacy: false };
    assert.equal(signupAcceptedVersion({ acceptedTermsVersion: PREVIOUS_TERMS_VERSION }, legacy), PREVIOUS_TERMS_VERSION);
    assert.equal(
      signupAcceptedVersion({ termsVersion: PREVIOUS_LEGAL_VERSIONS.terms, privacyVersion: PREVIOUS_LEGAL_VERSIONS.privacy }, legacy),
      PREVIOUS_TERMS_VERSION
    );
    assert.equal(
      signupAcceptedVersion({ termsVersion: PREVIOUS_LEGAL_VERSIONS.terms, privacyVersion: PREVIOUS_LEGAL_VERSIONS.privacy }, app),
      undefined
    );

    const a = await newUser();
    const b = await newUser();
    assert.equal(await recordSignupTermsAcceptance(a, PREVIOUS_TERMS_VERSION, "google_signup", legacy), true);
    assert.equal(await recordSignupTermsAcceptance(b, PREVIOUS_TERMS_VERSION, "register", app), false);
    assert.deepEqual(await recorded(a), [
      { document: "privacy", version: PREVIOUS_LEGAL_VERSIONS.privacy, source: "google_signup" },
      { document: "terms", version: PREVIOUS_LEGAL_VERSIONS.terms, source: "google_signup" },
    ]);
    assert.deepEqual(await recorded(b), []);
  });

  test("the register and Google routes pass the request's client context (static)", () => {
    for (const route of ["register", "oauth/google"]) {
      const src = readFileSync(join(__dirname, "..", "app", "api", "auth", route, "route.ts"), "utf8");
      assert.match(src, /isLegacyClient\(req\)/, route);
      assert.match(src, /signupAcceptedVersion\(body, termsCtx\)/, route);
      assert.match(src, /recordSignupTermsAcceptance\([^)]*termsCtx\)/, route);
    }
  });
});
