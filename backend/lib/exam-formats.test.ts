process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  answerText,
  attemptQuestionText,
  examFormatsFromText,
  examQuestionCount,
  gradeItem,
  isComplete,
  itemOrders,
  publicItem,
  responseFromShown,
  responseToShown,
  revealFor,
  validateExhibit,
  validateItemDraft,
  type StoredExamItem,
} from "./exam-formats";

const ALL = ["multiple_choice", "multiple_response", "ordering", "matching"] as const;

function item(over: Partial<StoredExamItem>): StoredExamItem {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    objectiveId: "22222222-2222-2222-2222-222222222222",
    format: "multiple_choice",
    stem: "Which?",
    body: { choices: ["a", "b", "c", "d"] },
    answerKey: { correct: [2] },
    explanation: "c because",
    exhibit: null,
    ...over,
  };
}

const MR = item({
  format: "multiple_response",
  stem: "Which two? (Choose two.)",
  body: { choices: ["a", "b", "c", "d", "e"], selectCount: 2 },
  answerKey: { correct: [1, 3] },
});
const ORD = item({
  format: "ordering",
  stem: "Order the incident response phases.",
  body: { steps: ["Preparation", "Detection", "Containment", "Eradication", "Recovery"] },
  answerKey: { order: [0, 1, 2, 3, 4] },
});
const MATCH = item({
  format: "matching",
  stem: "Match each control type to an example.",
  body: { prompts: ["Preventive", "Detective", "Corrective"], responses: ["IDS alert", "Firewall rule", "Restore from backup"] },
  answerKey: { matches: [1, 0, 2] },
});

// Shown positions that answer the item perfectly, for this user's shuffle.
function shownCorrect(it: StoredExamItem, user: string) {
  const o = itemOrders(user, it);
  return { o, shown: revealFor(it, o).correct };
}

describe("examFormatsFromText: only the formats the exam uses", () => {
  test("AWS associate: multiple choice + multiple response only", () => {
    assert.deepEqual(examFormatsFromText("65 questions (50 scored, 15 unscored); multiple choice and multiple response"), {
      formats: ["multiple_choice", "multiple_response"],
      exhibits: false,
    });
  });
  test("AWS with ordering and matching", () => {
    assert.deepEqual(
      examFormatsFromText("65 questions (50 scored, 15 unscored); multiple choice, multiple response, ordering, and matching").formats,
      ["multiple_choice", "multiple_response", "ordering", "matching"]
    );
  });
  test("a format list without multiple choice leaves it out", () => {
    assert.deepEqual(examFormatsFromText("65 questions; multiple response and matching").formats, ["multiple_response", "matching"]);
  });
  test("CompTIA Security+: drag-and-drop gives ordering and matching; performance-based allows exhibits", () => {
    assert.deepEqual(
      examFormatsFromText("Maximum 90 questions; multiple choice (single/multiple response), drag-and-drop, and performance-based"),
      { formats: ["multiple_choice", "multiple_response", "ordering", "matching"], exhibits: true }
    );
  });
  test("plain multiple choice, and no exam at all, are multiple choice only", () => {
    assert.deepEqual(examFormatsFromText("Maximum 70 questions; multiple choice"), { formats: ["multiple_choice"], exhibits: false });
    assert.deepEqual(examFormatsFromText(null), { formats: ["multiple_choice"], exhibits: false });
    assert.deepEqual(examFormatsFromText("Program coursework and clinical evaluation").formats, ["multiple_choice"]);
  });
  test("GCP multiple select and case studies", () => {
    assert.deepEqual(
      examFormatsFromText("50-60 questions; multiple choice and multiple response; includes 2 case studies"),
      { formats: ["multiple_choice", "multiple_response"], exhibits: true }
    );
    assert.deepEqual(examFormatsFromText("50-60 questions; multiple choice and multiple select").formats, [
      "multiple_choice",
      "multiple_response",
    ]);
  });
});

describe("examQuestionCount", () => {
  test("reads the exam length, not a scored part", () => {
    assert.equal(examQuestionCount("65 questions (50 scored, 15 unscored); multiple choice"), 65);
    assert.equal(examQuestionCount("Maximum 90 questions; multiple choice and performance-based"), 90);
    assert.equal(examQuestionCount("50-60 questions; multiple choice and multiple select"), 60);
    assert.equal(examQuestionCount("180 items (140 scored, 40 unscored pretest) in 4 sections"), 180);
    assert.equal(examQuestionCount("150 multiple-choice items in 3 hours: 125 scored and 25 unscored pretest items."), 150);
    assert.equal(examQuestionCount("140 scored and 15 unscored multiple-choice items in three hours"), null);
    assert.equal(examQuestionCount("Microsoft does not publish an exact question count"), null);
    assert.equal(examQuestionCount(null), null);
  });
});

describe("validateItemDraft", () => {
  const ok = (raw: Record<string, unknown>) => validateItemDraft(raw, [...ALL], true);
  test("accepts each format and builds its key", () => {
    const mc = ok({ format: "multiple_choice", stem: "Q", choices: ["a", "b", "c", "d"], correct: [3], explanation: "e" });
    assert.ok(typeof mc !== "string");
    assert.deepEqual(mc.answerKey, { correct: [3] });
    const mr = ok({ format: "multiple_response", stem: "Q (Choose two.)", choices: ["a", "b", "c", "d", "e"], correct: [4, 1], explanation: "e" });
    assert.ok(typeof mr !== "string");
    assert.deepEqual(mr.answerKey, { correct: [1, 4] });
    assert.deepEqual(mr.body, { choices: ["a", "b", "c", "d", "e"], selectCount: 2 });
    const ord = ok({ format: "ordering", stem: "Q", steps: ["1", "2", "3"], explanation: "e" });
    assert.ok(typeof ord !== "string");
    assert.deepEqual(ord.answerKey, { order: [0, 1, 2] });
    const m = ok({ format: "matching", stem: "Q", prompts: ["p1", "p2", "p3"], responses: ["r1", "r2", "r3", "r4"], matches: [3, 0, 1], explanation: "e" });
    assert.ok(typeof m !== "string");
    assert.deepEqual(m.answerKey, { matches: [3, 0, 1] });
  });
  test("rejects inconsistent keys and shapes", () => {
    const bad = [
      { format: "multiple_choice", stem: "Q", choices: ["a", "b", "c", "d"], correct: [0, 1], explanation: "e" },
      { format: "multiple_choice", stem: "Q", choices: ["a", "b", "c", "d"], correct: [4], explanation: "e" },
      { format: "multiple_choice", stem: "Q", choices: ["a", "a", "c", "d"], correct: [0], explanation: "e" },
      { format: "multiple_choice", stem: "Q", choices: ["a", "b", "c", "d"], correct: [0], explanation: "" },
      { format: "multiple_response", stem: "Q", choices: ["a", "b", "c", "d", "e"], correct: [1], explanation: "e" },
      { format: "multiple_response", stem: "Q", choices: ["a", "b", "c", "d"], correct: [0, 1], explanation: "e" },
      { format: "multiple_response", stem: "Q", choices: ["a", "b", "c", "d", "e"], correct: [1, 1], explanation: "e" },
      { format: "ordering", stem: "Q", steps: ["1", "2"], explanation: "e" },
      { format: "matching", stem: "Q", prompts: ["p1", "p2", "p3"], responses: ["r1", "r2", "r3"], matches: [0, 1], explanation: "e" },
      { format: "essay", stem: "Q", explanation: "e" },
    ];
    for (const b of bad) assert.equal(typeof ok(b), "string", JSON.stringify(b));
  });
  test("only the exam's formats, and exhibits only when the exam uses them", () => {
    const ord = { format: "ordering", stem: "Q", steps: ["1", "2", "3"], explanation: "e" };
    assert.match(String(validateItemDraft(ord, ["multiple_choice", "multiple_response"], false)), /not used by this exam/);
    const withExhibit = {
      format: "multiple_choice",
      stem: "Q",
      choices: ["a", "b", "c", "d"],
      correct: [0],
      explanation: "e",
      exhibit: { kind: "log", title: "auth.log", text: "Failed password for root from 203.0.113.9" },
    };
    assert.match(String(validateItemDraft(withExhibit, ["multiple_choice"], false)), /exhibits/);
    const accepted = validateItemDraft(withExhibit, ["multiple_choice"], true);
    assert.ok(typeof accepted !== "string" && accepted.exhibit?.kind === "log");
  });
});

describe("validateExhibit", () => {
  test("policy must be valid JSON and is pretty-printed", () => {
    assert.equal(typeof validateExhibit({ kind: "policy", title: "p", text: "{not json" }), "string");
    const ok = validateExhibit({ kind: "policy", title: "p", text: '{"Version":"2012-10-17","Statement":[]}' });
    assert.ok(ok && typeof ok !== "string");
    assert.match(ok.text!, /\n  "Statement"/);
  });
  test("table rows must match the header", () => {
    assert.equal(typeof validateExhibit({ kind: "table", title: "t", columns: ["Rule", "Action"], rows: [["1"]] }), "string");
    const ok = validateExhibit({ kind: "table", title: "t", columns: ["Rule", "Action"], rows: [["1", "DENY"]] });
    assert.ok(ok && typeof ok !== "string" && ok.rows!.length === 1);
  });
  test("unknown kinds are rejected", () => {
    assert.equal(typeof validateExhibit({ kind: "image", title: "x", text: "y" }), "string");
  });
});

describe("per-learner shuffle and keys", () => {
  test("the public item never carries the key or explanation", () => {
    for (const it of [item({}), MR, ORD, MATCH]) {
      const p = publicItem(it, itemOrders("u1", it));
      const json = JSON.stringify(p);
      assert.doesNotMatch(json, /correct|answerKey|matches|explanation|"order"/);
      assert.ok(!("explanation" in p));
    }
  });
  test("the order is stable per learner and is a permutation", () => {
    const a = itemOrders("u1", MR);
    assert.deepEqual(a, itemOrders("u1", MR));
    assert.deepEqual([...a.choices!].sort(), [0, 1, 2, 3, 4]);
  });
  test("different learners usually see different orders", () => {
    const seen = new Set(Array.from({ length: 12 }, (_, i) => itemOrders(`user-${i}`, ORD).steps!.join("")));
    assert.ok(seen.size > 3);
  });
  test("an ordering item is never shown already in the right order", () => {
    for (let i = 0; i < 200; i++) {
      const o = itemOrders(`u-${i}`, item({ ...ORD, body: { steps: ["a", "b", "c"] }, answerKey: { order: [0, 1, 2] } }));
      assert.notDeepEqual(o.steps, [0, 1, 2]);
    }
  });
});

describe("grading (exact match on the server)", () => {
  test("multiple choice: right shown position is correct, others incorrect", () => {
    const it = item({});
    const { o, shown } = shownCorrect(it, "u1");
    const right = responseFromShown(it, o, { choice: (shown as { choices: number[] }).choices[0] });
    assert.ok(typeof right !== "string");
    assert.deepEqual(gradeItem(it, right), { verdict: "correct", credited: true, partial: 1 });
    const wrongPos = [0, 1, 2, 3].find((p) => p !== (shown as { choices: number[] }).choices[0])!;
    const wrong = responseFromShown(it, o, { choice: wrongPos });
    assert.ok(typeof wrong !== "string");
    assert.equal(gradeItem(it, wrong).verdict, "incorrect");
  });
  test("multiple response is all-or-nothing, with option-level partial stored apart", () => {
    const { o, shown } = shownCorrect(MR, "u2");
    const both = responseFromShown(MR, o, shown);
    assert.ok(typeof both !== "string");
    assert.deepEqual(gradeItem(MR, both), { verdict: "correct", credited: true, partial: 1 });
    // one right, one wrong: 3 of 5 options classified right
    const oneRight = { choices: [1, 0] }; // stored
    assert.deepEqual(gradeItem(MR, oneRight), { verdict: "incorrect", credited: false, partial: 0.6 });
    // only one picked: 4 of 5 classified right, still not credited
    assert.deepEqual(gradeItem(MR, { choices: [1] }), { verdict: "incorrect", credited: false, partial: 0.8 });
  });
  test("multiple response refuses more picks than asked and duplicates", () => {
    const o = itemOrders("u2", MR);
    assert.equal(typeof responseFromShown(MR, o, { choices: [0, 1, 2] }), "string");
    assert.equal(typeof responseFromShown(MR, o, { choices: [0, 0] }), "string");
  });
  test("ordering: partial credit by positions", () => {
    assert.deepEqual(gradeItem(ORD, { order: [0, 1, 2, 3, 4] }), { verdict: "correct", credited: true, partial: 1 });
    // swap the last two: 3 of 5 positions right -> partial
    assert.deepEqual(gradeItem(ORD, { order: [0, 1, 2, 4, 3] }), { verdict: "partial", credited: false, partial: 0.6 });
    // reversed: only the middle is right
    assert.deepEqual(gradeItem(ORD, { order: [4, 3, 2, 1, 0] }), { verdict: "incorrect", credited: false, partial: 0.2 });
  });
  test("ordering from shown positions maps back through the shuffle", () => {
    const { o, shown } = shownCorrect(ORD, "u3");
    const stored = responseFromShown(ORD, o, shown);
    assert.ok(typeof stored !== "string");
    assert.deepEqual(stored.order, [0, 1, 2, 3, 4]);
    assert.equal(typeof responseFromShown(ORD, o, { order: [0, 1, 2, 3] }), "string");
    assert.equal(typeof responseFromShown(ORD, o, { order: [0, 0, 1, 2, 3] }), "string");
  });
  test("matching: partial credit by pairs, partly answered allowed while saving", () => {
    assert.deepEqual(gradeItem(MATCH, { matches: [1, 0, 2] }), { verdict: "correct", credited: true, partial: 1 });
    assert.deepEqual(gradeItem(MATCH, { matches: [1, 0, null] }), { verdict: "partial", credited: false, partial: 0.6667 });
    assert.deepEqual(gradeItem(MATCH, { matches: [0, 1, null] }), { verdict: "incorrect", credited: false, partial: 0 });
    const { o, shown } = shownCorrect(MATCH, "u4");
    const stored = responseFromShown(MATCH, o, shown);
    assert.ok(typeof stored !== "string");
    assert.deepEqual(stored.matches, [1, 0, 2]);
    const partial = responseFromShown(MATCH, o, { matches: [null, null, null] });
    assert.ok(typeof partial !== "string");
    assert.equal(isComplete(MATCH, partial), false);
  });
  test("no answer is incorrect", () => {
    for (const it of [item({}), MR, ORD, MATCH]) assert.equal(gradeItem(it, null).verdict, "incorrect");
  });
  test("a saved answer round-trips to the same shown positions", () => {
    for (const it of [item({}), MR, ORD, MATCH]) {
      const { o, shown } = shownCorrect(it, "u5");
      const stored = responseFromShown(it, o, it.format === "multiple_choice" ? { choice: (shown as { choices: number[] }).choices[0] } : shown);
      assert.ok(typeof stored !== "string");
      const back = responseToShown(it, o, stored);
      assert.deepEqual(back, it.format === "multiple_choice" ? { choice: (shown as { choices: number[] }).choices[0] } : shown);
    }
  });
});

describe("attempt text", () => {
  test("two matching items with the same stem record different questions", () => {
    const other = item({ ...MATCH, body: { prompts: ["Deterrent", "Detective", "Corrective"], responses: ["Sign", "Log review", "Patch"] } });
    assert.notEqual(attemptQuestionText(MATCH), attemptQuestionText(other));
    assert.equal(attemptQuestionText(item({})), "Which?");
  });
  test("ordering question text doesn't reveal the right order", () => {
    assert.doesNotMatch(attemptQuestionText(ORD), /Preparation \| Detection \| Containment \| Eradication \| Recovery/);
  });
  test("answers read as text", () => {
    assert.equal(answerText(MR, { choices: [1, 3] }), "b; d");
    assert.equal(answerText(ORD, { order: [1, 0, 2, 3, 4] }), "Detection -> Preparation -> Containment -> Eradication -> Recovery");
    assert.equal(answerText(MATCH, { matches: [1, null, 2] }), "Preventive -> Firewall rule; Detective -> ?; Corrective -> Restore from backup");
  });
});
