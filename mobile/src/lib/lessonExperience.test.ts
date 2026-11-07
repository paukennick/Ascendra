// REQ-106: teach cards, the Guided suggestion and lab report rules.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LAB_COUNTS_NOTE,
  LAB_SAFETY_NOTES,
  cardAnnouncement,
  claimsPan,
  clampCard,
  fadingPlan,
  labReportReady,
  swipeDirection,
  usableCards,
} from "./lessonExperience.ts";
import {
  EMPTY_TEACH,
  FRESH_POSITION,
  lessonFingerprint,
  parseSnapshot,
  parseTeachState,
  samePosition,
} from "./lessonProgress.ts";

const cards = {
  cards: [
    { kind: "definition", title: "What it is", body: "d" },
    { kind: "why", title: "Why it matters", body: "w" },
    { kind: "example", title: "Worked example", body: "setup", steps: ["a", "b", "c"] },
    { kind: "mistake", title: "Common mistake", body: "m" },
  ],
  selfExplain: { step: 2, question: "Why does step 2 follow?", modelExplanation: "because" },
};

describe("teach cards", () => {
  test("cards from the payload are used; a lesson without them (cached earlier) gets null and shows flat teach", () => {
    assert.equal(usableCards(cards)!.cards.length, 4);
    assert.equal(usableCards(undefined), null);
    assert.equal(usableCards({ cards: [] }), null);
    assert.equal(usableCards({ cards: [{ title: 1 }] }), null);
  });

  test("a self-explanation pointing at a missing step is dropped", () => {
    assert.equal(usableCards({ ...cards, selfExplain: { ...cards.selfExplain, step: 4 } })!.selfExplain, null);
  });

  test("a saved card index always lands on a real card", () => {
    assert.equal(clampCard(2, 4), 2);
    assert.equal(clampCard(7, 4), 3);
    assert.equal(clampCard(-1, 4), 0);
    assert.equal(clampCard(Number.NaN, 4), 0);
    assert.equal(clampCard(3, 0), 0);
  });

  test("screen readers hear the position and the title", () => {
    assert.equal(cardAnnouncement(1, 4, "Why it matters"), "Card 2 of 4: Why it matters");
  });

  test("a sideways swipe moves a card; a scroll or a short drag does not", () => {
    assert.equal(swipeDirection(-80, 10), 1);
    assert.equal(swipeDirection(80, 10), -1);
    assert.equal(swipeDirection(30, 0), 0);
    assert.equal(swipeDirection(-80, 60), 0);
    assert.equal(claimsPan(20, 2), true);
    assert.equal(claimsPan(5, 40), false);
  });
});

describe("saved position remembers the card", () => {
  const lesson = { guessPrompt: "g", teach: "t" };
  const key = lessonFingerprint(lesson);
  const now = 1_800_000_000_000;
  const base = { v: 2, step: "teach", guess: "", guessFeedback: null, confidence: null, lessonKey: key, checks: {}, savedAt: now - 1000 };

  test("the device copy carries teach at the top level", () => {
    const teach = { card: 2, explain: "x", explainDone: true, guessMatch: "close" };
    assert.deepEqual(parseSnapshot(JSON.stringify({ ...base, teach }), key, now)!.teach, teach);
  });

  test("the account copy carries it inside checks; old positions without it start at card 1", () => {
    const fromServer = parseSnapshot({ ...base, checks: { teach: { card: 1 } } }, key, now)!;
    assert.deepEqual(fromServer.teach, { card: 1, explain: "", explainDone: false, guessMatch: null });
    assert.equal(fromServer.checks.fade, undefined);
    assert.deepEqual(parseSnapshot(JSON.stringify(base), key, now)!.teach, EMPTY_TEACH);
  });

  test("moving to another card is a change of position (so it is saved)", () => {
    const a = { ...FRESH_POSITION, step: "teach" };
    assert.equal(samePosition(a, { ...a, teach: { ...EMPTY_TEACH } }), true);
    assert.equal(samePosition(a, { ...a, teach: { ...EMPTY_TEACH, card: 1 } }), false);
    assert.equal(samePosition(a, { ...a, teach: { ...EMPTY_TEACH, explain: "because" } }), false);
  });

  test("junk teach state is cleaned", () => {
    assert.deepEqual(parseTeachState({ card: 40, explain: 3, explainDone: "y", guessMatch: "correct" }), EMPTY_TEACH);
  });
});

describe("adaptive Guided suggestion", () => {
  test("a close guess with a strong history is offered the skip", () => {
    assert.equal(fadingPlan({ guessed: true, guessMatch: "close", history: "strong" }), "offer-skip");
  });

  test("a wrong or skipped guess with no history gets the full worked example", () => {
    assert.equal(fadingPlan({ guessed: true, guessMatch: "off", history: "none" }), "full-example");
    assert.equal(fadingPlan({ guessed: false, guessMatch: null, history: "none" }), "full-example");
  });

  test("everything else, and any missing signal, is the standard flow", () => {
    assert.equal(fadingPlan({ guessed: true, guessMatch: "close", history: "some" }), "standard");
    assert.equal(fadingPlan({ guessed: true, guessMatch: "partial", history: "strong" }), "standard");
    assert.equal(fadingPlan({ guessed: true, guessMatch: null, history: "strong" }), "standard");
    assert.equal(fadingPlan({ guessed: true, guessMatch: "off", history: "some" }), "standard");
    assert.equal(fadingPlan({ guessed: false, guessMatch: null, history: null }), "standard");
    assert.equal(fadingPlan({ guessed: true, guessMatch: "close", history: "none" }), "standard");
  });
});

describe("labs", () => {
  test("safety notes say own machine or free tier, never production; the copy says it won't change mastery", () => {
    assert.match(LAB_SAFETY_NOTES.join(" "), /your own computer or a free-tier account/);
    assert.match(LAB_SAFETY_NOTES.join(" "), /Never run this against production/);
    assert.match(LAB_COUNTS_NOTE, /doesn't change your mastery level/);
  });

  test("a report can be sent once at least one answer is filled in", () => {
    assert.equal(labReportReady(["", "a", ""], 3), true);
    assert.equal(labReportReady(["", " "], 2), false);
    assert.equal(labReportReady(["a"], 2), false);
  });
});
