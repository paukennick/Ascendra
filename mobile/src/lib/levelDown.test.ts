// REQ-256: the move-down suggestion's wording and parsing, the lesson goal
// card's server answer, and the mirrored thresholds (the server's named
// constants in backend/lib/learner-level-rules.ts).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GOAL_CARD_MAX_SHOWINGS,
  goalCardAllowed,
  showsCountedGoalCard,
  LEVEL_DOWN_MIN_GUESSES,
  LEVEL_DOWN_MIN_MISSED,
  LEVEL_DOWN_NOT_NOW,
  LEVEL_DOWN_SNOOZE_DAYS,
  LEVEL_DOWN_WINDOW,
  LEVEL_DOWN_YES,
  levelDownDone,
  levelDownQuestion,
  levelDownSnoozed,
  levelDownUndone,
  levelDownWhat,
  parseLevelChange,
  parseLevelDownSuggestion,
} from "./learnerLevel.ts";

const rules = readFileSync(new URL("../../../backend/lib/learner-level-rules.ts", import.meta.url), "utf8");

describe("mirrored thresholds", () => {
  test("the app's numbers are the server's named constants", () => {
    for (const [name, v] of Object.entries({
      LEVEL_DOWN_WINDOW,
      LEVEL_DOWN_MIN_MISSED,
      LEVEL_DOWN_MIN_GUESSES,
      LEVEL_DOWN_SNOOZE_DAYS,
      GOAL_CARD_MAX_SHOWINGS,
    })) {
      assert.match(rules, new RegExp(`export const ${name} = ${v};`), name);
    }
  });
});

describe("move-down suggestion", () => {
  const s = { unitId: "u", unitTitle: "Loops", fromLevel: "some", toLevel: "new", why: "missed" };
  test("parses one level down only", () => {
    assert.deepEqual(parseLevelDownSuggestion(s), s);
    assert.equal(parseLevelDownSuggestion({ ...s, fromLevel: "experienced", toLevel: "new" }), null, "never two levels");
    assert.equal(parseLevelDownSuggestion({ ...s, fromLevel: "new", toLevel: "some" }), null, "never up");
    assert.equal(parseLevelDownSuggestion(null), null);
    assert.equal(parseLevelDownSuggestion({ ...s, unitId: 3 }), null);
    assert.equal(parseLevelDownSuggestion({ ...s, unitTitle: " " })?.unitTitle, null);
  });
  test("asks about the unit by name, with the approved wording", () => {
    assert.equal(levelDownQuestion({ unitTitle: "Loops" }), '"Loops" seems tougher than expected. Want more step-by-step help there?');
    assert.equal(levelDownQuestion({ unitTitle: null }), "This unit seems tougher than expected. Want more step-by-step help here?");
    assert.equal(LEVEL_DOWN_NOT_NOW, "Not now");
    assert.match(LEVEL_DOWN_YES, /^Yes/);
  });
  test("says what changes, that the bar is the same and that it can be undone", () => {
    assert.match(levelDownWhat({ toLevel: "new" }), /full worked example/);
    assert.match(levelDownWhat({ toLevel: "some" }), /guided practice/);
    for (const t of [levelDownWhat({ toLevel: "new" }), levelDownWhat({ toLevel: "some" })]) {
      assert.match(t, /same/);
      assert.match(t, /switch back any time/);
    }
    assert.match(levelDownSnoozed(), new RegExp(`${LEVEL_DOWN_SNOOZE_DAYS} days`));
    assert.match(levelDownDone({ unitTitle: "Loops", toLevel: "new" }), /"Loops" is now New/);
    assert.equal(levelDownUndone({ unitTitle: null, fromLevel: "experienced" }), "Undone. This unit is back to Experienced.");
  });
  test("no shame: never counts misses back or calls anything a failure", () => {
    const all = [
      levelDownQuestion({ unitTitle: "Loops" }),
      levelDownQuestion({ unitTitle: null }),
      levelDownWhat({ toLevel: "new" }),
      levelDownWhat({ toLevel: "some" }),
      levelDownDone({ unitTitle: null, toLevel: "some" }),
      levelDownSnoozed(),
      levelDownUndone({ unitTitle: "Loops", fromLevel: "some" }),
    ].join(" ");
    assert.doesNotMatch(all, /\b(fail|failed|failing|wrong|missed|struggl|behind|bad|poor|demot|easy mode|\d+ of your)\b/i);
  });
  test("a suggested change parses with its reason, so Undo is offered for it", () => {
    const c = parseLevelChange({ id: "c", unitId: "u", unitTitle: "Loops", fromLevel: "some", toLevel: "new", reason: "suggested", createdAt: "" });
    assert.equal(c?.reason, "suggested");
  });
});

describe("lesson goal card", () => {
  test("the server's answer decides; anything else keeps showing it", () => {
    assert.equal(goalCardAllowed({ show: false, autoDismissed: true }), false);
    assert.equal(goalCardAllowed({ show: true, autoDismissed: false }), true);
    assert.equal(goalCardAllowed(null), true);
    assert.equal(goalCardAllowed({ error: "Not found" }), true);
  });
  test("nothing shows until the server answers; a confirmation stays in place", () => {
    const asked = { answered: false };
    assert.equal(showsCountedGoalCard(asked, "ask", "unknown"), false);
    assert.equal(showsCountedGoalCard(asked, "ask", "show"), true);
    assert.equal(showsCountedGoalCard(asked, "ask", "hide"), false);
    assert.equal(showsCountedGoalCard({ answered: true }, "ask", "show"), false);
    assert.equal(showsCountedGoalCard({ answered: true }, "saved", "hide"), true);
  });
});

describe("screens are wired (source checks)", () => {
  const lesson = readFileSync(new URL("../../app/(app)/course/[trackId]/lesson/[objectiveId].tsx", import.meta.url), "utf8");
  test("the lesson's level check says it can show the suggestion and draws it on the done screen", () => {
    assert.match(lesson, /\/level\/check`, \{ unitId, suggest: true \}/);
    assert.match(lesson, /<LevelDownCard suggestion=\{levelDown\}/);
    assert.match(lesson, /\/level\/suggestion`/);
  });
});
