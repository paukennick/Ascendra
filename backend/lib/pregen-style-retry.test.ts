// REQ-248 (FAIL-1600..1602): pre-generation treats the distractor lint as the
// app does -- a style finding that steers one retry, never a failure on its
// own -- and the cue-word lint leaves proper names alone. No database, no
// model: the retry writer is a fake.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { styleRetry, StyleRetryNotAffordable, type RetryWriter } from "./pregen";
import { distractorProblems, fixFor, lessonPracticeHardProblems, lessonPracticeLint } from "./content-validator";
import { parseArgs } from "../scripts/pregenerate-lib";
import type { LessonPracticeContent } from "./prompts";
import type { ObjectiveRow } from "./lesson-generation";

const CORRECT = "Use TCP port 443";
const reasons = () => ["Port 80 is plain HTTP.", "Port 443 is HTTPS.", "Port 8080 is an alternate HTTP port.", "Port 22 is SSH."];
function practice(over: Partial<LessonPracticeContent> = {}): LessonPracticeContent {
  const choices = ["Use TCP port 80", CORRECT, "Use TCP port 8080", "Use TCP port 22"];
  return {
    fadeProblem: "A team is configuring a firewall. Which port must be opened so browsers can reach the secure site?",
    fadeChoices: choices,
    fadeCorrectIndex: 1,
    fadeWhy: "Secure web traffic uses port 443.",
    soloCheck: "Another team must allow secure browsing to its server. Which port does that need?",
    soloChoices: [...choices],
    soloCorrectIndex: 1,
    soloWhy: "Secure web traffic uses port 443.",
    fadeOptionReasons: reasons(),
    soloOptionReasons: reasons(),
    soloVerification: null,
    confidence: "high",
    uncertainClaims: [],
    ...over,
  } as LessonPracticeContent;
}
// Style findings only: a distractor with a cue word.
const lintOnly = () => practice({ soloChoices: ["Always use TCP port 80", CORRECT, "Use TCP port 8080", "Use TCP port 22"] });
// A hard problem: duplicate options.
const hard = () => practice({ fadeChoices: ["Use TCP port 80", CORRECT, "Use TCP port 80", "Use TCP port 22"] });

const obj = { title: "Objective", unit_title: "Unit", track_title: "Track", ctx: null } as unknown as ObjectiveRow;

function writer(next: () => LessonPracticeContent) {
  const calls: (string | null)[] = [];
  const w: RetryWriter = {
    async intro() {
      throw new Error("not used");
    },
    async practice(_o, _t, steer) {
      calls.push(steer);
      return next();
    },
  };
  return { w, calls };
}

describe("fixtures", () => {
  test("lintOnly has style findings and no hard problem; hard has a hard problem", () => {
    assert.deepEqual(lessonPracticeHardProblems(lintOnly()), []);
    assert.ok(lessonPracticeLint(lintOnly()).length > 0);
    assert.ok(lessonPracticeHardProblems(hard()).length > 0);
    assert.deepEqual(lessonPracticeLint(practice()), []);
  });
});

describe("REQ-248 (FAIL-1600): the style retry, as the app makes it", () => {
  test("no style findings: no retry, the draft as it is", async () => {
    const { w, calls } = writer(() => practice());
    const d = practice();
    const out = await styleRetry(d, { writer: w, obj, teach: "t", allow: () => true, log: () => {} });
    assert.equal(out.practice, d);
    assert.equal(out.retried, false);
    assert.equal(calls.length, 0);
  });

  test("style findings only, then a clean retry: retried once, steered with the findings, the retry is used", async () => {
    const { w, calls } = writer(() => practice());
    const logs: string[] = [];
    let counted = 0;
    const out = await styleRetry(lintOnly(), { writer: w, obj, teach: "t", allow: () => true, log: (m) => logs.push(m), onRetry: () => counted++ });
    assert.equal(out.retried, true);
    assert.equal(out.servedWithFindings, false);
    assert.equal(counted, 1);
    assert.equal(calls.length, 1);
    assert.equal(calls[0], fixFor(lessonPracticeLint(lintOnly())), "the steer is the app's fixFor of the findings");
    assert.deepEqual(lessonPracticeLint(out.practice), []);
    assert.equal(logs.length, 0);
  });

  test("style findings only, then a retry with style findings only: used (the app serves it), logged as kinds", async () => {
    const { w, calls } = writer(() => lintOnly());
    const logs: string[] = [];
    const out = await styleRetry(lintOnly(), { writer: w, obj, teach: "t", allow: () => true, log: (m) => logs.push(m) });
    assert.equal(out.retried, true);
    assert.equal(out.servedWithFindings, true);
    assert.equal(calls.length, 1, "one retry, never two");
    assert.equal(logs.length, 1);
    assert.match(logs[0], /^\[content-validator\] lesson served with style findings after one retry: /);
    assert.ok(!logs[0].includes("Always use TCP"), "no option text in the log");
    assert.ok(!/"always"/.test(logs[0]), "the cue word is quoted out (problemKind)");
  });

  test("style findings only, then a retry with a hard problem: a failure (the lesson stays missing)", async () => {
    const { w } = writer(() => hard());
    await assert.rejects(styleRetry(lintOnly(), { writer: w, obj, teach: "t", allow: () => true, log: () => {} }), /retry content check/);
  });

  test("the cap cannot cover the retry: not retried, StyleRetryNotAffordable, no call", async () => {
    const { w, calls } = writer(() => practice());
    let counted = 0;
    await assert.rejects(
      styleRetry(lintOnly(), { writer: w, obj, teach: "t", allow: () => false, log: () => {}, onRetry: () => counted++ }),
      StyleRetryNotAffordable
    );
    assert.equal(calls.length, 0);
    assert.equal(counted, 0);
  });

  test("a held half's steer is kept, and the style findings follow it (the app joins them the same way)", async () => {
    const { w, calls } = writer(() => practice());
    await styleRetry(lintOnly(), { writer: w, obj, teach: "t", steer: "HOLDSTEER", allow: () => true, log: () => {} });
    assert.equal(calls[0], `HOLDSTEER\n\n${fixFor(lessonPracticeLint(lintOnly()))}`);
  });
});

describe("REQ-248: the cue-word lint and terms that are not cues", () => {
  const q = (stem: string, choices: string[]) => distractorProblems("Q", stem, choices, 0);
  const cue = (ps: string[]) => ps.filter((p) => /absolute word/.test(p));

  test("FAIL-1601: a capitalized cue word inside a proper name is not a cue", () => {
    assert.deepEqual(
      cue(q("Which feature keeps column data encrypted in use?", ["Secure enclaves", "Enable Always Encrypted on the column", "Transparent data encryption", "Dynamic data masking"])),
      []
    );
    assert.deepEqual(cue(q("Which group grants access?", ["Domain admins", "Add them to the All Users group", "Guest accounts", "Local service"])), []);
  });

  test("FAIL-1601: the rule's intent stands -- a lowercase cue, ALL-CAPS emphasis, and a cue that starts an option or a sentence are still caught", () => {
    assert.equal(cue(q("Which is true?", ["It encrypts data", "It always blocks traffic", "It logs events", "It routes packets"])).length, 1);
    assert.equal(cue(q("Which is true?", ["It encrypts data", "It NEVER blocks traffic", "It logs events", "It routes packets"])).length, 1);
    assert.equal(cue(q("Which is true?", ["It encrypts data", "Always block the traffic", "It logs events", "It routes packets"])).length, 1);
    assert.equal(cue(q("Which is true?", ["It encrypts data", "Check it. Never skip the log", "It logs events", "It routes packets"])).length, 1);
    assert.equal(cue(q("What should the nurse say?", ["Ask about the pain", 'Tell the patient, "Never worry about it"', "Recheck vitals", "Call the provider"])).length, 1);
  });

  test("already handled (FAIL-1012): hyphenated compounds such as read-only and all-cause are one word", () => {
    assert.deepEqual(cue(q("Which access suits an auditor?", ["Full control", "Read-only access", "Modify rights", "Owner role"])), []);
    assert.deepEqual(cue(q("Which outcome did the trial measure?", ["Stroke rate", "All-cause mortality", "Readmission", "Length of stay"])), []);
    assert.deepEqual(cue(q("Which status follows the repair?", ["Full weight-bearing", "Non-weight-bearing", "Toe-touch weight-bearing", "Weight-bearing as tolerated"])), []);
  });

  test("kept as cues on purpose (not clear false positives): a standalone 'only', and an absolute in quoted speech", () => {
    // "weight-bearing only" restricts like any "X only" option, the classic cue.
    assert.equal(cue(q("Which order follows the repair?", ["Full weight-bearing", "Weight-bearing only with crutches", "Non-weight-bearing", "Bed rest"])).length, 1);
    // A quoted statement in an option IS the option (nurse responses, patient statements).
    assert.equal(cue(q("Which statement shows understanding?", ['"I will take it with food."', '"I will never miss a dose."', '"I can stop when I feel better."', '"I take it at bedtime."'])).length, 1);
  });
});

describe("REQ-248 (FAIL-1603): a full run needs a trial first", () => {
  test("submit without --limit needs --confirm-full-run (a dry run does not)", () => {
    assert.throws(() => parseArgs(["--submit", "--tracks", "DPT", "--max-usd", "110"]), /--confirm-full-run/);
    assert.equal(parseArgs(["--submit", "--tracks", "DPT", "--max-usd", "110", "--limit", "25"]).limit, 25);
    assert.equal(parseArgs(["--submit", "--tracks", "DPT", "--max-usd", "110", "--confirm-full-run"]).confirmFullRun, true);
    assert.equal(parseArgs(["--submit", "--tracks", "DPT", "--max-usd", "110", "--dry-run"]).dryRun, true);
    assert.doesNotThrow(() => parseArgs(["--tracks", "DPT"]), "estimate needs nothing");
  });
});
