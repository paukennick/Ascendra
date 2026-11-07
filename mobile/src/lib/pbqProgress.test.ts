import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PBQ_ANSWER_MAX,
  PBQ_SUB_PARTS_MAX,
  parsePbqPayload,
  pbqPartRows,
  pbqPartSummary,
  pbqPayload,
  type PbqSnapshot,
} from "./pbqProgress.ts";
import { DRAFT_MAX_AGE_MS, decodeDraft, encodeDraft } from "./drafts.ts";

const now = 1_800_000_000_000;
const snap = (over: Partial<PbqSnapshot> = {}): PbqSnapshot => ({
  unitId: "u1",
  scenario: {
    id: "sc-1",
    unit_id: "u1",
    title: "Lock down a bucket",
    scenario: "A bucket is public...",
    sub_parts: ["Block public access", "Enable logging"],
    generated_at: "2026-11-01T00:00:00Z",
  },
  answer: "I would enable block public access",
  result: null,
  clientAttemptId: null,
  sentSignature: null,
  ...over,
});
const raw = (s: unknown) => JSON.stringify(s);

describe("PBQ snapshot", () => {
  // REQ-105
  test("keeps the model answer, fix line, attempt id and the first result of a revision", () => {
    const first = {
      verdict: "partial" as const,
      feedback: "Missed logging.",
      classification: "gap",
      missedParts: ["Enable logging"],
      modelAnswer: "1. Block public access: ... 2. Enable logging: ...",
      fixNext: "Turn on server access logging.",
      attempt: { id: "att-1" },
    };
    const s = parsePbqPayload(
      pbqPayload(
        snap({
          firstResult: first,
          result: { verdict: "correct", feedback: "ok", classification: "none", missedParts: [], assistReason: "retry", revisedParts: ["Enable logging"] },
        })
      )!,
      "u1"
    );
    assert.equal(s?.firstResult?.modelAnswer, first.modelAnswer);
    assert.equal(s?.firstResult?.fixNext, first.fixNext);
    assert.equal(s?.firstResult?.attempt?.id, "att-1");
    assert.equal(s?.result?.assistReason, "retry");
    assert.deepEqual(s?.result?.revisedParts, ["Enable logging"]);
    // A draft saved before REQ-105 has no firstResult and still restores.
    assert.equal(parsePbqPayload(pbqPayload(snap())!, "u1")?.firstResult, null);
  });
  test("restores the scenario and the unsent answer for the same unit", () => {
    const s = parsePbqPayload(pbqPayload(snap())!, "u1");
    assert.equal(s?.scenario.id, "sc-1");
    assert.equal(s?.scenario.sub_parts.length, 2);
    assert.equal(s?.answer, "I would enable block public access");
    assert.equal(s?.result, null);
  });
  test("restores a graded result and the attempt id it was sent with", () => {
    const withResult = snap({
      result: { verdict: "partial", feedback: "Missed logging.", classification: "gap", missedParts: ["Enable logging"] },
      clientAttemptId: "id-123456",
      sentSignature: "pbq:sc-1:I would enable block public access",
    });
    const s = parsePbqPayload(pbqPayload(withResult)!, "u1");
    assert.equal(s?.result?.verdict, "partial");
    assert.deepEqual(s?.result?.missedParts, ["Enable logging"]);
    assert.equal(s?.clientAttemptId, "id-123456");
    assert.equal(s?.sentSignature, "pbq:sc-1:I would enable block public access");
  });
  test("is discarded when it belongs to a different unit", () => {
    assert.equal(parsePbqPayload(pbqPayload(snap())!, "u2"), null);
    // A scenario whose own unit_id disagrees with the snapshot's is not trusted either.
    const mixed = snap();
    mixed.scenario.unit_id = "u9";
    assert.equal(parsePbqPayload(pbqPayload(mixed)!, "u1"), null);
  });
  test("is discarded when the scenario is malformed", () => {
    assert.equal(parsePbqPayload("{nope", "u1"), null);
    assert.equal(parsePbqPayload("null", "u1"), null);
    assert.equal(parsePbqPayload(raw({ unitId: "u1" }), "u1"), null);
    assert.equal(parsePbqPayload(raw({ ...snap(), scenario: { ...snap().scenario, id: "" } }), "u1"), null);
    assert.equal(parsePbqPayload(raw({ ...snap(), scenario: { ...snap().scenario, sub_parts: "a,b" } }), "u1"), null);
    assert.equal(parsePbqPayload(raw({ ...snap(), scenario: { ...snap().scenario, sub_parts: [1, 2] } }), "u1"), null);
    assert.equal(
      parsePbqPayload(raw({ ...snap(), scenario: { ...snap().scenario, sub_parts: new Array(PBQ_SUB_PARTS_MAX + 1).fill("x") } }), "u1"),
      null
    );
  });
  test("drops an unknown verdict but keeps the scenario and answer", () => {
    const s = parsePbqPayload(raw({ ...snap(), result: { verdict: "excellent", feedback: "x" } }), "u1");
    assert.equal(s?.result, null);
    assert.equal(s?.scenario.id, "sc-1");
  });
  test("bounds an oversized answer and ignores wrong-typed ids", () => {
    const s = parsePbqPayload(raw({ ...snap(), answer: "a".repeat(PBQ_ANSWER_MAX + 5), clientAttemptId: 7, sentSignature: {} }), "u1");
    assert.equal(s?.answer.length, PBQ_ANSWER_MAX);
    assert.equal(s?.clientAttemptId, null);
    assert.equal(s?.sentSignature, null);
  });
  test("no scenario means nothing is stored (clears on Change unit / Try another)", () => {
    assert.equal(pbqPayload(null), null);
  });
  test("a week-old snapshot is rejected by the draft envelope before parsing", () => {
    const payload = pbqPayload(snap())!;
    assert.notEqual(decodeDraft(encodeDraft(payload, now - 1000), now), null);
    assert.equal(decodeDraft(encodeDraft(payload, now - DRAFT_MAX_AGE_MS - 1), now), null);
  });
});

// REQ-107: per-part scores on the graded result.
describe("PBQ per-part rows", () => {
  const parts = ["Block public access", "Enable logging", "Rotate keys"];
  const grade = { verdict: "partial" as const, feedback: "f", classification: "incomplete", missedParts: ["Rotate keys"] };

  test("before grading every part is pending and there is no summary", () => {
    const rows = pbqPartRows(parts, null);
    assert.deepEqual(rows.map((r) => r.state), ["pending", "pending", "pending"]);
    assert.equal(pbqPartSummary(rows), null);
  });
  test("uses the grader's per-part scores and comments when present", () => {
    const rows = pbqPartRows(parts, {
      ...grade,
      partScores: [
        { part: parts[0], score: "met", comment: "right setting" },
        { part: parts[1], score: "partial", comment: "no retention" },
        { part: parts[2], score: "missed", comment: "" },
      ],
    });
    assert.deepEqual(rows.map((r) => r.state), ["met", "partial", "missed"]);
    assert.equal(rows[1].comment, "no retention");
    assert.equal(pbqPartSummary(rows), "1 of 3 parts met, 1 partly");
  });
  test("falls back to missedParts (case and spacing ignored) without scores", () => {
    for (const partScores of [undefined, null, [{ part: "x", score: "met" as const, comment: "" }]]) {
      const rows = pbqPartRows(parts, { ...grade, missedParts: [" rotate KEYS"], partScores });
      assert.deepEqual(rows.map((r) => r.state), ["met", "met", "missed"]);
    }
    assert.equal(pbqPartSummary(pbqPartRows(parts, grade)), "2 of 3 parts met");
  });
  test("a saved result keeps valid part scores and drops malformed ones", () => {
    const partScores = [
      { part: "Block public access", score: "met", comment: "ok" },
      { part: "Enable logging", score: "missed", comment: "" },
    ];
    const kept = parsePbqPayload(raw({ ...snap(), result: { ...grade, partScores } }), "u1");
    assert.deepEqual(kept?.result?.partScores, partScores);
    const bad = parsePbqPayload(
      raw({ ...snap(), result: { ...grade, partScores: [{ part: "x", score: "great", comment: "" }] } }),
      "u1"
    );
    assert.equal(bad?.result?.partScores, null);
    assert.equal(bad?.result?.verdict, "partial", "the rest of the result survives");
  });
});
