// REQ-197: the service emails' words, links and headers. Every template is
// rendered and run through the guilt and marketing checks; the copy check
// itself is tested to reject the phrases it exists for.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  copyProblems,
  countdownEmail,
  digestEmail,
  examChangeEmail,
  isoWeek,
  longDate,
  readUnsubscribeToken,
  readinessSentence,
  unsubscribeToken,
  weekLabel,
} from "./service-email-copy";
import { EXAM_CHANGES } from "./exam-changes";
import { digestRefusal, unsubscribeHeaders, unsubscribeUrls, validatePreferences } from "./service-emails";

const env = { AUTH_JWT_SECRET: "test-secret", APP_BASE_URL: "https://example.test" };
const U = "4f9a7c1e-2b3d-4e5f-8a9b-0c1d2e3f4a5b";
const footer = { unsubscribeUrl: "https://example.test/unsubscribe?token=x", postalAddress: "PO Box 0, Nowhere" };

describe("copy check", () => {
  for (const phrase of [
    "Don't lose your streak",
    "We miss you",
    "You're falling behind",
    "Last chance to study",
    "Only 3 days left",
    "You haven't studied this week",
    "Come back and practice",
    "Upgrade to Plus for the full score",
    "Save 20% off Pro",
    "Great job!",
  ]) {
    test(`rejects "${phrase}"`, () => assert.notDeepEqual(copyProblems(phrase), []));
  }
  test("accepts plain service wording", () => {
    assert.deepEqual(copyProblems("Your Security+ exam date is November 20, 2026, 11 days from today."), []);
    assert.deepEqual(copyProblems("AWS Solutions Architect - Professional"), []);
  });
});

describe("templates", () => {
  test("exam change: what, when, what the course did, source; once-only wording", () => {
    for (const change of EXAM_CHANGES) {
      const m = examChangeEmail({ change, courseTitle: "Some course", ...footer });
      for (const part of [m.subject, m.html, m.text]) assert.deepEqual(copyProblems(part), [], `${change.trackCode}: ${part.slice(0, 80)}`);
      assert.match(m.text, /What changes\n/);
      assert.match(m.text, new RegExp(`When\\n${longDate(change.date)}`));
      assert.match(m.text, /What the course did\n/);
      assert.ok(m.html.includes(change.sourceUrl));
      assert.ok(m.text.includes(footer.unsubscribeUrl));
    }
  });

  test("countdown: real readiness or a plain 'unconfirmed', and the weakest objectives", () => {
    const base = { courseTitle: "Prep for CompTIA Security+", shortName: "Security+", examDate: "2026-11-23", ...footer };
    const scored = countdownEmail({ ...base, daysLeft: 14, readiness: { percent: 58, ready: false }, weakest: ["Incident response", "PKI", "Zero Trust"] });
    assert.equal(scored.subject, "Security+ exam in 14 days");
    assert.match(scored.text, /Readiness: 58%, still building\./);
    assert.match(scored.text, /3 weakest objectives right now:\n1\. Incident response\n2\. PKI\n3\. Zero Trust/);
    const unconfirmed = countdownEmail({ ...base, daysLeft: 3, readiness: { percent: null, ready: false }, weakest: [] });
    assert.match(unconfirmed.text, /Readiness: unconfirmed\./);
    assert.doesNotMatch(unconfirmed.text, /\d+%/);
    assert.match(unconfirmed.text, /no weak spots to name/);
    const one = countdownEmail({ ...base, daysLeft: 1, readiness: { percent: 80, ready: true }, weakest: ["PKI"] });
    assert.equal(one.subject, "Security+ exam in 1 day");
    for (const m of [scored, unconfirmed, one]) for (const part of [m.subject, m.html, m.text]) assert.deepEqual(copyProblems(part), []);
  });

  test("digest: numbers per course, postal address in the footer, plain copy", () => {
    const m = digestEmail({
      weekLabel: weekLabel("2026-11-09"),
      courses: [
        { courseTitle: "Prep for CompTIA Security+", answered: 14, correct: 11, dueNextWeek: 6, readiness: { percent: null, ready: false } },
        { courseTitle: "AWS Solutions Architect Professional Coach", answered: 1, correct: 0, dueNextWeek: 0, readiness: { percent: 40, ready: false } },
      ],
      ...footer,
    });
    assert.match(m.text, /14 questions answered, 11 correct\./);
    assert.match(m.text, /1 question answered, 0 correct\./);
    assert.match(m.text, /6 objectives due for review in the next 7 days\./);
    assert.match(m.text, /Nothing due for review/);
    assert.ok(m.text.includes("PO Box 0, Nowhere") && m.html.includes("PO Box 0, Nowhere"));
    for (const part of [m.subject, m.html, m.text]) assert.deepEqual(copyProblems(part), []);
  });

  test("readiness sentence never invents a number", () => {
    assert.doesNotMatch(readinessSentence({ percent: null, ready: true }), /\d/);
  });

  test("HTML escapes course titles", () => {
    const m = examChangeEmail({ change: EXAM_CHANGES[0], courseTitle: "<b>x</b>", ...footer });
    assert.ok(!m.html.includes("<b>x</b>"));
  });

  test("weeks", () => {
    assert.equal(isoWeek("2026-11-09"), "2026-W46");
    assert.equal(isoWeek("2026-11-15"), "2026-W46");
    assert.equal(isoWeek("2027-01-01"), "2026-W53");
    assert.equal(weekLabel("2026-11-09"), "Nov 2 to Nov 8");
  });
});

describe("unsubscribe links", () => {
  test("round trip, one kind per token", () => {
    const t = unsubscribeToken(U, "weekly_digest", env);
    assert.deepEqual(readUnsubscribeToken(t, env), { userId: U, kind: "weekly_digest" });
    assert.deepEqual(readUnsubscribeToken(unsubscribeToken(U, "exam_change", env), env), { userId: U, kind: "exam_change" });
  });

  test("tampered, foreign-secret or malformed tokens are refused", () => {
    const t = unsubscribeToken(U, "exam_countdown", env);
    assert.equal(readUnsubscribeToken(t.replace(".d.", ".w."), env), null, "kind swapped");
    assert.equal(readUnsubscribeToken(t.replace(U, "00000000-0000-4000-8000-000000000000"), env), null, "user swapped");
    assert.equal(readUnsubscribeToken(t, { AUTH_JWT_SECRET: "other" }), null);
    for (const bad of [undefined, "", "x", `${t}x`, 42]) assert.equal(readUnsubscribeToken(bad, env), null);
  });

  test("page link and RFC 8058 one-click headers", () => {
    const urls = unsubscribeUrls(U, "weekly_digest", env);
    assert.match(urls.page, /^https:\/\/example\.test\/unsubscribe\?token=/);
    assert.match(urls.oneClick, /^https:\/\/example\.test\/api\/email\/unsubscribe\?token=/);
    assert.deepEqual(unsubscribeHeaders(urls.oneClick), {
      "List-Unsubscribe": `<${urls.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("digest refuses without its settings", () => {
  test("postal address and sender are both required", () => {
    assert.match(digestRefusal({})!, /MAIL_POSTAL_ADDRESS and DIGEST_EMAIL_FROM/);
    assert.match(digestRefusal({ MAIL_POSTAL_ADDRESS: "x" })!, /DIGEST_EMAIL_FROM/);
    assert.match(digestRefusal({ DIGEST_EMAIL_FROM: "x", MAIL_POSTAL_ADDRESS: "  " })!, /MAIL_POSTAL_ADDRESS/);
    assert.equal(digestRefusal({ DIGEST_EMAIL_FROM: "d@x", MAIL_POSTAL_ADDRESS: "a" }), null);
  });
});

describe("preference input", () => {
  test("booleans only", () => {
    assert.deepEqual(validatePreferences({ weeklyDigest: true }), { ok: true, value: { weeklyDigest: true } });
    assert.equal(validatePreferences({ weeklyDigest: "yes" }).ok, false);
    assert.equal(validatePreferences({}).ok, false);
    assert.equal(validatePreferences(null).ok, false);
  });
});
