// REQ-205 (FAIL-900..919): the legal and privacy batch, pure parts. The
// stateful parts are in legal-privacy-f4.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SUPPORT_EMAIL, supportEmail } from "./support-contact";
import { RETENTION } from "./retention";
import { localProviderInProduction, assertSafeProductionConfig } from "./env-check";
import { isAgeConfirmed, MINIMUM_AGE, AGE_CONFIRMATION_REQUIRED } from "./age-confirmation";
import { EXPORT_SECTIONS } from "./account-export";
import {
  buildForward,
  forwardReceivedEmail,
  htmlToText,
  inboundConfig,
  receivedEvent,
  senderAddress,
  verifyResendWebhook,
  FORWARD_MARKER_HEADER,
} from "./inbound-email";
import { POST as inboundPost } from "../app/api/inbound/email/route";

const root = join(__dirname, "..", "..");
const legalTs = readFileSync(join(root, "mobile", "src", "content", "legal.ts"), "utf8");
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8");

describe("owner decisions in the legal text (FAIL-901)", () => {
  test("no bracketed placeholder is left, and no draft banner", () => {
    assert.doesNotMatch(legalTs, /\[(Operator|Contact|State or country|Minimum age|Retention)[^\]]*\]/);
    assert.doesNotMatch(legalTs, /Draft for legal review/);
    assert.doesNotMatch(read("mobile", "src", "components", "LegalPage.tsx"), /doc\.status/);
    assert.doesNotMatch(read("backend", "app", "delete-account", "page.tsx"), /\[Contact email/);
  });
  test("Nick's decisions are in OWNER", () => {
    assert.match(legalTs, /operator: "Nicholas Pauken"/);
    assert.match(legalTs, /governingLaw: "the State of Washington, USA"/);
    assert.match(legalTs, /minimumAge: "16"/);
  });
  test("the app's contact address is the server's default", () => {
    assert.match(legalTs, new RegExp(`contactEmail: "${DEFAULT_SUPPORT_EMAIL.replace(/[.]/g, "\\.")}"`));
  });
  test("SUPPORT_EMAIL overrides the default; junk falls back to it, never to a placeholder", () => {
    assert.equal(supportEmail({}), DEFAULT_SUPPORT_EMAIL);
    assert.equal(supportEmail({ SUPPORT_EMAIL: " help@example.test " }), "help@example.test");
    for (const bad of ["", "   ", "not an address", "a@b", "x@y.z\n<script>"]) assert.equal(supportEmail({ SUPPORT_EMAIL: bad }), DEFAULT_SUPPORT_EMAIL, JSON.stringify(bad));
  });
  test("the AI count retention in the text is the one the purge uses", () => {
    assert.equal(RETENTION.aiCallsMonths, 12);
    assert.match(legalTs, new RegExp(`AI_COUNTS_MONTHS = ${RETENTION.aiCallsMonths};`));
  });
});

describe("what the policy discloses (FAIL-902, FAIL-903)", () => {
  const privacy = legalTs.slice(legalTs.indexOf("export const PRIVACY"), legalTs.indexOf("export const COOKIES"));
  test("GitHub, the 30-day encrypted backups and the in-database copies (at most 37 days)", () => {
    assert.match(privacy, /GitHub — stores our encrypted nightly database backups/);
    assert.match(privacy, /Encrypted nightly database backups: 30 days/);
    assert.match(privacy, /never more than 37 days/);
    assert.match(privacy, /accounts that were deleted after it was made/);
  });
  test("the release-backup period matches the housekeeping workflow", () => {
    const wf = read(".github", "workflows", "backup-housekeeping.yml");
    assert.match(wf, /more than 30 days before the run date/);
    assert.match(wf, /cron: "17 9 \* \* 2"/, "weekly: 30 + up to 7 days = 37");
  });
  test("the nightly backup retention matches the workflow", () => {
    assert.match(read(".github", "workflows", "db-backup.yml"), /retention-days: 30/);
  });
  test("Sentry is a processor, and the no-crash-reporting claim is gone", () => {
    assert.match(privacy, /Sentry — receives reports of technical errors/);
    assert.doesNotMatch(privacy, /no analytics or crash-reporting trackers/);
  });
  test("what stays after deletion is listed with periods", () => {
    assert.match(privacy, /AI request counts, with the link to your account removed/);
    assert.match(privacy, /Billing records: paid plans are not switched on/);
    assert.match(privacy, /Our support inbox, and Resend/);
  });
  test("16 or older, no date of birth", () => {
    assert.match(privacy, /confirmed you are 16 or older/);
    assert.match(privacy, /We don't ask for or keep your date of birth/);
  });
  test("the delete page and the policy say the same kept items", () => {
    const page = read("backend", "app", "delete-account", "page.tsx");
    assert.doesNotMatch(page, /Nothing about you stays in our database/);
    for (const k of [/37 days/, /30 days/, /Sentry/, /support address/, /Billing records/, /RETENTION\.aiCallsMonths/]) assert.match(page, k);
  });
  test("the data inventory lists every table and what survives deletion", () => {
    const inv = read("docs", "legal", "data-inventory.md");
    assert.match(inv, /Kept after deletion/);
    for (const t of ["item_flags", "ai_calls", "billing_events", "content_review_queue", "auth_events", "app_users"]) assert.match(inv, new RegExp("`" + t + "`"), t);
    assert.match(inv, /ERROR_TRACKER_DSN/);
  });
});

describe("AI_PROVIDER=local in production (FAIL-912)", () => {
  test("refused in production, however it is written", () => {
    for (const v of ["local", "LOCAL", " Local "]) {
      assert.equal(localProviderInProduction({ NODE_ENV: "production", AI_PROVIDER: v }), true, v);
      assert.throws(() => assertSafeProductionConfig({ NODE_ENV: "production", AI_PROVIDER: v }), /AI_PROVIDER=local/);
    }
  });
  test("fine for development, tests, anthropic and unset", () => {
    assert.equal(localProviderInProduction({ NODE_ENV: "development", AI_PROVIDER: "local" }), false);
    assert.equal(localProviderInProduction({ NODE_ENV: "test", AI_PROVIDER: "local" }), false);
    assert.doesNotThrow(() => assertSafeProductionConfig({ NODE_ENV: "production", AI_PROVIDER: "anthropic" }));
    assert.doesNotThrow(() => assertSafeProductionConfig({ NODE_ENV: "production" }));
  });
  test("instrumentation runs the combined check", () => {
    assert.match(read("backend", "instrumentation.ts"), /assertSafeProductionConfig\(\)/);
  });
});

describe("16 or older (FAIL-906)", () => {
  test("only the boolean true counts", () => {
    assert.equal(MINIMUM_AGE, 16);
    assert.equal(isAgeConfirmed({ ageConfirmed: true }), true);
    for (const v of [false, "true", 1, null, undefined, "yes", {}]) assert.equal(isAgeConfirmed({ ageConfirmed: v }), false, String(v));
    assert.equal(isAgeConfirmed(null), false);
    assert.equal(isAgeConfirmed({}), false);
  });
  test("the app's code matches the server's", () => {
    assert.match(read("mobile", "src", "lib", "ageConfirmation.ts"), new RegExp(`AGE_CONFIRMATION_CODE = "${AGE_CONFIRMATION_REQUIRED}"`));
  });
});

describe("export scoping (FAIL-904)", () => {
  test("sign-in events by address only since the account was created, and the avatar is exported", () => {
    assert.match(EXPORT_SECTIONS.signInEvents, /user_id is null/);
    assert.match(EXPORT_SECTIONS.signInEvents, /created_at >= \(select created_at from app_users where id = \$1\)/);
    assert.match(EXPORT_SECTIONS.profile, /avatar_data_url/);
    assert.match(EXPORT_SECTIONS.profile, /age_confirmed_at/);
  });
});

// --- the support inbox -------------------------------------------------------
const SECRET_BYTES = Buffer.from("0123456789abcdef0123456789abcdef");
const SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;
const BODY = JSON.stringify({ type: "email.received", data: { email_id: "56761188-7520-42d8-8898-ff6fc54ce618" } });
function sign(body: string, id = "msg_1", ts = Math.floor(Date.now() / 1000), key = SECRET_BYTES) {
  const sig = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sig}` };
}
const hdr = (h: Record<string, string>) => new Headers(h);

describe("Resend webhook signature (FAIL-910)", () => {
  test("a correctly signed recent body verifies", () => {
    assert.equal(verifyResendWebhook(BODY, hdr(sign(BODY)), SECRET), true);
  });
  test("a second signature in the list is enough (key rotation)", () => {
    const h = sign(BODY);
    assert.equal(verifyResendWebhook(BODY, hdr({ ...h, "svix-signature": `v1,AAAA ${h["svix-signature"]}` }), SECRET), true);
  });
  test("a changed body, wrong secret, missing header, stale or future timestamp, or odd version all fail", () => {
    const good: Record<string, string> = sign(BODY);
    assert.equal(verifyResendWebhook(BODY + " ", hdr(good), SECRET), false);
    assert.equal(verifyResendWebhook(BODY, hdr(good), `whsec_${Buffer.from("another secret entirely!!!!!!!!!!").toString("base64")}`), false);
    for (const k of Object.keys(good)) {
      const { [k]: _gone, ...rest } = good;
      assert.equal(verifyResendWebhook(BODY, hdr(rest), SECRET), false, k);
    }
    const now = Math.floor(Date.now() / 1000);
    assert.equal(verifyResendWebhook(BODY, hdr(sign(BODY, "m", now - 3600)), SECRET), false);
    assert.equal(verifyResendWebhook(BODY, hdr(sign(BODY, "m", now + 3600)), SECRET), false);
    assert.equal(verifyResendWebhook(BODY, hdr({ ...good, "svix-signature": good["svix-signature"].replace("v1,", "v2,") }), SECRET), false);
    assert.equal(verifyResendWebhook(BODY, hdr({ ...good, "svix-timestamp": "12abc" }), SECRET), false);
  });
  test("no secret means nothing verifies (fails closed)", () => {
    assert.equal(verifyResendWebhook(BODY, hdr(sign(BODY)), undefined), false);
    assert.equal(verifyResendWebhook(BODY, hdr(sign(BODY)), ""), false);
    assert.equal(verifyResendWebhook(BODY, hdr(sign(BODY, "m", undefined, Buffer.alloc(0))), "whsec_"), false);
  });
});

describe("inbound configuration fails closed (FAIL-910)", () => {
  const env = { RESEND_API_KEY: "re_test", SUPPORT_FORWARD_TO: "owner@example.test", EMAIL_FROM: "Ascendra <no-reply@ascendra-learn.com>" };
  test("needs the API key and a plain forward address", () => {
    assert.deepEqual(inboundConfig(env), { apiKey: "re_test", forwardTo: "owner@example.test", from: "Ascendra <no-reply@ascendra-learn.com>" });
    assert.equal(inboundConfig({ ...env, RESEND_API_KEY: "" }), null);
    assert.equal(inboundConfig({ ...env, SUPPORT_FORWARD_TO: undefined }), null);
    assert.equal(inboundConfig({ ...env, SUPPORT_FORWARD_TO: "Owner <owner@example.test>" }), null);
  });
  test("refuses to forward to its own domain, which would loop", () => {
    assert.equal(inboundConfig({ ...env, SUPPORT_FORWARD_TO: "me@ascendra-learn.com" }), null);
    assert.equal(inboundConfig({ ...env, SUPPORT_EMAIL: "help@example.test", SUPPORT_FORWARD_TO: "me@EXAMPLE.test" }), null);
  });
  test("the route answers 503 without a signing secret, API key or forward address, and sends nothing", async () => {
    const saved = { ...process.env };
    let called = false;
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}");
    }) as typeof fetch;
    try {
      const mk = () => new Request("http://t/api/inbound/email", { method: "POST", headers: sign(BODY), body: BODY });
      delete process.env.RESEND_WEBHOOK_SECRET;
      process.env.RESEND_API_KEY = "re_test";
      process.env.SUPPORT_FORWARD_TO = "owner@example.test";
      assert.equal((await inboundPost(mk())).status, 503, "no secret");
      process.env.RESEND_WEBHOOK_SECRET = SECRET;
      delete process.env.SUPPORT_FORWARD_TO;
      assert.equal((await inboundPost(mk())).status, 503, "no forward address");
      process.env.SUPPORT_FORWARD_TO = "owner@example.test";
      delete process.env.RESEND_API_KEY;
      assert.equal((await inboundPost(mk())).status, 503, "no API key");
      process.env.RESEND_API_KEY = "re_test";
      assert.equal(called, false);
      // configured: a bad signature is 401 and still sends nothing
      const bad = new Request("http://t/api/inbound/email", { method: "POST", headers: { ...sign(BODY), "svix-id": "other" }, body: BODY });
      assert.equal((await inboundPost(bad)).status, 401);
      const unsigned = new Request("http://t/api/inbound/email", { method: "POST", body: BODY });
      assert.equal((await inboundPost(unsigned)).status, 401);
      const big = new Request("http://t/api/inbound/email", { method: "POST", headers: sign("x"), body: "x".repeat(70_000) });
      assert.equal((await inboundPost(big)).status, 413);
      assert.equal(called, false);
    } finally {
      globalThis.fetch = realFetch;
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
      Object.assign(process.env, saved);
    }
  });
});

describe("what is forwarded (FAIL-910)", () => {
  const cfg = { apiKey: "re_test", forwardTo: "owner@example.test", from: "no-reply@ascendra-learn.com" };
  test("only email.received with a real id is acted on", () => {
    assert.deepEqual(receivedEvent(BODY), { emailId: "56761188-7520-42d8-8898-ff6fc54ce618" });
    assert.equal(receivedEvent(JSON.stringify({ type: "email.sent", data: { email_id: "56761188-7520-42d8-8898-ff6fc54ce618" } })), null);
    assert.equal(receivedEvent(JSON.stringify({ type: "email.received", data: { email_id: "../../x" } })), null);
    assert.equal(receivedEvent("not json"), null);
    assert.equal(receivedEvent("null"), null);
  });
  test("the forward is plain text with the sender as reply-to; HTML and attachments are not passed on", () => {
    const f = buildForward(
      {
        from: "Learner <learner@example.test>",
        to: ["support@ascendra-learn.com"],
        subject: "Help\r\nBcc: x@evil.test",
        html: "<p>Hello <img src='https://track.example/p.gif'> there</p><script>x()</script>",
        text: null,
        authentication: { spf: "pass", dkim: "pass", dmarc: "gray" },
        attachments: [{ filename: "a.pdf" }],
      },
      cfg
    );
    assert.deepEqual(f.to, ["owner@example.test"]);
    assert.deepEqual(f.reply_to, ["learner@example.test"]);
    assert.equal(f.subject, "[Support] Help Bcc: x@evil.test");
    assert.doesNotMatch(f.subject, /[\r\n]/);
    assert.equal("html" in f, false);
    const message = f.text.split("\n\n").slice(1).join("\n\n");
    assert.match(message, /Hello  there/);
    assert.doesNotMatch(message, /track\.example|<|script/);
    assert.match(f.text, /SPF pass, DKIM pass, DMARC gray/);
    assert.match(f.text, /Attachments not forwarded \(1\): a\.pdf/);
    assert.equal(f.headers[FORWARD_MARKER_HEADER], "1");
  });
  test("a sender address that is not one gives no reply-to", () => {
    assert.equal(senderAddress("Name <a@b.test>"), "a@b.test");
    assert.equal(senderAddress("a@b.test"), "a@b.test");
    assert.equal(senderAddress("<script>"), null);
    assert.equal(senderAddress(undefined), null);
    assert.equal(htmlToText("<b>a</b>&amp;b"), "a&b");
  });
  test("fetches the message through Resend's API with the key, then sends one email", async () => {
    const calls: { url: string; method: string; auth: string; body?: string }[] = [];
    const out = await forwardReceivedEmail("56761188-7520-42d8-8898-ff6fc54ce618", cfg, async (url, init) => {
      calls.push({ url, method: init.method, auth: init.headers.Authorization, body: init.body });
      return init.method === "GET"
        ? { ok: true, status: 200, json: async () => ({ from: "a@b.test", to: ["support@ascendra-learn.com"], subject: "Hi", text: "Hello", headers: {} }) }
        : { ok: true, status: 200, json: async () => ({}) };
    });
    assert.deepEqual(out, { ok: true });
    assert.equal(calls[0].url, "https://api.resend.com/emails/receiving/56761188-7520-42d8-8898-ff6fc54ce618");
    assert.equal(calls[1].url, "https://api.resend.com/emails");
    assert.equal(calls[1].method, "POST");
    assert.ok(calls.every((c) => c.auth === "Bearer re_test"));
    assert.match(calls[1].body!, /"to":\["owner@example.test"\]/);
  });
  test("a failed fetch or send is reported with its stage and status, never the body", async () => {
    const f1 = await forwardReceivedEmail("56761188-7520-42d8-8898-ff6fc54ce618", cfg, async () => ({ ok: false, status: 401, json: async () => ({}) }));
    assert.deepEqual(f1, { ok: false, stage: "fetch", status: 401 });
    const f2 = await forwardReceivedEmail("56761188-7520-42d8-8898-ff6fc54ce618", cfg, async (_u, i) =>
      i.method === "GET" ? { ok: true, status: 200, json: async () => ({ text: "x", headers: {} }) } : { ok: false, status: 403, json: async () => ({}) }
    );
    assert.deepEqual(f2, { ok: false, stage: "send", status: 403 });
    const f3 = await forwardReceivedEmail("56761188-7520-42d8-8898-ff6fc54ce618", cfg, async () => {
      throw new Error("boom");
    });
    assert.deepEqual(f3, { ok: false, stage: "fetch", status: null });
  });
  test("a message that is already one of our forwards is dropped, not sent again", async () => {
    let sends = 0;
    const out = await forwardReceivedEmail("56761188-7520-42d8-8898-ff6fc54ce618", cfg, async (_u, i) => {
      if (i.method === "POST") sends++;
      return { ok: true, status: 200, json: async () => ({ text: "x", headers: { "x-ascendra-forwarded": "1" } }) };
    });
    assert.deepEqual(out, { ok: false, stage: "loop", status: null });
    assert.equal(sends, 0);
  });
  test("the route never logs a message body, subject or address", () => {
    const src = read("backend", "app", "api", "inbound", "email", "route.ts") + read("backend", "lib", "inbound-email.ts");
    const logs = src.split("\n").filter((l) => /console\.(log|error|warn)/.test(l));
    for (const l of logs) assert.doesNotMatch(l, /\b(raw|text|html|subject|email\.|body)\b/, l);
  });
});
