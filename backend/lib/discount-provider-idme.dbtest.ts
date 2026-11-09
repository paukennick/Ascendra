// REQ-167: ID.me end to end against a real Postgres, with ID.me itself
// mocked (a fake fetch): start -> ID.me URL -> our callback -> stored result
// -> redirect to the app. No real credentials, no network.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { IDME_CALLBACK_PATH } from "./discount-provider-idme";
import { POST as verifyPost } from "../app/api/discounts/verify/route";
import { GET as statusGet } from "../app/api/discounts/route";
import { GET as callbackGet } from "../app/api/discounts/verify/idme/callback/route";

const run = Date.now().toString(36);
const users: string[] = [];
const KEYS = ["BILLING_ENABLED", "VERIFIED_DISCOUNTS_ENABLED", "DISCOUNT_PERCENT_MILITARY", "IDME_CLIENT_ID", "IDME_CLIENT_SECRET", "IDME_REDIRECT_URI", "IDME_ENVIRONMENT"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
const realFetch = globalThis.fetch;

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
async function newUser() {
  const u = randomUUID();
  users.push(u);
  await query("insert into app_users (id, email, email_verified_at) values ($1, $2, now())", [u, `idme-${run}-${users.length}@example.test`]);
  return u;
}
function on() {
  Object.assign(process.env, {
    BILLING_ENABLED: "true",
    VERIFIED_DISCOUNTS_ENABLED: "true",
    DISCOUNT_PERCENT_MILITARY: "20",
    IDME_CLIENT_ID: "cid",
    IDME_CLIENT_SECRET: "csecret",
    IDME_REDIRECT_URI: `https://api.example.test${IDME_CALLBACK_PATH}`,
    IDME_ENVIRONMENT: "sandbox",
  });
}
function mockIdme(uuid: string, groups: Record<string, boolean>) {
  globalThis.fetch = (async (url: string) => {
    if (String(url).endsWith("/oauth/token")) return new Response(JSON.stringify({ access_token: "at" }), { status: 200 });
    return new Response(
      JSON.stringify({
        attributes: [{ handle: "uuid", name: "Unique Identifier", value: uuid }, { handle: "fname", name: "First Name", value: "Pat" }],
        status: Object.entries(groups).map(([group, verified]) => ({ group, subgroups: [], verified })),
      }),
      { status: 200 }
    );
  }) as typeof fetch;
}
async function start(u: string, group = "military"): Promise<string> {
  const res = await verifyPost(new Request("http://t/api/discounts/verify", { method: "POST", headers: auth(u), body: JSON.stringify({ group, client: "app" }) }));
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.url;
}
async function callback(qs: Record<string, string>) {
  const res = await callbackGet(new Request(`https://api.example.test${IDME_CALLBACK_PATH}?${new URLSearchParams(qs)}`));
  assert.equal(res.status, 302);
  return res.headers.get("location");
}

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
  globalThis.fetch = realFetch;
});
after(async () => {
  for (const k of KEYS) (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]));
  globalThis.fetch = realFetch;
  if (users.length) await query("delete from app_users where id = any($1)", [users]);
  await closePool();
});

describe("REQ-167 ID.me end to end (mocked)", () => {
  test("without ID.me credentials verified discounts stay off", async () => {
    const u = await newUser();
    on();
    delete process.env.IDME_CLIENT_SECRET;
    const res = await statusGet(new Request("http://t/api/discounts", { headers: auth(u) }));
    assert.deepEqual(await res.json(), { available: false });
  });

  test("verified: stores only the result with ID.me's uuid and returns to the app", async () => {
    const u = await newUser();
    on();
    const url = new URL(await start(u));
    assert.equal(url.origin, "https://api.idmelabs.com");
    assert.equal(url.searchParams.get("scope"), "military");
    mockIdme(`${run}-uuid-1`, { military: true });
    const loc = await callback({ code: "c", state: url.searchParams.get("state")! });
    assert.equal(loc, "preplms://settings/discount?verify=verified");
    const row = await queryOne<any>("select group_id, provider, provider_subject from verified_discounts where user_id = $1", [u]);
    assert.deepEqual(row, { group_id: "military", provider: "idme", provider_subject: `${run}-uuid-1` });
  });

  test("not verified for the group, declined, or a bad state: nothing stored", async () => {
    const u = await newUser();
    on();
    let state = new URL(await start(u)).searchParams.get("state")!;
    mockIdme(`${run}-uuid-2`, { military: false, student: true });
    assert.equal(await callback({ code: "c", state }), "preplms://settings/discount?verify=not_verified");
    state = new URL(await start(u)).searchParams.get("state")!;
    assert.equal(await callback({ error: "access_denied", state }), "preplms://settings/discount?verify=not_verified");
    assert.equal(await callback({ code: "c", state: "forged.state" }), "preplms://settings/discount?verify=expired");
    globalThis.fetch = (async () => new Response("{}", { status: 500 })) as typeof fetch;
    state = new URL(await start(u)).searchParams.get("state")!;
    assert.equal(await callback({ code: "c", state }), "preplms://settings/discount?verify=failed");
    assert.equal((await query("select 1 from verified_discounts where user_id = $1", [u])).length, 0);
  });
});
