// REQ-262: the beginner lesson version in the app (src/lib/teachSteps.ts), the
// lesson screen's use of it, and the pins against the server's values.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  beginnerSteps,
  exampleCardsOnly,
  isLessonChanged,
  lessonVariantFields,
  SKIP_CHECK_LABEL,
  stepCheckFeedback,
  stepsProgress,
  type TeachStepData,
} from "./teachSteps.ts";
import { reportBody } from "./reportProblem.ts";
import type { TeachCards } from "./lessonExperience.ts";

const check = { question: "Which is a variable?", choices: ["a name for a value", "a loop", "a file", "a bug"], correctIndex: 0, reasons: ["Yes: a name for a value.", "No: a loop repeats.", "No: a file stores data.", "No: a bug is a defect."] };
const step = (n: number): TeachStepData => ({ title: `Step ${n}`, plain: "plain", example: "everyday", precise: "exam wording", check });
const payload = (n = 3) => ({ version: "beginner", teachSteps: Array.from({ length: n }, (_, i) => step(i + 1)) });

describe("which lessons show steps", () => {
  test("a beginner payload with 3 to 5 good steps does", () => {
    for (const n of [3, 4, 5]) assert.equal(beginnerSteps(payload(n))?.length, n);
  });
  test("a standard payload, too few or too many steps, or a bad step does not", () => {
    assert.equal(beginnerSteps({ teachSteps: payload().teachSteps }), null, "no version marker");
    assert.equal(beginnerSteps({ version: "standard", teachSteps: payload().teachSteps }), null);
    assert.equal(beginnerSteps(payload(2)), null);
    assert.equal(beginnerSteps(payload(6)), null);
    assert.equal(beginnerSteps({ version: "beginner" }), null);
    assert.equal(beginnerSteps(null), null);
    const bad = (mut: (s: Record<string, unknown>) => void) => {
      const p = payload();
      mut((p.teachSteps[1] as unknown) as Record<string, unknown>);
      return beginnerSteps(p);
    };
    assert.equal(bad((s) => { s.plain = ""; }), null);
    assert.equal(bad((s) => { s.check = { ...check, correctIndex: 9 }; }), null);
    assert.equal(bad((s) => { s.check = { ...check, reasons: ["only one"] }; }), null);
    assert.equal(bad((s) => { s.check = { ...check, choices: ["a"], reasons: ["x"] }; }), null);
    assert.equal(bad((s) => { s.check = null; }), null);
  });
});

describe("the version the requests name", () => {
  test("'new' only for a beginner payload; nothing for a standard lesson, so older servers see no new field", () => {
    assert.deepEqual(lessonVariantFields(payload()), { lessonVariant: "new" });
    assert.deepEqual(lessonVariantFields({ teach: "x" }), {});
    assert.deepEqual(lessonVariantFields(null), {});
  });
  test("a lesson report names it", () => {
    const body = reportBody({ kind: "lesson", objectiveId: "o", stage: "fade", lessonVariant: "new" }, "unclear", "");
    assert.equal(body.lessonVariant, "new");
    assert.equal(reportBody({ kind: "lesson", objectiveId: "o", stage: "fade" }, "unclear", "").lessonVariant, undefined);
  });
});

describe("the quick check's feedback", () => {
  test("a right pick says why it is right; a wrong pick says why it is wrong and why the right one is", () => {
    const right = stepCheckFeedback(check, 0)!;
    assert.equal(right.correct, true);
    assert.equal(right.reason, check.reasons[0]);
    assert.equal(right.rightReason, null);
    const wrong = stepCheckFeedback(check, 2)!;
    assert.equal(wrong.correct, false);
    assert.equal(wrong.reason, check.reasons[2]);
    assert.equal(wrong.rightReason, check.reasons[0]);
    assert.equal(wrong.correctIndex, 0);
  });
  test("an out-of-range pick has no feedback", () => {
    for (const i of [-1, 4, 1.5, NaN]) assert.equal(stepCheckFeedback(check, i), null);
  });
  test("progress is clamped and labeled in words", () => {
    assert.deepEqual(stepsProgress(0, 4), { index: 0, total: 4, isLast: false, label: "Step 1 of 4" });
    assert.equal(stepsProgress(3, 4).isLast, true);
    assert.equal(stepsProgress(99, 4).index, 3);
    assert.equal(stepsProgress(-2, 4).index, 0);
  });
  test("the skip link is named 'Skip check'", () => {
    assert.equal(SKIP_CHECK_LABEL, "Skip check");
  });
});

describe("the cards after the steps", () => {
  const cards: TeachCards = {
    cards: [
      { kind: "definition", title: "What it is", body: "d" },
      { kind: "why", title: "Why", body: "w" },
      { kind: "example", title: "Worked example", body: "e", steps: ["one", "two"] },
      { kind: "mistake", title: "Mistake", body: "m" },
    ],
    selfExplain: { step: 1, question: "Why?", modelExplanation: "Because." },
  };
  test("only the worked example stays, with its self-explanation", () => {
    const out = exampleCardsOnly(cards)!;
    assert.deepEqual(out.cards.map((c) => c.kind), ["example"]);
    assert.equal(out.selfExplain?.question, "Why?");
  });
  test("no example card, or no cards, leaves nothing", () => {
    assert.equal(exampleCardsOnly({ cards: [cards.cards[0]], selfExplain: null }), null);
    assert.equal(exampleCardsOnly(null), null);
  });
});

describe("the 409 the server sends when the version is gone", () => {
  test("only a 409 with code lesson_changed", () => {
    assert.equal(isLessonChanged({ status: 409, data: { code: "lesson_changed" } }), true);
    assert.equal(isLessonChanged({ status: 409, data: { code: "other" } }), false);
    assert.equal(isLessonChanged({ status: 409, data: null }), false);
    assert.equal(isLessonChanged({ status: 400, data: { code: "lesson_changed" } }), false);
    assert.equal(isLessonChanged(new Error("x")), false);
    assert.equal(isLessonChanged(null), false);
  });
});

describe("the app and the server agree", () => {
  const client = readFileSync(new URL("../api/client.ts", import.meta.url), "utf8");
  const serverProtocol = readFileSync(new URL("../../../backend/lib/client-protocol.ts", import.meta.url), "utf8");
  const lessonSrc = readFileSync(new URL("../../app/(app)/course/[trackId]/lesson/[objectiveId].tsx", import.meta.url), "utf8");
  test("the app speaks at least the protocol the server needs to serve a beginner version", () => {
    const need = Number(/LESSON_VARIANT_PROTOCOL = (\d+)/.exec(serverProtocol)?.[1]);
    const have = Number(/export const CLIENT_PROTOCOL = (\d+)/.exec(client)?.[1]);
    assert.ok(need >= 3 && have >= need, `app protocol ${have}, server needs ${need}`);
  });
  test("the lesson screen names the version on grade, hint and report, and handles the 409", () => {
    assert.match(lessonSrc, /stage: "solo", \.\.\.variantFields/);
    assert.match(lessonSrc, /confidence,\s*\n\s*\.\.\.variantFields,/);
    assert.match(lessonSrc, /stage: kind, \.\.\.variantFields/);
    assert.match(lessonSrc, /isLessonChanged\(err\)/);
    assert.match(lessonSrc, /retryLabel="Reload lesson"/);
  });
  test("a beginner lesson's events do not claim a lesson order", () => {
    assert.match(lessonSrc, /const hasCards = !!\(lesson && usableCards\(lesson\.teachCards\)\) && !steps;/);
  });
  test("the screen shows the steps before the cards and the quick check can always be skipped", () => {
    assert.match(lessonSrc, /steps && !stepsDone \?/);
    const comp = readFileSync(new URL("../components/teachSteps.tsx", import.meta.url), "utf8");
    assert.match(comp, /label=\{SKIP_CHECK_LABEL\}/);
    assert.match(comp, /!resolved \?/);
  });
});
