// REQ-175 (FAIL-560): app builds from before the X-Ascendra-App header
// ("legacy clients") carry the previous Terms text and send its version.
// After the Terms moved to a new version they could never get past the
// Terms gate. Through the real routes against a real Postgres: a legacy
// client may accept the previous version, it is recorded exactly as sent,
// and it satisfies the legacy gate only; a headered client still needs the
// current version.
//
// REQ-205 (FAIL-901): the 2026-11-10 bump. Three kinds of installed build now
// exist, told apart by headers (lib/legal.ts legalContext): "legacy" (no
// X-Ascendra-App, text 2026-11-07), "app" (X-Ascendra-App but no
// X-Ascendra-Legal, text 2026-11-09 -- every build shipped since REQ-175) and
// "current" (declares X-Ascendra-Legal: the current text). An "app" build
// accepts its own 2026-11-09 text, so it gets no 400 and no loop; a "current"
// build must accept the current text.
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
  UNDECLARED_LEGAL_VERSIONS,
  LEGACY_LEGAL_VERSIONS,
  LEGAL_VERSION_HEADER,
  legalContext,
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

type Client = "legacy" | "app" | "current";
function req(u: string, client: Client, url: string, method = "GET", body?: unknown): Request {
  const headers: Record<string, string> = {
    authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
    "content-type": "application/json",
  };
  if (client !== "legacy") {
    headers[APP_VERSION_HEADER] = "2.0.0+u.abcdef12";
    headers[APP_PLATFORM_HEADER] = "android";
  }
  if (client === "current") headers[LEGAL_VERSION_HEADER] = CURRENT_TERMS_VERSION;
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
    for (const d of ["terms", "privacy"] as const) {
      // REQ-261: one document can be bumped alone (the 2026-11-14 Privacy Policy), so a document may be unchanged.
      assert.ok(PREVIOUS_LEGAL_VERSIONS[d] <= LEGAL_VERSIONS[d]);
      assert.ok(LEGACY_LEGAL_VERSIONS[d] < UNDECLARED_LEGAL_VERSIONS[d]);
    }
    assert.equal(UNDECLARED_LEGAL_VERSIONS.terms, "2026-11-09", "frozen: the text of builds that send X-Ascendra-App only");
    assert.equal(LEGACY_LEGAL_VERSIONS.terms, "2026-11-07", "frozen: the text of builds that send no header");
  });

  test("an installed 2026-11-09 build (X-Ascendra-App, no X-Ascendra-Legal) accepts its text: no 400, no loop, recorded as sent", async () => {
    const u = await newUser();
    // It accepted 2026-11-09 before the bump: it is not asked again.
    await json(await termsPost(req(u, "app", "/api/onboarding/terms", "POST", { version: UNDECLARED_LEGAL_VERSIONS.terms })));
    const s = await json(await onboardingGet(req(u, "app", "/api/onboarding")));
    assert.equal(s.terms.needsAcceptance, false);
    assert.equal(s.terms.acceptedVersion, "2026-11-09");
    assert.deepEqual((await json(await meGet(req(u, "app", "/api/auth/me")))).user.legalPending, []);
    assert.deepEqual(await recorded(u), [
      { document: "privacy", version: "2026-11-09", source: "prompt" },
      { document: "terms", version: "2026-11-09", source: "prompt" },
    ]);
    // The pair route (POST /api/legal/accept) too.
    const w = await newUser();
    const r = await json(await legalAcceptPost(req(w, "app", "/api/legal/accept", "POST", { termsVersion: "2026-11-09", privacyVersion: "2026-11-09" })));
    assert.deepEqual(r.accepted, { terms: "2026-11-09", privacy: "2026-11-09" });
    // ... but a build from before the header, with text 2026-11-07, is not one of these.
    await json(await termsPost(req(w, "app", "/api/onboarding/terms", "POST", { version: LEGACY_LEGAL_VERSIONS.terms })), 400);
  });

  test("a build with no header at all (text 2026-11-07) accepts it, and 2026-11-09, recorded as sent", async () => {
    const u = await newUser();
    const s = await json(await termsPost(req(u, "legacy", "/api/onboarding/terms", "POST", { version: LEGACY_LEGAL_VERSIONS.terms })));
    assert.equal(s.terms.needsAcceptance, false);
    assert.equal(s.terms.acceptedVersion, "2026-11-07");
    assert.deepEqual((await recorded(u)).map((x) => x.version), ["2026-11-07", "2026-11-07"]);
    const w = await newUser();
    await json(await termsPost(req(w, "legacy", "/api/onboarding/terms", "POST", { version: "2026-11-09" })));
    assert.deepEqual((await recorded(w)).map((x) => x.version), ["2026-11-09", "2026-11-09"]);
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

    let s = await json(await onboardingGet(req(u, "current", "/api/onboarding")));
    assert.equal(s.terms.needsAcceptance, true);
    // REQ-261: only the documents whose version changed are asked again (the 2026-11-14 bump moved the Privacy Policy alone).
    const changed = (["terms", "privacy"] as const).filter((d) => PREVIOUS_LEGAL_VERSIONS[d] !== LEGAL_VERSIONS[d]);
    assert.deepEqual(changed, ["privacy"], "this bump is the Privacy Policy alone");
    assert.deepEqual(s.terms.pending, changed);
    assert.equal(s.terms.acceptedVersion, PREVIOUS_TERMS_VERSION, "the agree screen says the terms changed");
    assert.deepEqual((await json(await meGet(req(u, "current", "/api/auth/me")))).user.legalPending, changed);

    s = await json(await termsPost(req(u, "current", "/api/onboarding/terms", "POST", { version: CURRENT_TERMS_VERSION })));
    assert.equal(s.terms.needsAcceptance, false);
    assert.equal(s.terms.acceptedVersion, CURRENT_TERMS_VERSION);
    // Each version accepted is kept as accepted; an unchanged document keeps its one row.
    assert.equal((await recorded(u)).length, 2 + changed.length, "the previous pair, and the changed document's new version");
  });

  test("a build that declares the current text cannot accept an older one, and a garbled header never widens", async () => {
    const u = await newUser();
    const err = await json(await termsPost(req(u, "current", "/api/onboarding/terms", "POST", { version: PREVIOUS_TERMS_VERSION })), 400);
    assert.doesNotMatch(err.error, /version must be/, "no raw internal string");
    assert.deepEqual(await recorded(u), []);
    // An unreadable app header is not legacy; an unreadable legal header is not "undeclared".
    const withHeaders = (extra: Record<string, string>) =>
      new Request("http://t/api/onboarding/terms", {
        method: "POST",
        headers: { ...Object.fromEntries(req(u, "app", "/x").headers), ...extra },
        body: JSON.stringify({ version: PREVIOUS_TERMS_VERSION }),
      });
    await json(await termsPost(withHeaders({ [APP_VERSION_HEADER]: "garbage", [LEGAL_VERSION_HEADER]: CURRENT_TERMS_VERSION })), 400);
    await json(await termsPost(withHeaders({ [LEGAL_VERSION_HEADER]: "garbage" })), 400);
    assert.deepEqual(await recorded(u), []);
    assert.deepEqual(legalContext(withHeaders({ [LEGAL_VERSION_HEADER]: "garbage" })), { legacy: false, declared: "garbage" });
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

  test("POST /api/legal/accept: the previous pair from a legacy or undeclared build, never from a current one, recorded as sent", async () => {
    const u = await newUser();
    const prev = { termsVersion: PREVIOUS_LEGAL_VERSIONS.terms, privacyVersion: PREVIOUS_LEGAL_VERSIONS.privacy };
    await json(await legalAcceptPost(req(u, "current", "/api/legal/accept", "POST", prev)), 400);
    assert.deepEqual(await recorded(u), []);
    const r = await json(await legalAcceptPost(req(u, "legacy", "/api/legal/accept", "POST", prev)));
    assert.deepEqual(r.accepted, { terms: PREVIOUS_LEGAL_VERSIONS.terms, privacy: PREVIOUS_LEGAL_VERSIONS.privacy });
    assert.deepEqual(
      (await recorded(u)).map((x) => x.version),
      [PREVIOUS_LEGAL_VERSIONS.privacy, PREVIOUS_LEGAL_VERSIONS.terms]
    );
  });

  test("sign-up: a legacy client's previous version is recorded as sent; a current build's is not recorded", async () => {
    const legacy = { legacy: true };
    const app = { legacy: false, declared: CURRENT_TERMS_VERSION };
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
      assert.match(src, /legalContext\(req\)/, route);
      assert.match(src, /signupAcceptedVersion\(body, termsCtx\)/, route);
      assert.match(src, /recordSignupTermsAcceptance\([^)]*termsCtx\)/, route);
    }
  });
});
