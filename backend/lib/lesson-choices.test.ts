// REQ-089: multiple-choice lesson answers are shuffled when served and
// graded on the server by the chosen text.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { shuffled, gradeChoice, storedIndexOfText, type StoredChoices } from "./lesson-choices";
import { rowToLesson } from "./lesson-generation";
import type { LessonRow } from "./lesson-store";

const stored: StoredChoices = {
  choices: ["Right answer", "Wrong A", "Wrong B", "Wrong C"],
  correctIndex: 0,
  why: "Because it is right.",
  choiceFeedback: [
    "This applies the rule correctly.",
    "A confuses cause and effect.",
    "B ignores the time limit.",
    "C uses the adult value.",
  ],
};

// A seeded generator so the tests are repeatable.
function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

describe("shuffled", () => {
  test("keeps every item and does not change the input", () => {
    const input = ["a", "b", "c", "d"];
    const out = shuffled(input, seeded(7));
    assert.deepEqual([...out].sort(), ["a", "b", "c", "d"]);
    assert.deepEqual(input, ["a", "b", "c", "d"]);
  });

  test("puts the first item in every position over many serves", () => {
    const random = seeded(42);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(shuffled(stored.choices, random).indexOf("Right answer"));
    assert.deepEqual([...seen].sort(), [0, 1, 2, 3]);
  });
});

describe("gradeChoice", () => {
  test("a right pick is graded correct whatever order it was shown in", () => {
    const g = gradeChoice(stored, "Right answer");
    assert.equal(g?.correct, true);
    assert.match(g!.feedback, /^That's right\. This applies the rule correctly\./);
  });

  test("a wrong pick explains that pick, then names the right answer", () => {
    const g = gradeChoice(stored, "Wrong B");
    assert.equal(g?.correct, false);
    assert.match(g!.feedback, /B ignores the time limit\./);
    assert.match(g!.feedback, /The best answer is "Right answer": Because it is right\./);
  });

  test("lessons cached before per-option feedback fall back to the one explanation", () => {
    const old = { ...stored, choiceFeedback: null };
    assert.equal(gradeChoice(old, "Wrong A")!.feedback, 'Not quite. The best answer is "Right answer": Because it is right.');
    assert.equal(gradeChoice(old, "Right answer")!.feedback, "That's right. Because it is right.");
  });

  test("text that is not one of the choices is not graded", () => {
    assert.equal(gradeChoice(stored, "Something the app made up"), null);
  });
});

// Merged 2026-11-07: the lesson payload is line A's rowToLesson (REQ-134,
// a fixed per-learner shuffle from lib/choice-order.ts, Solo choices only
// through the hint route). B's guarantee is kept and checked here: nothing
// that reveals or explains the answer is sent.
describe("rowToLesson", () => {
  const row: LessonRow = {
    guess_prompt: "g",
    teach: "t",
    fade_problem: "f",
    fade_choices: stored.choices,
    fade_option_reasons: stored.choiceFeedback,
    fade_correct_index: 0,
    fade_why: "fw",
    solo_check: "s",
    solo_choices: stored.choices,
    solo_option_reasons: null,
    solo_correct_index: 0,
    solo_why: "sw",
    teach_cards: null,
    model: "m",
    generated_at: "2026-11-02",
  };

  test("never sends the right answer, its explanation or per-option feedback to the app", () => {
    process.env.CHOICE_ORDER_SECRET ??= "test-only-choice-order-secret";
    const served = rowToLesson(row, { userId: "00000000-0000-0000-0000-000000000001", objectiveId: "00000000-0000-0000-0000-000000000002" }) as Record<string, unknown>;
    for (const k of ["fadeCorrectIndex", "soloCorrectIndex", "fadeWhy", "soloWhy", "fadeChoiceFeedback", "soloChoiceFeedback", "fadeOptionReasons", "soloOptionReasons"]) {
      assert.equal(k in served, false, k);
    }
    assert.deepEqual([...(served.fadeChoices as string[])].sort(), [...stored.choices].sort());
    assert.deepEqual(served.soloChoices, []);
  });
});

describe("storedIndexOfText (chosenText clients)", () => {
  test("finds the one stored choice with that text, trimmed", () => {
    assert.equal(storedIndexOfText(stored.choices, "  Wrong B "), 2);
  });
  test("unknown or ambiguous text is not graded", () => {
    assert.equal(storedIndexOfText(stored.choices, "Something the app made up"), null);
    assert.equal(storedIndexOfText(["Same", "Same", "x", "y"], "Same"), null);
  });
});
