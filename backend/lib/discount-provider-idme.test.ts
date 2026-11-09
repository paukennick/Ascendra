// REQ-167: the ID.me provider, with ID.me mocked (a fake fetch). No real
// credentials, no network.
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { IDME_CALLBACK_PATH, idmeProvider, parseAttributes } from "./discount-provider-idme";
import { configuredProviders, pkceChallenge } from "./discount-providers";

const ENV = {
  IDME_CLIENT_ID: "cid",
  IDME_CLIENT_SECRET: "csecret",
  IDME_REDIRECT_URI: `https://api.example.test${IDME_CALLBACK_PATH}`,
};
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("REQ-167 ID.me configuration", () => {
  test("unconfigured without all three settings or with a wrong redirect", () => {
    assert.equal(idmeProvider.configured({}), false);
    assert.equal(idmeProvider.configured({ ...ENV, IDME_CLIENT_SECRET: "" }), false);
    assert.equal(idmeProvider.configured({ ...ENV, IDME_REDIRECT_URI: "https://api.example.test/elsewhere" }), false);
    assert.equal(idmeProvider.configured({ ...ENV, IDME_REDIRECT_URI: `http://api.example.test${IDME_CALLBACK_PATH}` }), false);
    assert.equal(idmeProvider.configured({ ...ENV, IDME_REDIRECT_URI: `http://localhost:3000${IDME_CALLBACK_PATH}` }), true);
    assert.equal(idmeProvider.configured(ENV), true);
    assert.deepEqual(configuredProviders({}).map((p) => p.id), []);
    assert.deepEqual(configuredProviders(ENV).map((p) => p.id), ["idme"]);
  });

  test("groups: every group by default, or IDME_GROUPS", () => {
    assert.deepEqual([...idmeProvider.groups(ENV)], ["military", "responder", "nurse", "student", "teacher"]);
    assert.deepEqual([...idmeProvider.groups({ ...ENV, IDME_GROUPS: "nurse, military" })], ["military", "nurse"]);
  });

  test("authorization URL: production or sandbox host, group scope, state, S256 challenge", () => {
    const challenge = pkceChallenge("v");
    const u = new URL(idmeProvider.authorizationUrl({ group: "responder", state: "st.sig", codeChallenge: challenge }, ENV));
    assert.equal(u.origin + u.pathname, "https://api.id.me/oauth/authorize");
    assert.equal(u.searchParams.get("client_id"), "cid");
    assert.equal(u.searchParams.get("redirect_uri"), ENV.IDME_REDIRECT_URI);
    assert.equal(u.searchParams.get("response_type"), "code");
    assert.equal(u.searchParams.get("scope"), "responder");
    assert.equal(u.searchParams.get("state"), "st.sig");
    assert.equal(u.searchParams.get("code_challenge"), challenge);
    assert.equal(u.searchParams.get("code_challenge_method"), "S256");
    assert.equal(u.searchParams.get("client_secret"), null);
    const sb = new URL(idmeProvider.authorizationUrl({ group: "nurse", state: "s", codeChallenge: challenge }, { ...ENV, IDME_ENVIRONMENT: "sandbox" }));
    assert.equal(sb.origin, "https://api.idmelabs.com");
  });
});

describe("REQ-167 ID.me exchange (mocked)", () => {
  test("token exchange then attributes; only uuid and verified groups come back", async () => {
    const calls: { url: string; method: string; body: string }[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), method: init.method ?? "GET", body: String(init.body ?? "") });
      if (String(url).endsWith("/oauth/token")) return new Response(JSON.stringify({ access_token: "at", token_type: "bearer" }), { status: 200 });
      return new Response(
        JSON.stringify({
          attributes: [
            { handle: "fname", name: "First Name", value: "Pat" },
            { handle: "email", name: "Email", value: "pat@example.test" },
            { handle: "uuid", name: "Unique Identifier", value: "abc123" },
          ],
          status: [
            { group: "military", subgroups: ["Veteran"], verified: true },
            { group: "student", subgroups: [""], verified: false },
          ],
        }),
        { status: 200 }
      );
    }) as typeof fetch;
    const out = await idmeProvider.complete({ code: "the-code", codeVerifier: "the-verifier", group: "military" }, ENV);
    assert.deepEqual(out, { subject: "abc123", verifiedGroups: ["military"], expiresAt: null });
    assert.equal(calls[0].url, "https://api.id.me/oauth/token");
    assert.equal(calls[0].method, "POST");
    const form = new URLSearchParams(calls[0].body);
    assert.deepEqual(Object.fromEntries(form), {
      grant_type: "authorization_code",
      code: "the-code",
      client_id: "cid",
      client_secret: "csecret",
      redirect_uri: ENV.IDME_REDIRECT_URI,
      code_verifier: "the-verifier",
    });
    assert.equal(calls[1].url, "https://api.id.me/api/public/v3/attributes.json?access_token=at");
    // Nothing personal beyond the uuid is returned.
    assert.ok(!JSON.stringify(out).includes("Pat"));
    assert.ok(!JSON.stringify(out).includes("pat@example.test"));
  });

  test("ID.me errors throw (and never echo the body)", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "invalid_grant", detail: "secret stuff" }), { status: 400 })) as typeof fetch;
    await assert.rejects(idmeProvider.complete({ code: "c", codeVerifier: "v", group: "nurse" }, ENV), (e: Error) => {
      assert.match(e.message, /token exchange failed: 400 invalid_grant/);
      assert.ok(!e.message.includes("secret stuff"));
      return true;
    });
    globalThis.fetch = (async () => new Response("not json", { status: 200 })) as typeof fetch;
    await assert.rejects(idmeProvider.complete({ code: "c", codeVerifier: "v", group: "nurse" }, ENV), /token exchange failed/);
    globalThis.fetch = (async () => new Response(JSON.stringify({ token_type: "bearer" }), { status: 200 })) as typeof fetch;
    await assert.rejects(idmeProvider.complete({ code: "c", codeVerifier: "v", group: "nurse" }, ENV), /no access token/);
    await assert.rejects(idmeProvider.complete({ code: "c", codeVerifier: "v", group: "nurse" }, {}), /isn't configured/);
  });

  test("attributes parsing is defensive", () => {
    assert.deepEqual(parseAttributes(null), { subject: "", verifiedGroups: [], expiresAt: null });
    assert.deepEqual(parseAttributes({ attributes: "x", status: [{ group: "Nurse", verified: true }, { group: "nurse", verified: true }, { verified: true }] }), {
      subject: "",
      verifiedGroups: ["nurse"],
      expiresAt: null,
    });
    assert.equal(parseAttributes({ attributes: [{ handle: "uuid", value: 42 }] }).subject, "42");
  });
});
