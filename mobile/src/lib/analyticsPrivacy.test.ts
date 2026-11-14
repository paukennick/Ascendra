// REQ-261: what the web analytics may send (redaction) and when it may run
// (flag, Global Privacy Control, Do Not Track). src/lib/analyticsPrivacy.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  ID_PLACEHOLDER,
  flagOn,
  isSensitiveSegment,
  optedOut,
  redactAnalyticsUrl,
  redactEvent,
  redactPath,
  shouldLoadAnalytics,
} from "./analyticsPrivacy.ts";

const SITE = "https://www.ascendra-learn.com";
const U1 = "3f2b8c1e-9a4d-4e7b-8c55-1d2e3f4a5b6c";
const U2 = "A1B2C3D4-0000-4000-8000-ABCDEF012345"; // upper case
const TOKEN_B64URL = "kJ3x9Qw2Lm8Zp4Rt7Vb1Nc6Yh0Ge5Sd_aF-uIoXyKq";
const TOKEN_HEX = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";

describe("path segments that look like ids or tokens", () => {
  test("UUIDs (any case), numbers, long hex, base64-like strings, JWTs and email addresses are sensitive", () => {
    for (const s of [U1, U2, "42", "0", "1234567890123", TOKEN_HEX, "0x9f86d081884c7d65", TOKEN_B64URL, JWT, "someone@example.com", "someone%40example.com"]) {
      assert.equal(isSensitiveSegment(s), true, s);
    }
    // an id with the dashes removed is long hex
    assert.equal(isSensitiveSegment(U1.replaceAll("-", "")), true);
    // percent-encoded: judged by what it decodes to
    assert.equal(isSensitiveSegment(encodeURIComponent("a1B2 c3D4 e5F6 g7H8 i9J0 k1")), true);
  });

  test("screen names are kept", () => {
    for (const s of ["", "login", "register", "course", "lesson", "privacy", "forgot-password", "verify-email-pending", "review-coverage", "study-profile", "whats-new", "plan", "sims", "labs", "account"]) {
      assert.equal(isSensitiveSegment(s), false, s);
    }
  });

  test("a short hex-looking word or a slug is kept; the thresholds are explicit", () => {
    assert.equal(isSensitiveSegment("deface"), false);
    assert.equal(isSensitiveSegment("abcdef012345"), true); // 12 hex digits
    assert.equal(isSensitiveSegment("abcdef01234"), false); // 11
    assert.equal(isSensitiveSegment("security-plus-practice"), false); // long, but words
    assert.equal(isSensitiveSegment("security-plus-sy0-701-prep"), true); // long with a digit: errs toward redacting
  });

  test("every static screen name in the app's own routes survives redaction", () => {
    const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "app");
    const names = new Set<string>();
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (!/^\(.*\)$/.test(e.name) && !e.name.startsWith("[")) names.add(e.name);
          walk(join(dir, e.name));
        } else {
          const n = e.name.replace(/\.tsx?$/, "");
          if (!n.startsWith("_") && !n.startsWith("+") && !n.startsWith("[") && n !== "index") names.add(n);
        }
      }
    };
    walk(root);
    assert.ok(names.size > 30, "the walk found the routes");
    for (const n of names) assert.equal(isSensitiveSegment(n), false, `route segment "${n}" would be redacted`);
  });
});

describe("redacting a page address", () => {
  test("a lesson: both ids replaced, query and fragment gone", () => {
    assert.equal(
      redactAnalyticsUrl(`${SITE}/course/${U1}/lesson/${U2}?step=3&email=a@b.com#answer-2`),
      `${SITE}/course/:id/lesson/:id`,
    );
  });

  test("password reset and email links: the token in the query is dropped", () => {
    assert.equal(redactAnalyticsUrl(`${SITE}/reset-password?token=${TOKEN_B64URL}`), `${SITE}/reset-password`);
    assert.equal(redactAnalyticsUrl(`${SITE}/verify-email?token=${TOKEN_HEX}&result=ok`), `${SITE}/verify-email`);
    assert.equal(redactAnalyticsUrl(`${SITE}/confirm-email-change?token=${TOKEN_B64URL}`), `${SITE}/confirm-email-change`);
    assert.equal(redactAnalyticsUrl(`${SITE}/unsubscribe?u=${U1}&t=${TOKEN_HEX}`), `${SITE}/unsubscribe`);
  });

  test("a token in the path or in the fragment never survives", () => {
    assert.equal(redactAnalyticsUrl(`${SITE}/reset-password/${TOKEN_B64URL}`), `${SITE}/reset-password/:id`);
    assert.equal(redactAnalyticsUrl(`${SITE}/verify-email/${JWT}/`), `${SITE}/verify-email/:id/`);
    assert.equal(redactAnalyticsUrl(`${SITE}/login#access_token=${TOKEN_B64URL}&type=recovery`), `${SITE}/login`);
    assert.equal(redactAnalyticsUrl(`${SITE}/login#/course/${U1}`), `${SITE}/login`);
  });

  test("numeric ids and an email address in the path", () => {
    assert.equal(redactAnalyticsUrl(`${SITE}/orders/12345/items/6`), `${SITE}/orders/:id/items/:id`);
    assert.equal(redactAnalyticsUrl(`${SITE}/u/someone%40example.com/settings`), `${SITE}/u/:id/settings`);
  });

  test("screens with no id are unchanged, the root included", () => {
    for (const p of ["/", "/login", "/settings/mfa", "/course", "/privacy", "/whats-new"]) {
      assert.equal(redactAnalyticsUrl(`${SITE}${p}`), `${SITE}${p}`, p);
    }
    assert.equal(redactAnalyticsUrl(`${SITE}/?utm_source=x#y`), `${SITE}/`);
  });

  test("credentials in the address, a port and an odd host case do not leak or break it", () => {
    assert.equal(redactAnalyticsUrl(`https://user:secret@ascendra-learn.com/login?x=1`), "https://ascendra-learn.com/login");
    assert.equal(redactAnalyticsUrl(`http://localhost:8081/course/${U1}`), "http://localhost:8081/course/:id");
    assert.equal(redactAnalyticsUrl(`HTTPS://ASCENDRA-LEARN.COM/Login`), "https://ascendra-learn.com/Login");
  });

  test("dot segments and doubled slashes are resolved or kept, and the id inside is still found", () => {
    assert.equal(redactAnalyticsUrl(`${SITE}/a/../course/${U1}`), `${SITE}/course/:id`);
    assert.equal(redactAnalyticsUrl(`${SITE}//course//${U1}`), `${SITE}//course//:id`);
    assert.equal(redactAnalyticsUrl(`${SITE}/course/%33${U1.slice(1)}`), `${SITE}/course/:id`);
  });

  test("anything that is not an http(s) address is dropped, not sent as it was", () => {
    for (const bad of ["", "not a url", "/course/abc", "file:///etc/passwd", "javascript:alert(1)", "data:text/html,x", "capacitor://localhost/x", null, undefined, 42, {}]) {
      assert.equal(redactAnalyticsUrl(bad), null, String(bad));
    }
  });

  test("redactPath on its own", () => {
    assert.equal(redactPath(`/course/${U1}/lesson/${U2}`), "/course/:id/lesson/:id");
    assert.equal(ID_PLACEHOLDER, ":id");
  });
});

describe("the beforeSend both scripts share", () => {
  test("a page view keeps its type and gets the redacted address", () => {
    const out = redactEvent({ type: "pageview", url: `${SITE}/course/${U1}/lesson/${U2}?q=1#x` });
    assert.deepEqual(out, { type: "pageview", url: `${SITE}/course/:id/lesson/:id` });
  });

  test("a Speed Insights vital: the route is redacted too", () => {
    const out = redactEvent({ type: "vital", url: `${SITE}/course/${U1}?a=1`, route: `/course/${U1}?a=1#z` });
    assert.deepEqual(out, { type: "vital", url: `${SITE}/course/:id`, route: "/course/:id" });
  });

  test("no field is passed through unless it is named: an extra field is not forwarded", () => {
    const out = redactEvent({ type: "pageview", url: `${SITE}/login`, email: "a@b.com", userId: 7 } as never) as Record<string, unknown>;
    assert.deepEqual(Object.keys(out).sort(), ["type", "url"]);
  });

  test("an event with an unreadable address is dropped", () => {
    assert.equal(redactEvent({ type: "pageview", url: "nonsense" }), null);
    assert.equal(redactEvent(null as never), null);
    assert.equal(redactEvent({ type: "pageview" } as never), null);
  });

  test("the redacted address contains no query string, fragment, or id-like text, over many inputs", () => {
    const hosts = [SITE, "https://ascendra-learn.com", "http://localhost:3000"];
    const tails = [`/course/${U1}`, `/course/${U1}/lesson/${U2}`, `/reset-password?token=${TOKEN_HEX}`, `/x/${TOKEN_B64URL}#${TOKEN_HEX}`, `/n/99/m/100?z=${U1}`];
    for (const h of hosts) {
      for (const t of tails) {
        const out = redactAnalyticsUrl(h + t)!;
        assert.ok(out, h + t);
        assert.ok(!/[?#]/.test(out), out);
        assert.ok(!out.includes(U1) && !out.includes(U2) && !out.includes(TOKEN_HEX) && !out.includes(TOKEN_B64URL), out);
        assert.ok(!/\/\d+(\/|$)/.test(out), out);
      }
    }
  });
});

describe("when analytics may run", () => {
  test("Global Privacy Control true turns it off", () => {
    assert.equal(optedOut({ navigator: { globalPrivacyControl: true } }), true);
    assert.equal(shouldLoadAnalytics("on", { navigator: { globalPrivacyControl: true } }), false);
  });

  test("Do Not Track '1' turns it off, wherever the browser puts it", () => {
    assert.equal(optedOut({ navigator: { doNotTrack: "1" } }), true);
    assert.equal(optedOut({ navigator: { msDoNotTrack: "1" } }), true);
    assert.equal(optedOut({ window: { doNotTrack: "1" } }), true);
    assert.equal(optedOut({ navigator: { doNotTrack: "yes" } }), true);
    assert.equal(shouldLoadAnalytics("on", { navigator: { doNotTrack: "1" } }), false);
  });

  test("no signal, or an explicit 'allowed' answer, leaves it on", () => {
    for (const signals of [{}, { navigator: null }, { navigator: {} }, { navigator: { globalPrivacyControl: false, doNotTrack: "0" } }, { navigator: { doNotTrack: null }, window: {} }, { navigator: { doNotTrack: "unspecified" } }]) {
      assert.equal(optedOut(signals), false, JSON.stringify(signals));
      assert.equal(shouldLoadAnalytics("on", signals), true);
    }
    // only the real `true` counts for GPC, so a string does not switch it on by accident either way
    assert.equal(optedOut({ navigator: { globalPrivacyControl: "true" } }), false);
  });

  test("the build flag: only on, 1 or true; unset is off", () => {
    for (const v of ["on", "ON", " on ", "1", "true", "True"]) assert.equal(flagOn(v), true, v);
    for (const v of [undefined, null, "", "off", "0", "false", "yes", "2", 1, true]) assert.equal(flagOn(v), false, String(v));
    assert.equal(shouldLoadAnalytics(undefined, {}), false);
    assert.equal(shouldLoadAnalytics("off", {}), false);
  });
});
