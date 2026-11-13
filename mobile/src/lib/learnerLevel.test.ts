// REQ-252 (levels phase 1A): the goal question wording, the level-aware flow
// (pilot courses only), the one-tap hunch, and the progress signals.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GOAL_CHOICES,
  LADDER,
  LEVEL_NAMES,
  NO_IDEA,
  STANDARD_FLOW,
  beforeAfter,
  canDoSentence,
  chipLabel,
  comebackLine,
  hunchFeedback,
  hunchQuestion,
  ladderAnnouncement,
  ladderFor,
  lessonFlowFor,
  openKeyTermsAtStart,
  levelChangeNotice,
  LEVEL_UP_MIN_FIRST_TRY_CORRECT,
  LEVEL_UP_WINDOW,
  levelFadingPlan,
  levelMeaning,
  parseLevelState,
  ratingChoices,
  suggestionFor,
  topicOf,
} from "./learnerLevel.ts";
import { EMPTY_TEACH, emptyCheck, parseTeachState, type CheckState } from "./lessonProgress.ts";

describe("goal question and levels", () => {
  test("the five goal options are worded exactly as approved", () => {
    assert.deepEqual(
      GOAL_CHOICES.map((g) => g.label),
      [
        "I use this at work regularly",
        "I'm staying current or keeping a credential",
        "I'm in a program or studying for the exam now",
        "I'm getting into this field or changing careers",
        "I'm learning out of interest",
      ]
    );
  });
  test("levels show as plain names", () => {
    assert.deepEqual(LEVEL_NAMES, { new: "New", some: "Some background", experienced: "Experienced" });
    assert.equal(chipLabel("some"), "Level: Some background");
  });
  test("the self-rating is concrete for Python and JavaScript, plain elsewhere", () => {
    assert.deepEqual(ratingChoices("PYTHON").map((r) => r.label), ["I've never written code", "I've written small scripts", "I write code at work"]);
    assert.equal(ratingChoices("JAVASCRIPT")[2].label, "I write JavaScript at work");
    assert.equal(ratingChoices("SECPLUS")[0].label, "This is new to me");
    assert.equal(ratingChoices(null).length, 3);
  });
  test("the pre-selected rating follows the goal unless the experience answer decides", () => {
    const noExp = { suggestion: { level: "some" as const, reason: "none" as const } };
    assert.equal(suggestionFor("career_change", noExp), "new");
    assert.equal(suggestionFor("work", noExp), "experienced");
    assert.equal(suggestionFor(null, noExp), "some");
    const exp = { suggestion: { level: "some" as const, reason: "experience" as const } };
    assert.equal(suggestionFor("career_change", exp), "some");
  });
  test("a course without the flow says lessons are the same for now", () => {
    assert.match(levelMeaning("new", false), /same at every level/);
    assert.match(levelMeaning("new", true), /one-tap/);
  });
  test("parseLevelState accepts the server's shape and rejects junk", () => {
    const s = parseLevelState({
      trackId: "t",
      trackCode: "PYTHON",
      levelFlow: true,
      answered: false,
      goal: "nope",
      courseLevel: "new",
      courseLevelSource: "self",
      suggestion: { level: "some", reason: "goal" },
      units: [{ unitId: "u", title: "U", level: "expert", source: "auto" }, { bad: 1 }],
      effective: "new",
      notices: [{ id: "c", unitId: "u", unitTitle: "U", fromLevel: "new", toLevel: "some", reason: "mastery", createdAt: "x" }, { id: 1 }],
    });
    assert.ok(s);
    assert.equal(s.goal, null);
    assert.equal(s.units.length, 1);
    assert.equal(s.units[0].level, null);
    assert.equal(s.notices.length, 1);
    assert.equal(parseLevelState({ effective: "expert" }), null);
    assert.equal(parseLevelState(null), null);
  });
  test("the level-up notice names the unit and the evidence, and what changes with the flow on", () => {
    const c = { id: "c", unitId: "u", unitTitle: "Functions", fromLevel: "new" as const, toLevel: "some" as const, reason: "mastery" as const, createdAt: "" };
    assert.match(levelChangeNotice(c, false), /4 of your last 5 solo checks in "Functions".*now Some background\.$/);
    assert.match(levelChangeNotice(c, true), /typed guess/);
    assert.match(levelChangeNotice({ ...c, toLevel: "experienced" }, true), /Guided practice is optional/);
  });
});

describe("level-aware lesson flow", () => {
  test("only where the course has it on", () => {
    assert.deepEqual(lessonFlowFor("new", false), STANDARD_FLOW);
    assert.deepEqual(lessonFlowFor("experienced", false), STANDARD_FLOW);
    assert.deepEqual(lessonFlowFor(null, true), STANDARD_FLOW);
  });
  test("New: one-tap hunch and the full worked example; Experienced: skip offered; Some: unchanged", () => {
    assert.deepEqual(lessonFlowFor("new", true), { oneTapHunch: true, keyTermsFirst: true, fullExampleFirst: true, offerSkipGuided: false });
    assert.deepEqual(lessonFlowFor("experienced", true), { oneTapHunch: false, keyTermsFirst: false, fullExampleFirst: false, offerSkipGuided: true });
    assert.deepEqual(lessonFlowFor("some", true), STANDARD_FLOW);
  });
  test("Key terms opens once at the start for New only (REQ-253's initiallyOpen)", () => {
    assert.equal(openKeyTermsAtStart(lessonFlowFor("new", true), "guess"), true);
    // A lesson resumed past the first step does not pop it open again.
    assert.equal(openKeyTermsAtStart(lessonFlowFor("new", true), "teach"), false);
    assert.equal(openKeyTermsAtStart(lessonFlowFor("new", false), "guess"), false);
    assert.equal(openKeyTermsAtStart(lessonFlowFor("some", true), "guess"), false);
    assert.equal(openKeyTermsAtStart(lessonFlowFor("experienced", true), "guess"), false);
    assert.equal(openKeyTermsAtStart(STANDARD_FLOW, "guess"), false);
  });
  test("the Guided plan by level, and today's rule otherwise", () => {
    const signals = { guessed: true, guessMatch: "close" as const, history: "strong" as const };
    assert.equal(levelFadingPlan(lessonFlowFor("new", true), signals), "full-example");
    assert.equal(levelFadingPlan(lessonFlowFor("experienced", true), { guessed: false, guessMatch: null, history: "none" }), "offer-skip");
    assert.equal(levelFadingPlan(STANDARD_FLOW, signals), "offer-skip");
    assert.equal(levelFadingPlan(STANDARD_FLOW, { guessed: true, guessMatch: "partial", history: "some" }), "standard");
  });
});

describe("one-tap hunch", () => {
  test("uses the Guided item and its choices", () => {
    const q = hunchQuestion({ guessPrompt: "typed?", fadeProblem: "What does type(3.0) show?", fadeChoices: ["int", "float", "str", "None"] });
    assert.deepEqual(q, { source: "guided", prompt: "What does type(3.0) show?", choices: ["int", "float", "str", "None"] });
  });
  test("prefers a lesson's own hunch choices if a lesson ever has them", () => {
    const q = hunchQuestion({ guessPrompt: "g", guessChoices: ["a", "b", "c"], fadeProblem: "f", fadeChoices: ["1", "2", "3", "4"] });
    assert.equal(q?.source, "lesson");
  });
  test("no usable options (practice still generating, 2 or 5 choices, blanks) falls back to the typed guess", () => {
    assert.equal(hunchQuestion({ guessPrompt: "g" }), null);
    assert.equal(hunchQuestion({ fadeProblem: "f", fadeChoices: ["a", "b"] }), null);
    assert.equal(hunchQuestion({ fadeProblem: "f", fadeChoices: ["a", "b", "c", "d", "e"] }), null);
    assert.equal(hunchQuestion({ fadeProblem: "f", fadeChoices: ["a", " ", "c"] }), null);
  });
  test("feedback is one line and never a verdict", () => {
    for (const h of ["guided", "lesson", "no_idea"] as const) {
      const line = hunchFeedback(h);
      assert.ok(!/\b(correct|wrong|incorrect|right answer)\b/i.test(line), line);
      assert.ok(line.split(/(?<=\.)\s/).length <= 2);
    }
  });
  test("the hunch is saved with the position and an older position reads the same", () => {
    assert.deepEqual(parseTeachState({ card: 0, hunch: "guided", soloRetried: true }), { ...EMPTY_TEACH, hunch: "guided", soloRetried: true });
    assert.deepEqual(parseTeachState({ card: 0, hunch: "bogus", soloRetried: "yes" }), EMPTY_TEACH);
  });
});

const graded = (verdict: string, extra: Partial<CheckState> = {}): CheckState => ({
  ...emptyCheck("fade"),
  ...extra,
  result: { verdict, feedback: "", missedParts: [] },
});

describe("mastery ladder", () => {
  const base = { status: null, reachedTeach: false, explainDone: false, guidedVerdict: null, soloVerdict: null };
  test("five rungs, in order", () => {
    assert.deepEqual([...LADDER], ["Seen", "Understood", "Practiced", "Mastered", "Kept"]);
  });
  test("nothing yet; then each small check fills a rung", () => {
    assert.equal(ladderFor(base).filled, 0);
    assert.equal(ladderFor({ ...base, reachedTeach: true }).filled, 1);
    assert.equal(ladderFor({ ...base, reachedTeach: true, explainDone: true }).filled, 2);
    assert.equal(ladderFor({ ...base, reachedTeach: true, guidedVerdict: "partial" }).filled, 2);
    assert.equal(ladderFor({ ...base, reachedTeach: true, guidedVerdict: "correct" }).filled, 3);
  });
  test("Mastered and Kept are exactly today's statuses", () => {
    assert.equal(ladderFor({ ...base, status: "Guided", soloVerdict: "correct" }).filled, 3);
    assert.equal(ladderFor({ ...base, status: "Independent" }).filled, 4);
    assert.equal(ladderFor({ ...base, status: "Transfer-ready" }).filled, 5);
    // A correct solo answer alone is not Mastered (074: it needs confirming a day later).
    const l = ladderFor({ ...base, reachedTeach: true, soloVerdict: "correct" });
    assert.equal(l.filled, 3);
    assert.match(l.note ?? "", /a day or more/);
  });
  test("Needs review drops Mastered and says so", () => {
    const l = ladderFor({ ...base, status: "Needs review", reachedTeach: true });
    assert.ok(l.filled < 4);
    assert.match(l.note ?? "", /Due for review/);
  });
  test("a higher rung fills the ones under it", () => {
    const l = ladderFor({ ...base, status: "Transfer-ready" });
    assert.ok(l.rungs.every((r) => r.filled));
    assert.equal(ladderAnnouncement(l), "Progress: Kept, 5 of 5");
    assert.equal(ladderAnnouncement(ladderFor(base)), "Progress: not started");
  });
});

describe("You can now...", () => {
  test("a noun-phrase title becomes a concrete can-do sentence", () => {
    assert.equal(
      canDoSentence("Variables, dynamic typing, and Python's core built-in types (int, float, str, bool, None)"),
      "You can now explain variables, dynamic typing, and Python's core built-in types and answer a question on it on your own."
    );
    assert.equal(topicOf("Operators: arithmetic, comparison, logical"), "operators");
  });
  test("a title that starts with a verb keeps it", () => {
    assert.equal(canDoSentence("Write a function with default arguments."), "You can now write a function with default arguments.");
  });
  test("proper nouns keep their capital", () => {
    assert.equal(topicOf("JavaScript closures"), "JavaScript closures");
    assert.equal(topicOf("Python's import system"), "Python's import system");
  });
  test("says so when the answer used a hint", () => {
    assert.match(canDoSentence("Loops", { hinted: true }), /with a hint for now/);
  });
});

describe("before / after", () => {
  const choices = ["int", "float", "str", "None"];
  test("a hunch on the Guided item is set beside the Guided answer", () => {
    const r = beforeAfter({
      guess: "int",
      teach: { hunch: "guided" },
      guided: graded("correct", { mode: "mc", picked: 1 }),
      solo: undefined,
      guidedChoices: choices,
    });
    assert.deepEqual(r, { before: "int", now: "float", nowLabel: "Your guided answer", verdict: "correct" });
  });
  test("No idea yet is shown as such", () => {
    const r = beforeAfter({ guess: "", teach: { hunch: "no_idea" }, guided: graded("correct", { mode: "mc", picked: 0 }), solo: undefined, guidedChoices: choices });
    assert.equal(r?.before, NO_IDEA);
  });
  test("a typed guess is set beside the written solo answer", () => {
    const solo = { ...emptyCheck("solo"), openAnswer: "a float is a number with a decimal point", result: { verdict: "correct", feedback: "", missedParts: [] } };
    const r = beforeAfter({ guess: "numbers", teach: {}, guided: undefined, solo, guidedChoices: null });
    assert.equal(r?.nowLabel, "Your solo answer");
  });
  test("nothing when the guess was skipped or nothing has been answered", () => {
    assert.equal(beforeAfter({ guess: "", teach: {}, guided: undefined, solo: undefined, guidedChoices: null }), null);
    assert.equal(beforeAfter({ guess: "x", teach: {}, guided: undefined, solo: undefined, guidedChoices: null }), null);
  });
});

describe("comeback credit", () => {
  const title = "Loops: for, while, range()";
  test("a missed Guided question then a right solo answer", () => {
    assert.equal(
      comebackLine({ title, guided: graded("incorrect"), solo: graded("correct"), soloRetried: false }),
      "You missed the guided question on loops, then got the solo check right on your own."
    );
  });
  test("a retried solo check and a revised one are named for what they were", () => {
    assert.match(comebackLine({ title, guided: graded("correct"), solo: graded("correct"), soloRetried: true }) ?? "", /came back and got it right/);
    const revised = { ...graded("correct"), firstResult: { verdict: "partial", feedback: "", missedParts: [] } };
    assert.match(comebackLine({ title, guided: undefined, solo: revised, soloRetried: false }) ?? "", /revised it/);
  });
  test("a hinted comeback says so", () => {
    const solo = { ...graded("correct"), result: { verdict: "correct", feedback: "", missedParts: [], assistReason: "hint" as const } };
    assert.match(comebackLine({ title, guided: graded("partial"), solo, soloRetried: false }) ?? "", /with a hint/);
  });
  test("no miss, or no right answer after it: nothing, and never generic praise", () => {
    assert.equal(comebackLine({ title, guided: graded("correct"), solo: graded("correct"), soloRetried: false }), null);
    assert.equal(comebackLine({ title, guided: graded("incorrect"), solo: graded("incorrect"), soloRetried: false }), null);
    const src = readFileSync(join(import.meta.dirname, "learnerLevel.ts"), "utf8");
    assert.ok(!/great job|well done|awesome|amazing|confetti|points|leaderboard/i.test(src.replace(/No points, confetti or leaderboards\./, "")));
  });
});

describe("level-up thresholds", () => {
  test("the notice's numbers are the server's named constants", () => {
    const rules = readFileSync(new URL("../../../backend/lib/learner-level-rules.ts", import.meta.url), "utf8");
    assert.match(rules, new RegExp(`export const LEVEL_UP_WINDOW = ${LEVEL_UP_WINDOW};`));
    assert.match(rules, new RegExp(`export const LEVEL_UP_MIN_FIRST_TRY_CORRECT = ${LEVEL_UP_MIN_FIRST_TRY_CORRECT};`));
    const text = levelChangeNotice(
      { id: "c", unitId: "u", unitTitle: "Basics", fromLevel: "new", toLevel: "some", reason: "mastery", createdAt: "" },
      false
    );
    assert.match(text, new RegExp(`${LEVEL_UP_MIN_FIRST_TRY_CORRECT} of your last ${LEVEL_UP_WINDOW}`));
  });
});
