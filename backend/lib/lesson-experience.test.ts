// REQ-106: pure parts of the lesson-experience upgrades -- teach cards, the
// self-explanation prompt, the learner-history summary and the lab report.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  cardsFromModel,
  cleanLabQuestions,
  fallbackLabQuestions,
  guessFeedbackSchema,
  introFromModel,
  labReportAnswer,
  labReportQuestion,
  lessonIntroPrompt,
  lessonIntroSchema,
  MAX_LAB_QUESTIONS,
  parseTeachCards,
  teachFromCards,
} from "./prompts";
import { classifyHistory, labAnswersFor, labPromptHash } from "./lesson-experience";

const model = {
  guessPrompt: "What does a CA do?",
  definition: "A certificate authority (CA) signs certificates.",
  whyItMatters: "Browsers trust a site because a CA they trust vouched for it.",
  exampleSetup: "You open https://example.com.",
  exampleSteps: ["The server sends its leaf certificate.", "The browser checks the issuer's signature.", "It walks up to a trusted root."],
  commonMistake: "Thinking the padlock means the site is safe, not just authenticated.",
  selfExplainStep: 2,
  selfExplainQuestion: "Why does step 2 follow from step 1?",
  selfExplainAnswer: "The leaf names its issuer, so the browser can check that issuer's signature on it.",
};

describe("teach cards", () => {
  test("the model output becomes four cards in teaching order with one self-explanation prompt", () => {
    const t = cardsFromModel(model)!;
    assert.deepEqual(
      t.cards.map((c) => c.kind),
      ["definition", "why", "example", "mistake"]
    );
    assert.deepEqual(t.cards[2].steps, model.exampleSteps);
    assert.deepEqual(t.selfExplain, { step: 2, question: model.selfExplainQuestion, modelExplanation: model.selfExplainAnswer });
  });

  test("the flat teach text is derived from the cards, with numbered steps, so grading still has the full teaching", () => {
    const intro = introFromModel(model);
    assert.match(intro.teach, /^A certificate authority/);
    assert.match(intro.teach, /Step 2: The browser checks/);
    assert.match(intro.teach, /Common mistake: Thinking the padlock/);
    assert.equal(intro.teach, teachFromCards(intro.teachCards!));
  });

  test("an empty card is left out (3 cards) and a question about a missing step is dropped", () => {
    const t = cardsFromModel({ ...model, whyItMatters: "  ", selfExplainStep: 9 })!;
    assert.equal(t.cards.length, 3);
    assert.equal(t.selfExplain, null);
  });

  test("too little for cards falls back to flat text; the old { guessPrompt, teach } shape still works", () => {
    assert.equal(cardsFromModel({ definition: "x" }), null);
    const old = introFromModel({ guessPrompt: "g", teach: "OLD TEACH" } as never);
    assert.deepEqual(old, { guessPrompt: "g", teach: "OLD TEACH", teachCards: null });
  });

  test("stored cards round-trip; malformed stored cards read as absent (the lesson shows flat teach)", () => {
    const t = cardsFromModel(model)!;
    assert.deepEqual(parseTeachCards(JSON.parse(JSON.stringify(t))), t);
    assert.equal(parseTeachCards(null), null);
    assert.equal(parseTeachCards({ cards: "nope" }), null);
    assert.equal(parseTeachCards({ cards: [{ kind: "bogus", title: "x", body: "y" }] }), null);
    const badStep = parseTeachCards({ ...t, selfExplain: { step: 7, question: "q", modelExplanation: "a" } })!;
    assert.equal(badStep.selfExplain, null);
  });

  test("the intro prompt and schema ask for cards and the self-explanation, not one teach block", () => {
    const { user } = lessonIntroPrompt({ trackTitle: "T", unitTitle: "U", objectiveTitle: "O" });
    for (const f of ["definition", "whyItMatters", "exampleSteps", "commonMistake", "selfExplainQuestion", "selfExplainAnswer"]) {
      assert.match(user, new RegExp(`"${f}"`));
      assert.ok(f in lessonIntroSchema.shape);
    }
    assert.doesNotMatch(user, /"teach":/);
  });
});

describe("adaptive fading inputs", () => {
  test("guess feedback carries a coarse match the app uses only for a suggestion", () => {
    assert.deepEqual(guessFeedbackSchema.shape.guessMatch.options, ["close", "partial", "off"]);
  });

  test("history: Independent or Transfer-ready is strong; nothing graded is none; the rest is some", () => {
    assert.equal(classifyHistory("Transfer-ready", 3), "strong");
    assert.equal(classifyHistory("Independent", 1), "strong");
    assert.equal(classifyHistory(null, 0), "none");
    assert.equal(classifyHistory("Not started", 0), "none");
    assert.equal(classifyHistory("Guided", 2), "some");
    assert.equal(classifyHistory("Needs review", 4), "some");
    assert.equal(classifyHistory(null, 1), "some");
  });
});

describe("lab report", () => {
  test("questions are trimmed, de-duplicated and capped at three; nothing usable falls back to fixed ones", () => {
    assert.deepEqual(cleanLabQuestions([" A? ", "a?", "", 4, "B?", "C?", "D?"]), ["A?", "B?", "C?"]);
    assert.equal(MAX_LAB_QUESTIONS, 3);
    assert.deepEqual(cleanLabQuestions(null), fallbackLabQuestions());
    assert.equal(fallbackLabQuestions().length, 3);
  });

  test("the report is graded as one numbered multi-part question", () => {
    assert.equal(labReportQuestion(["Q1?", "Q2?"]), "Lab report. Answer each part:\n1. Q1?\n2. Q2?");
    assert.equal(labReportAnswer(["TLS 1.3", " "]), "Part 1: TLS 1.3\n\nPart 2: (no answer)");
  });

  test("answers must be one string per question, at least one filled in, each bounded", () => {
    assert.deepEqual(labAnswersFor(["a", ""], 2), ["a", ""]);
    assert.equal(typeof labAnswersFor(["a"], 2), "string");
    assert.equal(typeof labAnswersFor(["", " "], 2), "string");
    assert.equal(typeof labAnswersFor(["a", 3], 2), "string");
    assert.equal(typeof labAnswersFor(["x".repeat(2001), "a"], 2), "string");
  });

  test("the lab text hash changes with the text, so edited labs get new questions", () => {
    assert.notEqual(labPromptHash("a"), labPromptHash("b"));
    assert.equal(labPromptHash("a").length, 32);
  });
});
