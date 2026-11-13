// REQ-256: the pure rules behind the move-down suggestion and the lesson
// goal card's showings (lib/learner-level-rules.ts), and the goal question
// metrics query (lib/metrics.ts) kept the same as the one in
// docs/learner-levels.md.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  firstTryMissed,
  GOAL_CARD_MAX_SHOWINGS,
  goalCardDecision,
  isGuessMatch,
  levelAbove,
  levelBelow,
  LEVEL_DOWN_MIN_GUESSES,
  LEVEL_DOWN_MIN_MISSED,
  LEVEL_DOWN_SNOOZE_DAYS,
  LEVEL_DOWN_WINDOW,
  LEVELS,
  meetsLevelDown,
  meetsLevelUp,
  suggestionDue,
  type FirstTry,
  type GuessMatch,
} from "./learner-level-rules";
import { LEARNER_EVENTS } from "./events";
import { formatGoalQuestion, GOAL_QUESTION_SQL } from "./metrics";

const right: FirstTry = { verdict: "correct", assisted: false };
const hinted: FirstTry = { verdict: "correct", assisted: true };
const miss: FirstTry = { verdict: "incorrect", assisted: false };
const part: FirstTry = { verdict: "partial", assisted: false };

describe("move-down suggestion rule", () => {
  test("the thresholds are the design's: 3 of the last 5 missed, or every guess off", () => {
    assert.equal(LEVEL_DOWN_WINDOW, 5);
    assert.equal(LEVEL_DOWN_MIN_MISSED, 3);
    assert.equal(LEVEL_DOWN_MIN_GUESSES, 3);
    assert.equal(LEVEL_DOWN_SNOOZE_DAYS, 7);
  });
  test("a miss is incorrect or partial; a hinted right answer or an ungraded one is not", () => {
    assert.equal(firstTryMissed(miss), true);
    assert.equal(firstTryMissed(part), true);
    assert.equal(firstTryMissed(hinted), false);
    assert.equal(firstTryMissed(right), false);
    assert.equal(firstTryMissed({ verdict: null as unknown as string, assisted: false }), false);
  });
  test("3 misses in the last 5 suggest; 2 do not", () => {
    assert.equal(meetsLevelDown([miss, right, part, right, miss], []), "missed");
    assert.equal(meetsLevelDown([miss, right, right, right, miss], []), null);
    assert.equal(meetsLevelDown([miss, miss, miss], []), "missed", "three misses in a row are enough before the window fills");
  });
  test("only the newest 5 count: older misses fall out", () => {
    assert.equal(meetsLevelDown([right, right, right, miss, right, miss, miss, miss], []), null);
  });
  test("every guess off suggests, with at least 3 guesses; one close guess does not", () => {
    const off: GuessMatch[] = ["off", "off", "off"];
    assert.equal(meetsLevelDown([], off), "guesses");
    assert.equal(meetsLevelDown([], ["off", "off"]), null, "two guesses are not 'every guess'");
    assert.equal(meetsLevelDown([], ["off", "off", "partial", "off"]), null);
    assert.equal(meetsLevelDown([], ["off", "off", "off", "off", "off", "close"]), "guesses", "the sixth guess is outside the window");
  });
  test("misses win when both hold", () => {
    assert.equal(meetsLevelDown([miss, miss, miss], ["off", "off", "off"]), "missed");
  });
  test("the up and down rules never both hold on the same answers", () => {
    const kinds = [right, hinted, miss, part];
    for (let n = 0; n < 4 ** 5; n++) {
      const w: FirstTry[] = [];
      for (let k = 0, m = n; k < 5; k++, m = Math.floor(m / 4)) w.push(kinds[m % 4]);
      assert.ok(!(meetsLevelUp(w) && meetsLevelDown(w, []) === "missed"), JSON.stringify(w));
    }
  });
  test("one level at a time and never below New; the inverse of moving up", () => {
    assert.equal(levelBelow("experienced"), "some");
    assert.equal(levelBelow("some"), "new");
    assert.equal(levelBelow("new"), null);
    for (const l of LEVELS) {
      const down = levelBelow(l);
      if (down) assert.equal(levelAbove(down), l);
    }
  });
  test("at most once a week per unit", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    assert.equal(suggestionDue(null, now), true);
    assert.equal(suggestionDue(new Date("2026-11-14T12:00:00Z"), now), false);
    assert.equal(suggestionDue(new Date("2026-11-13T12:00:01Z"), now), false);
    assert.equal(suggestionDue(new Date("2026-11-13T12:00:00Z"), now), true);
  });
  test("guess labels are the model's three and nothing else", () => {
    for (const m of ["close", "partial", "off"]) assert.equal(isGuessMatch(m), true);
    for (const m of ["Off", "", null, 1, "wrong"]) assert.equal(isGuessMatch(m), false);
  });
  test("the new events are known to the event writer and to 080's check", () => {
    const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "080_level_down_suggestions.sql"), "utf8");
    for (const e of ["guess_matched", "level_down_suggested", "level_down_declined", "goal_card_shown"]) {
      assert.ok((LEARNER_EVENTS as readonly string[]).includes(e), e);
      assert.ok(sql.includes(`'${e}'`), e);
    }
    // 080 restates every event the app writes, so none is dropped by the swap.
    for (const e of LEARNER_EVENTS) assert.ok(sql.includes(`'${e}'`), `080 keeps ${e}`);
  });
});

describe("lesson goal card showings", () => {
  test("shown in two lessons, then recorded dismissed in the third", () => {
    assert.equal(GOAL_CARD_MAX_SHOWINGS, 2);
    assert.equal(goalCardDecision(false, 0, false), "show");
    assert.equal(goalCardDecision(false, 1, false), "show");
    assert.equal(goalCardDecision(false, 2, false), "auto_dismiss");
  });
  test("reopening a lesson it was already shown in is not another showing", () => {
    assert.equal(goalCardDecision(false, 2, true), "show");
  });
  test("once asked (answered, skipped or dismissed) it never shows", () => {
    assert.equal(goalCardDecision(true, 0, false), "hide");
    assert.equal(goalCardDecision(true, 5, true), "hide");
  });
});

describe("goal question metrics", () => {
  test("the query in docs/learner-levels.md is the one npm run metrics runs", () => {
    const doc = readFileSync(join(__dirname, "..", "..", "docs", "learner-levels.md"), "utf8");
    const m = /<!-- goal-question-sql -->\s*```sql\n([\s\S]*?)```/.exec(doc);
    assert.ok(m, "docs/learner-levels.md carries the goal question query");
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    assert.equal(norm(m![1]).replace(/\$1/g, "30"), norm(GOAL_QUESTION_SQL).replace(/\$1/g, "30"));
  });
  test("the query only reads", () => {
    assert.doesNotMatch(GOAL_QUESTION_SQL, /\b(insert|update|delete|alter|drop|create)\b/i);
  });
  test("the summary says when nothing is there yet and gives counts beside rates", () => {
    assert.match(formatGoalQuestion([], 30), /No answers, skips or dismissals yet/);
    const text = formatGoalQuestion(
      [
        { via: "lesson", total: 4, answered: 1, skipped: 0, dismissed: 3, dismissedAuto: 2, startSettled: 0, startNoLesson: 0 },
        { via: "start", total: 10, answered: 6, skipped: 4, dismissed: 0, dismissedAuto: 0, startSettled: 8, startNoLesson: 2 },
      ],
      30
    );
    assert.match(text, /Start-course sheets with no lesson start after: 25% \(2 of 8\)/);
    assert.match(text, /via start: 10 -- answered 6, skip rate 40% \(4 of 10\)/);
    assert.match(text, /via lesson: 4 .*dismiss rate 75% \(3 of 4\) \(2 dismissed automatically/);
  });
});
