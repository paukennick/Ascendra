// REQ-201: the gated AI UI's pure parts -- what /api/auth/me's `ai` means,
// reading a refused AI request, and the words shown (no plan or price).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  COACH_PREVIEW_BODY,
  COACH_PREVIEW_TITLE,
  REGENERATE_PREVIEW_NOTE,
  aiAccessMessage,
  aiAccessSignal,
  aiAccessSignalOf,
  hasFullAi,
  parseAiAccess,
} from "./aiAccess.ts";
import { regenerateErrorMessage, REGENERATE_FAILED } from "./regenerateError.ts";
import { gradeSubmitError } from "./lessonFeedback.ts";
import { billingSignal } from "./billing.ts";
import { aiModeLine, bulkFormProblem, bulkResultLine, emailList, grantAiLine, parseAiMode } from "./access.ts";

describe("user.ai", () => {
  test("missing (default mode, older server) or malformed = full AI", () => {
    assert.equal(hasFullAi(null), true);
    assert.equal(hasFullAi({}), true);
    assert.equal(hasFullAi({ ai: null }), true);
    assert.equal(hasFullAi({ ai: { mode: "weird", full: false } }), true);
    assert.equal(parseAiAccess("granted"), null);
  });
  test("granted or paid mode says whether this learner has full AI", () => {
    assert.equal(hasFullAi({ ai: { mode: "granted", full: true } }), true);
    assert.equal(hasFullAi({ ai: { mode: "granted", full: false } }), false);
    assert.equal(hasFullAi({ ai: { mode: "paid", full: false } }), false);
    assert.deepEqual(parseAiAccess({ mode: "granted", full: false }), { mode: "granted", full: false });
  });
});

const err = (status: number, data: unknown) => Object.assign(new Error(String((data as any)?.error ?? "x")), { status, data });

describe("refused AI requests", () => {
  const preview = { error: "The AI coach is in limited preview, open to invited pilot learners for now.", aiAccess: { state: "limited_preview", feature: "coach", mode: "granted", resetsAt: null } };
  const graded = { error: "AI grading for typed answers is in limited preview: 3 a day for now.", aiAccess: { state: "graded_limit", feature: "written_grading", mode: "granted", resetsAt: "2026-11-10T03:00:00.000Z", limit: 3, used: 3 } };
  const paused = { error: "The AI coach and new lesson versions are paused for today.", aiAccess: { state: "paused", feature: "regenerate", mode: "all", resetsAt: "2026-11-10T00:00:00.000Z" } };
  const preparing = { error: "This lesson is being prepared. Please try again later.", aiAccess: { state: "preparing", feature: "shared_lesson", mode: "all", resetsAt: null } };

  test("each state is read from a 403 or 429 body", () => {
    assert.equal(aiAccessSignal(403, preview)?.state, "limited_preview");
    assert.equal(aiAccessSignal(429, graded)?.limit, 3);
    assert.equal(aiAccessSignal(429, paused)?.resetsAt, "2026-11-10T00:00:00.000Z");
    assert.equal(aiAccessSignalOf(err(429, preparing))?.state, "preparing");
  });
  test("other refusals are not AI-access signals", () => {
    assert.equal(aiAccessSignal(500, preview), null);
    assert.equal(aiAccessSignal(429, { error: "slow down" }), null);
    assert.equal(aiAccessSignal(403, { aiAccess: { state: "nope" } }), null);
    assert.equal(aiAccessSignalOf("boom"), null);
  });
  test("they never open the plans sheet: no upgrade, allowance or aiPaused keys", () => {
    for (const [s, d] of [[403, preview], [429, graded], [429, paused], [429, preparing]] as const) assert.equal(billingSignal(s, d), null);
  });
  test("the server's words are shown; a calm fallback when it sent none", () => {
    assert.equal(aiAccessMessage(aiAccessSignal(403, preview)!), preview.error);
    for (const state of ["limited_preview", "graded_limit", "paused", "preparing"]) {
      const m = aiAccessMessage(aiAccessSignal(429, { aiAccess: { state, feature: "coach" } })!);
      assert.ok(m.length > 10, state);
    }
  });
  test("regenerate shows the limited-preview and paused words, not 'check your connection'", () => {
    assert.equal(regenerateErrorMessage(err(403, { ...preview, aiAccess: { ...preview.aiAccess, feature: "regenerate" } })), preview.error);
    assert.equal(regenerateErrorMessage(err(429, paused)), paused.error);
    assert.equal(regenerateErrorMessage(err(403, { error: "Accept the disclaimer first" })), "Accept the disclaimer first");
  });
  test("a typed answer over the daily limit shows the server's limit message", () => {
    assert.equal(gradeSubmitError(err(429, graded)), graded.error);
  });
});

describe("words", () => {
  test("no plan names, prices or upgrade words while billing is off", () => {
    for (const m of [COACH_PREVIEW_TITLE, COACH_PREVIEW_BODY, REGENERATE_PREVIEW_NOTE]) {
      assert.doesNotMatch(m, /\bPlus\b|\bPro\b|upgrade|\$|price|\bplans?\b|subscri/i, m);
    }
    assert.match(COACH_PREVIEW_TITLE, /limited preview/);
    assert.match(REGENERATE_PREVIEW_NOTE, /limited preview/);
  });
});

describe("Access screen: inviting an AI pilot group", () => {
  test("pasted addresses split on commas, semicolons, spaces and new lines; duplicates dropped", () => {
    assert.deepEqual(emailList(" a@x.io, b@x.io;\nA@X.io  c@x.io\n\n"), ["a@x.io", "b@x.io", "c@x.io"]);
    assert.deepEqual(emailList(""), []);
  });
  test("the form check names bad addresses and the limit", () => {
    assert.equal(bulkFormProblem("a@x.io\nb@x.io", null, "AI pilot", "2026-11-09"), null);
    assert.match(bulkFormProblem("a@x.io\nnope", null, "", "2026-11-09")!, /Not an email address: nope/);
    assert.match(bulkFormProblem(Array.from({ length: 51 }, (_, i) => `p${i}@x.io`).join("\n"), null, "", "2026-11-09")!, /Up to 50/);
    assert.match(bulkFormProblem("a@x.io\nb@x.io", "2026-01-01", "", "2026-11-09")!, /end date/);
  });
  test("who has full AI, per grant and for the mode", () => {
    assert.equal(grantAiLine({ status: "active" }), "Full AI access");
    assert.match(grantAiLine({ status: "waiting" }), /once they sign up/);
    assert.match(grantAiLine({ status: "ended" }), /No AI/);
    assert.equal(parseAiMode("granted"), "granted");
    assert.equal(parseAiMode(undefined), "all");
    assert.equal(parseAiMode("nonsense"), "all");
    assert.match(aiModeLine("granted"), /AI pilot is on/);
    for (const m of ["all", "granted", "paid"] as const) assert.doesNotMatch(aiModeLine(m), /\$|price|upgrade/i);
  });
  test("the bulk result line", () => {
    assert.equal(bulkResultLine([{ email: "a@x.io", outcome: "granted" }, { email: "b@x.io", outcome: "granted" }]), "Access given to 2 addresses.");
    assert.equal(bulkResultLine([{ email: "a@x.io", outcome: "granted" }, { email: "o@x.io", outcome: "owner" }]), "Access given to 1 address. 1 already is an owner.");
  });
});
