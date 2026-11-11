// REQ-216 (batch G1): the generation gate, learner-facing errors and the
// small fixes that shipped with them. Pure parts; the stateful ones (holdback
// rows, the waiter that must not regenerate, the review session) are in
// lib/generation-gate.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { UserFacingError, serverError } from "./http";
import { listedClaimsOf, lowConfidenceOf, uncertaintyOf } from "./item-quality";
import { judgeFactCheck, verdictClaims, verdictHolds, verdictUnchecked, type CheckItem } from "./fact-check";
import {
  FactCheckUnavailableError,
  GATE_ATTEMPTS,
  HeldForAccuracyError,
  generateGated,
  heldMessage,
  steerText,
} from "./generation-gate";
import { distractorProblems, generateValid, InvalidContentError, quizItemHardProblems, quizItemLint, quizItemProblems, requestedCount } from "./content-validator";
import { RATE_LIMIT_MESSAGE, RateLimitError } from "./auth/rateLimit";
import { CLAIM_EXPIRY_SECONDS } from "./grading-claims";
import { isCalendarDate } from "./text-input";
import { releaseOnce } from "./ai-access";
import { CEILING_FRESH_FRACTION } from "./ai-access-config";

const ROOT = join(__dirname, "..");
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|dbtest)\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe("FAIL-1010: no UserFacingError is a 5xx (the app hides a 5xx's words)", () => {
  test("the default and a requested 5xx both become a 4xx", () => {
    assert.equal(new UserFacingError("x").status, 409);
    for (const bad of [500, 502, 503, 504, 200, 0, NaN]) {
      const e = new UserFacingError("words for the learner", bad);
      assert.ok(e.status >= 400 && e.status < 500, `${bad} -> ${e.status}`);
    }
    assert.equal(new UserFacingError("x", 429).status, 429);
    assert.equal(new UserFacingError("x", 402).status, 402);
  });

  test("serverError sends the words with a 4xx", async () => {
    const res = serverError(new UserFacingError("Please try again.", 503));
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { error: string }).error, "Please try again.");
  });

  test("no source file throws or subclasses UserFacingError with a 5xx status", () => {
    const offenders: string[] = [];
    for (const dir of ["lib", "app"]) {
      for (const f of walk(join(ROOT, dir))) {
        const src = readFileSync(f, "utf8");
        // new UserFacingError(<message>, 5xx ...)
        for (const m of src.matchAll(/new UserFacingError\([\s\S]*?,\s*(5\d\d)\b/g)) offenders.push(`${f}: ${m[0].slice(0, 60)}`);
        // class X extends UserFacingError { ... super(message, 5xx ...) }
        for (const c of src.matchAll(/class \w+ extends UserFacingError \{[\s\S]*?\n\}/g)) {
          for (const m of c[0].matchAll(/super\([^)]*?,\s*(5\d\d)\b/g)) offenders.push(`${f}: ${m[0].slice(0, 60)}`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });

  test("the AI-paused message is a 429", async () => {
    const { AiSpendUnavailableError } = await import("./ai-spend-ledger");
    assert.equal(new AiSpendUnavailableError().status, 429);
  });
});

describe("H2: only low confidence or a disagreeing check holds an item back", () => {
  test("listed claims alone no longer hold; low confidence does", () => {
    const listed = { confidence: "high", uncertainClaims: ["this scenario is invented", "may differ by version"] };
    assert.equal(lowConfidenceOf(listed), null);
    assert.deepEqual(listedClaimsOf(listed), ["this scenario is invented", "may differ by version"]);
    assert.deepEqual(lowConfidenceOf({ confidence: "low", uncertainClaims: ["a port"] }), ["a port"]);
    assert.deepEqual(lowConfidenceOf({ confidence: "low", uncertainClaims: [] }), ["(the writer rated its own confidence low)"]);
    assert.equal(lowConfidenceOf({ confidence: "medium", uncertainClaims: ["x"] }), null);
    assert.equal(lowConfidenceOf(null), null);
    // The record of what a writer doubted is unchanged.
    assert.deepEqual(uncertaintyOf(listed), ["this scenario is invented", "may differ by version"]);
  });

  const item: CheckItem = { key: "q1", objectiveTitle: "o", question: "q", format: "single", options: ["a", "b", "c", "d"], expected: [1] };
  test("verdicts: a disagreement holds; an agreement with listed claims, and a missing result, do not hold", () => {
    const [agree] = judgeFactCheck([item], { results: [{ key: "q1", answer: [1], unsupportedClaims: [] }] });
    const [listed] = judgeFactCheck([item], { results: [{ key: "q1", answer: [1], unsupportedClaims: ["a version"] }] });
    const [differs] = judgeFactCheck([item], { results: [{ key: "q1", answer: [2], unsupportedClaims: [] }] });
    const [missing] = judgeFactCheck([item], { results: [] });
    assert.deepEqual([agree, listed, differs, missing].map((v) => verdictHolds(v)), [false, false, true, false]);
    assert.deepEqual([agree, listed, differs, missing].map((v) => verdictUnchecked(v)), [false, false, false, true]);
    // `publish` keeps its strict meaning for the re-check of a flagged item.
    assert.deepEqual([agree, listed, differs, missing].map((v) => v.publish), [true, false, false, false]);
    assert.deepEqual(verdictClaims(differs), ["independent answer disagreed with the key"]);
  });

  test("generateGated: listed claims proceed with one writer call", async () => {
    let calls = 0;
    const made = await generateGated({
      kind: "pbq",
      unitId: null,
      model: "m",
      subject: "scenario",
      generate: async () => ({ n: ++calls, confidence: "high", uncertainClaims: ["this scenario is invented"] }),
      uncertainty: (g) => g,
    });
    assert.equal(made.n, 1);
    assert.equal(calls, 1);
  });

  test("generateGated: a fact-check CALL that fails is a retryable 409 with no retry of the writer", async () => {
    let calls = 0;
    await assert.rejects(
      generateGated({
        kind: "quiz",
        model: "m",
        subject: "quiz question",
        generate: async () => ({ n: ++calls, confidence: "high", uncertainClaims: [] }),
        uncertainty: (g) => g,
        check: async () => ({ verdict: undefined, error: "provider down" }),
      }),
      (e: unknown) => e instanceof FactCheckUnavailableError && e.status === 409 && (e.extra as { retryable?: boolean }).retryable === true && /try again/.test(e.message)
    );
    assert.equal(calls, 1);
  });

  test("the words a learner reads name the reason, and the retry steer carries the claims", () => {
    assert.match(heldMessage("question", ["uncertain"]), /wasn't confident/);
    assert.match(heldMessage("question", ["disagree"]), /different answer/);
    assert.match(heldMessage("question", ["uncertain", "disagree"]), /wasn't sure.*different answer/);
    const e = new HeldForAccuracyError("scenario", ["uncertain"]);
    assert.equal(e.status, 409);
    assert.equal((e.extra as { held?: boolean }).held, true);
    assert.match(steerText(["a port", "a limit"]), /- a port\n- a limit/);
    assert.equal(GATE_ATTEMPTS, 2);
  });

  test("a lab held for a content rule says so, alone or with the facts (FAIL-1026)", () => {
    assert.match(heldMessage("lab", ["invalid"]), /didn't meet our content rules/);
    assert.doesNotMatch(heldMessage("lab", ["invalid"]), /confident|second check/);
    assert.match(heldMessage("lab", ["disagree", "invalid"]), /different answer.* and it didn't meet our content rules/);
    assert.deepEqual(new HeldForAccuracyError("lab", ["invalid", "invalid", "disagree"]).reasons, ["invalid", "disagree"]);
  });
});

describe("M6 (FAIL-1012): the distractor lint no longer rejects correct questions", () => {
  const q = (question: string, choices: string[], correctIndex: number) => distractorProblems("Q", question, choices, correctIndex);

  test("a hyphenated compound is one word", () => {
    assert.deepEqual(q("Which access level lets a user view but not change a file?", ["Read-only access", "Full control", "Modify rights", "Ownership transfer"], 0), []);
  });

  test("'two-factor' and 'three-way handshake' are not a request for a count", () => {
    assert.equal(requestedCount("Which two-factor method uses a hardware token?"), null);
    assert.equal(requestedCount("Which three-way handshake step carries the SYN-ACK?"), null);
    assert.equal(requestedCount("Which two controls reduce phishing risk?"), 2);
    assert.deepEqual(q("Which two-factor method uses a hardware token?", ["A FIDO2 security key", "A password", "A security question", "An emailed link"], 0), []);
    assert.deepEqual(q("Which three-way handshake step carries SYN-ACK?", ["The second", "The first", "The third", "The fourth"], 0), []);
  });

  test("cue words are held against the distractors, not the right answer", () => {
    assert.deepEqual(q("Who can approve the change?", ["Only the CAB", "The requester", "Any engineer", "The vendor"], 0), []);
    assert.ok(q("Who can approve the change?", ["The change board", "Only the requester", "The vendor", "A contractor"], 0).some((p) => /absolute word "only"/.test(p)));
    assert.ok(q("Which is true?", ["It encrypts data", "It always blocks traffic", "It logs events", "It routes packets"], 0).some((p) => /absolute word "always"/.test(p)));
  });

  test("a second lint-only failure is logged and served; a hard problem still blocks", async () => {
    const logs: string[] = [];
    const lintOnly = { question: "Which is true?", choices: ["It encrypts data", "It always blocks traffic", "It logs events", "It routes packets"], correctIndex: 0, hints: ["h"], explanation: "e" };
    assert.deepEqual(quizItemHardProblems(lintOnly), []);
    assert.ok(quizItemLint(lintOnly).length > 0);
    let calls = 0;
    const out = await generateValid("quiz question", async () => (calls++, lintOnly), quizItemHardProblems, (m) => logs.push(m), quizItemLint);
    assert.equal(out, lintOnly);
    assert.equal(calls, 2, "the lint steers one retry");
    assert.ok(logs.some((l) => /served with style findings/.test(l)));
    const hard = { ...lintOnly, choices: ["a", "a", "b", "c"] };
    await assert.rejects(generateValid("quiz question", async () => hard, quizItemHardProblems, () => {}, quizItemLint), InvalidContentError);
    // The combined list still has both kinds, for the fix-up and the eval.
    assert.ok(quizItemProblems(lintOnly).length > 0);
  });
});

describe("lows", () => {
  test("FAIL-1018: a rate-limit message is one plain sentence with no internal name", () => {
    assert.doesNotMatch(RATE_LIMIT_MESSAGE, /_|attempts|lesson_regenerate/);
    assert.ok(new RateLimitError(RATE_LIMIT_MESSAGE) instanceof Error);
    const src = readFileSync(join(ROOT, "lib/auth/rateLimit.ts"), "utf8");
    assert.ok(!/Too many \$\{eventType\}/.test(src));
  });

  test("FAIL-1019: only real calendar dates pass", () => {
    for (const ok of ["2026-11-10", "2026-02-28", "2026-11-10T09:30:00Z", "2024-02-29"]) assert.ok(isCalendarDate(ok), ok);
    for (const bad of ["soon", "2026-02-31", "2026-13-01", "11/10/2026", "", 20261110, null, {}]) assert.ok(!isCalendarDate(bad), String(bad));
  });

  test("FAIL-1022: a grading claim outlives the longest grading route", () => {
    let longest = 0;
    for (const f of walk(join(ROOT, "app"))) {
      const src = readFileSync(f, "utf8");
      if (!/withGradingClaim|gradePbq|gradeUnitCheck/.test(src)) continue;
      const m = /export const maxDuration = (\d+)/.exec(src);
      if (m) longest = Math.max(longest, Number(m[1]));
    }
    assert.ok(longest >= 180, "the PBQ route is found");
    assert.ok(CLAIM_EXPIRY_SECONDS > longest, `${CLAIM_EXPIRY_SECONDS} must exceed ${longest}`);
  });

  test("FAIL-1020/1021: a counted use is given back once, however many paths release it", async () => {
    let n = 0;
    const use = releaseOnce({ release: async () => void n++ });
    await use.release();
    await use.release();
    assert.equal(n, 1);
  });

  test("FAIL-1021: lab and sim grading give the use back on a throw and on a replay", () => {
    const lab = readFileSync(join(ROOT, "lib/lab-routes.ts"), "utf8");
    const sims = readFileSync(join(ROOT, "lib/sims.ts"), "utf8");
    assert.match(lab, /releaseOnce\(await consumeGradedAnswer/);
    assert.match(lab, /recordStep\(input, graded\)\.catch\(async \(err\) => \{\s*await use\.release\(\)/);
    assert.match(lab, /if \(result\.replayed\) await use\.release\(\)/);
    assert.match(sims, /gradeSimReasoning\([\s\S]*?\)\.catch\(async \(err\) => \{\s*await use\.release\(\)/);
  });

  test("FAIL-1023: chat takes a claim on the message id before the model call", () => {
    const chat = readFileSync(join(ROOT, "app/api/chat/route.ts"), "utf8");
    assert.match(chat, /withGradingClaim<Response>\(userId, `chat:\$\{clientMessageId\}`/);
    assert.ok(chat.indexOf("withGradingClaim<Response>") < chat.indexOf("callClaude({") || chat.indexOf("respond = async") < chat.indexOf("callClaude({"));
  });

  test("FAIL-1024: near the ceiling every check reads fresh", () => {
    assert.ok(CEILING_FRESH_FRACTION > 0 && CEILING_FRESH_FRACTION < 1);
  });
});
