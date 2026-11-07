import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PBQ_ANSWER_MAX, PBQ_SUB_PARTS_MAX, parsePbqPayload, pbqPayload, type PbqSnapshot } from "./pbqProgress.ts";
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
