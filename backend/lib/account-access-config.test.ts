// REQ-144: the pure rules of unrestricted access.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_OWNER_MONTHLY_CAP_USD,
  DEFAULT_UNRESTRICTED_CEILING_USD,
  grantIsLive,
  isOwnerEmail,
  ownerEmails,
  ownerMonthlyCapUsd,
  parseAccessArgs,
  parseGrantInput,
  parseUntil,
  resolveLevel,
  switchOnForEveryone,
  unrestrictedCeilingUsd,
} from "./account-access-config";
import { FEATURES, TIERS, featuresFor, type Feature } from "./billing-config";
import { servedReviewStatuses } from "./labs";

const NOW = new Date("2026-11-07T12:00:00Z");
const env = { OWNER_EMAILS: " PaukenNick2@Gmail.com , second@example.com,not-an-email ," };

describe("owners", () => {
  test("OWNER_EMAILS is comma-separated, trimmed, any case; junk entries are dropped", () => {
    assert.deepEqual([...ownerEmails(env)].sort(), ["paukennick2@gmail.com", "second@example.com"]);
    assert.equal(ownerEmails({}).size, 0);
    assert.equal(ownerEmails({ OWNER_EMAILS: "" }).size, 0);
  });

  test("an owner's address counts only when it is verified", () => {
    assert.equal(isOwnerEmail("paukennick2@gmail.com", true, env), true);
    assert.equal(isOwnerEmail("PAUKENNICK2@GMAIL.COM", true, env), true);
    assert.equal(isOwnerEmail("paukennick2@gmail.com", false, env), false, "anyone can type an address into sign-up");
    assert.equal(isOwnerEmail("paukennick2@gmail.co", true, env), false);
    assert.equal(isOwnerEmail("paukennick2@gmail.com", true, {}), false, "no OWNER_EMAILS, no owner");
    assert.equal(isOwnerEmail(null, true, env), false);
  });
});

describe("resolving a level", () => {
  const live = { id: "g", expiresAt: null, revokedAt: null };
  test("owner beats a grant; a live grant is unrestricted; nothing is null", () => {
    assert.equal(resolveLevel({ email: "second@example.com", verified: true }, live, env, NOW), "owner");
    assert.equal(resolveLevel({ email: "x@example.com", verified: true }, live, env, NOW), "unrestricted");
    assert.equal(resolveLevel({ email: "x@example.com", verified: true }, null, env, NOW), null);
    assert.equal(resolveLevel(null, live, env, NOW), null);
    // An unverified owner address with no grant is an ordinary learner.
    assert.equal(resolveLevel({ email: "second@example.com", verified: false }, null, env, NOW), null);
  });

  test("a grant applies until its end and never after a revoke", () => {
    assert.equal(grantIsLive({ id: "g", expiresAt: new Date("2026-11-08T00:00:00Z"), revokedAt: null }, NOW), true);
    assert.equal(grantIsLive({ id: "g", expiresAt: new Date("2026-11-07T12:00:00Z"), revokedAt: null }, NOW), false, "ends at its end");
    assert.equal(grantIsLive({ id: "g", expiresAt: null, revokedAt: new Date("2026-11-01") }, NOW), false);
    assert.equal(grantIsLive(null, NOW), false);
  });
});

describe("the AI safety ceiling", () => {
  test("$20 by default; overridable; never off", () => {
    assert.equal(DEFAULT_UNRESTRICTED_CEILING_USD, 20);
    assert.equal(unrestrictedCeilingUsd({}), 20);
    assert.equal(unrestrictedCeilingUsd({ AI_UNRESTRICTED_DAILY_CEILING_USD: "5.5" }), 5.5);
    for (const v of ["off", "0", "-3", "lots", ""]) assert.equal(unrestrictedCeilingUsd({ AI_UNRESTRICTED_DAILY_CEILING_USD: v }), 20, v);
  });
});

describe("the owner's monthly AI safety cap", () => {
  test("$35 by default (Nick, 2026-11-09); overridable; never off", () => {
    assert.equal(DEFAULT_OWNER_MONTHLY_CAP_USD, 35);
    assert.equal(ownerMonthlyCapUsd({}), 35);
    assert.equal(ownerMonthlyCapUsd({ OWNER_MONTHLY_AI_CAP_USD: "50" }), 50);
    for (const v of ["off", "0", "-3", "lots", ""]) assert.equal(ownerMonthlyCapUsd({ OWNER_MONTHLY_AI_CAP_USD: v }), 35, v);
  });
});

describe("early access switches", () => {
  test("labs_unreviewed reads LABS_SERVE_UNREVIEWED exactly as lib/labs.ts does for everyone", () => {
    for (const v of [undefined, "", "on", "1", "true", "nope", "off", "OFF", "0", "false", "no"]) {
      const e = v === undefined ? {} : { LABS_SERVE_UNREVIEWED: v };
      assert.equal(switchOnForEveryone("labs_unreviewed", e), servedReviewStatuses(e).includes("needs_expert_review"), String(v));
    }
  });
});

describe("plans", () => {
  test("Pro, which unrestricted accounts are given, includes every feature (so a new top-tier feature can't slip past)", () => {
    assert.deepEqual(featuresFor("pro").sort(), (Object.keys(FEATURES) as Feature[]).sort());
    assert.equal(TIERS[TIERS.length - 1], "pro");
  });
});

describe("grant input", () => {
  test("email is required and normalized; until is a future date; note is optional and bounded", () => {
    assert.deepEqual(parseGrantInput({ email: "  Friend@Example.COM " }, NOW), { email: "friend@example.com", until: null, note: null });
    const g = parseGrantInput({ email: "a@b.co", until: "2027-06-30", note: " founding tester " }, NOW);
    assert.ok(typeof g !== "string");
    assert.equal(g.until!.toISOString(), "2027-06-30T23:59:59.999Z");
    assert.equal(g.note, "founding tester");
    assert.match(parseGrantInput({}, NOW) as string, /email/);
    assert.match(parseGrantInput({ email: "nope" }, NOW) as string, /email/);
    assert.match(parseGrantInput({ email: "a@b.co", until: "2026-11-01" }, NOW) as string, /future/);
    assert.match(parseGrantInput({ email: "a@b.co", until: "soon" }, NOW) as string, /date/);
    assert.match(parseGrantInput({ email: "a@b.co", note: 5 }, NOW) as string, /text/);
    assert.match(parseGrantInput({ email: "a@b.co", note: "x".repeat(501) }, NOW) as string, /500/);
    assert.equal(parseUntil(null, NOW), null);
  });

  test("CLI: grant, revoke, list, and refusals", () => {
    assert.deepEqual(parseAccessArgs(["--list"], NOW), { mode: "list" });
    assert.deepEqual(parseAccessArgs(["--email", "A@b.co", "--revoke"], NOW), { mode: "revoke", email: "a@b.co" });
    const g = parseAccessArgs(["--email", "a@b.co", "--until", "2027-01-31", "--note", "beta"], NOW);
    assert.equal(g.mode, "grant");
    assert.throws(() => parseAccessArgs([], NOW), /--email/);
    assert.throws(() => parseAccessArgs(["--list", "--email", "a@b.co"], NOW), /--list/);
    assert.throws(() => parseAccessArgs(["--email", "a@b.co", "--revoke", "--until", "2027-01-01"], NOW), /--revoke/);
    assert.throws(() => parseAccessArgs(["--email"], NOW), /needs a value/);
    assert.throws(() => parseAccessArgs(["--email", "a@b.co", "--tier", "pro"], NOW), /Unknown option/);
    assert.throws(() => parseAccessArgs(["--email", "a@b.co", "--until", "2020-01-01"], NOW), /future/);
  });
});
