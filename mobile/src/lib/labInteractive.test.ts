// REQ-189: interactive lab parts on the device -- reading and writing each
// part's one answer string, the order moves (buttons and drag), one-to-one
// matching, select toggles, what is sent for an untouched order, marking a
// graded control against the key, and tolerance of payloads the app does
// not know.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  answerToSend,
  dragSteps,
  encodeMatch,
  encodeSelect,
  keyText,
  knownInput,
  matchFrom,
  matchMarks,
  moveItem,
  moveTo,
  orderFrom,
  orderItemA11y,
  orderMarks,
  partAnswered,
  selectFrom,
  selectLineA11y,
  selectMarks,
  setPair,
  toggleLine,
  type InteractiveInput,
} from "./labInteractive.ts";
import { answersSignature, canSubmit, parseLabDraft, labDraftPayload } from "./labs.ts";

const ORDER: Extract<InteractiveInput, { type: "order" }> = {
  type: "order",
  items: [
    { id: "c", text: "Contain" },
    { id: "a", text: "Identify" },
    { id: "b", text: "Eradicate" },
  ],
};
const MATCH: Extract<InteractiveInput, { type: "match" }> = {
  type: "match",
  left: [
    { id: "l1", text: "A" },
    { id: "l2", text: "B" },
  ],
  right: [
    { id: "r2", text: "Two" },
    { id: "r1", text: "One" },
    { id: "r3", text: "Three" },
  ],
  leftHeading: null,
  rightHeading: null,
};
const SELECT: Extract<InteractiveInput, { type: "select" }> = {
  type: "select",
  display: "log",
  header: null,
  lines: [
    { id: "L0", text: "ok" },
    { id: "L1", text: "FAIL" },
    { id: "L2", text: "ok" },
  ],
};

describe("order", () => {
  test("untouched shows the served order; a saved order is kept only if it lists exactly the served items", () => {
    assert.deepEqual(orderFrom("", ORDER), ["c", "a", "b"]);
    assert.deepEqual(orderFrom('["a","c","b"]', ORDER), ["a", "c", "b"]);
    assert.deepEqual(orderFrom('["a","c"]', ORDER), ["c", "a", "b"]);
    assert.deepEqual(orderFrom('["a","a","b"]', ORDER), ["c", "a", "b"]);
    assert.deepEqual(orderFrom('["a","c","zzz"]', ORDER), ["c", "a", "b"]);
    assert.deepEqual(orderFrom("not json", ORDER), ["c", "a", "b"]);
  });
  test("up/down buttons stop at the ends; a drag moves by whole rows", () => {
    assert.deepEqual(moveItem(["x", "y", "z"], 1, -1), ["y", "x", "z"]);
    assert.deepEqual(moveItem(["x", "y", "z"], 0, -1), ["x", "y", "z"]);
    assert.deepEqual(moveItem(["x", "y", "z"], 2, 1), ["x", "y", "z"]);
    assert.deepEqual(moveTo(["x", "y", "z"], 0, 2), ["y", "z", "x"]);
    assert.deepEqual(moveTo(["x", "y", "z"], 2, -5), ["z", "x", "y"]);
    assert.equal(dragSteps(80, 56), 1);
    assert.equal(dragSteps(-130, 56), -2);
    assert.equal(dragSteps(20, 56), 0);
    assert.equal(dragSteps(100, 0), 0);
  });
  test("an untouched order is still sent, as the order on screen, and counts as answered", () => {
    assert.equal(answerToSend("", ORDER), '["c","a","b"]');
    assert.ok(partAnswered("", ORDER));
    assert.ok(!partAnswered("", MATCH));
    assert.equal(answerToSend("written", null), "written");
  });
  test("each row is spoken with its position", () => {
    assert.equal(orderItemA11y("Contain", 0, 3), "Contain. Position 1 of 3.");
  });
});

describe("match", () => {
  test("one-to-one: a right item moves to the newest pairing; tapping the same pair clears it", () => {
    let p = setPair({}, "l1", "r1");
    p = setPair(p, "l2", "r1");
    assert.deepEqual(p, { l2: "r1" });
    p = setPair(p, "l2", "r1");
    assert.deepEqual(p, {});
    assert.equal(encodeMatch({}), "");
  });
  test("a saved answer drops pairs that name unknown items", () => {
    assert.deepEqual(matchFrom('{"l1":"r1","l9":"r2","l2":"nope"}', MATCH), { l1: "r1" });
    assert.deepEqual(matchFrom("[]", MATCH), {});
  });
});

describe("select", () => {
  test("toggles, and the answer is in display order whatever order the taps came in", () => {
    let s = toggleLine([], "L2");
    s = toggleLine(s, "L1");
    assert.equal(encodeSelect(s, SELECT), '["L1","L2"]');
    s = toggleLine(s, "L2");
    assert.deepEqual(s, ["L1"]);
    assert.equal(encodeSelect([], SELECT), "");
    assert.deepEqual(selectFrom('["L1","L1","L7"]', SELECT), ["L1"]);
  });
  test("a line says whether it is selected", () => {
    assert.equal(selectLineA11y("FAIL", 1, true), "Line 2: FAIL. Selected as a problem.");
  });
});

describe("after grading", () => {
  test("order marks say where each item belongs", () => {
    const m = orderMarks('["a","c","b"]', ORDER, { type: "order", order: ["a", "c", "b"] });
    assert.deepEqual(m.map((x) => x.mark), ["right", "right", "right"]);
    const w = orderMarks('["c","a","b"]', ORDER, { type: "order", order: ["a", "c", "b"] });
    assert.deepEqual(w.map((x) => [x.mark, x.should]), [["wrong", 2], ["wrong", 1], ["right", 3]]);
  });
  test("match and select marks name right, wrong and missed", () => {
    const m = matchMarks('{"l1":"r2"}', MATCH, { type: "match", pairs: { l1: "r1", l2: "r2" } });
    assert.deepEqual(m.map((x) => x.mark), ["wrong", "missed"]);
    assert.equal(m[0].want, "One");
    const s = selectMarks('["L0"]', SELECT, { type: "select", correct: ["L1"] });
    assert.deepEqual(s.map((x) => x.mark), ["wrong", "missed", "neutral"]);
  });
  test("key text for each type", () => {
    assert.equal(keyText({ type: "order", order: ["a", "c", "b"] }, ORDER), "1. Identify\n2. Contain\n3. Eradicate");
    assert.equal(keyText({ type: "command", accepted: ["ls -la", "ls -al"] }, { type: "command", prompt: "$" }), "ls -la\nAlso accepted: ls -al");
    assert.equal(keyText({ type: "numeric", answer: 4, tolerance: 0, unit: "days" }, { type: "numeric", unit: "days" }), "4 days");
    assert.equal(keyText({ type: "select", correct: ["L1"] }, SELECT), "Line 2: FAIL");
  });
});

describe("payloads the app does not know fall back to a text box", () => {
  test("unknown types and malformed inputs are null", () => {
    assert.equal(knownInput(null), null);
    assert.equal(knownInput({ type: "slider" }), null);
    assert.equal(knownInput({ type: "order", items: [{ id: 1, text: "x" }] }), null);
    assert.equal(knownInput({ type: "match", left: [] }), null);
    assert.deepEqual(knownInput(ORDER), ORDER);
    assert.deepEqual(knownInput({ type: "numeric", unit: null }), { type: "numeric", unit: null });
  });
});

describe("drafts and submission are unchanged for interactive answers", () => {
  test("an interactive answer round-trips through the lab draft and the resend signature", () => {
    const parts = ['["a","c","b"]', "12,500", ""];
    const d = parseLabDraft(labDraftPayload({ parts, sentId: null, sentSig: null }), 3)!;
    assert.deepEqual(d.parts, parts);
    assert.equal(answersSignature(0, parts), answersSignature(0, [...parts]));
    assert.ok(canSubmit(parts));
  });
});
