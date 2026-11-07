import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  answersSignature,
  assistNote,
  canSubmit,
  groupByUnit,
  labA11yLabel,
  labAccessBadge,
  labCountsByUnit,
  labDraftKey,
  labDraftPayload,
  labStateLabel,
  parseLabDraft,
  partA11yLabel,
  partRows,
  verdictMessage,
  LAB_PART_MAX,
  type LabListItem,
  type LabStepResult,
} from "./labs.ts";
import { localDataOwner } from "./localData.ts";

// REQ-123: lab list labels, per-part result rows, "not yet" wording, and
// the on-device draft.

const item = (over: Partial<LabListItem> = {}): LabListItem => ({
  id: "l1",
  kind: "case",
  title: "Who do you see first?",
  objectiveId: "o1",
  objectiveTitle: "Prioritising by acuity",
  unitId: "u1",
  unitTitle: "Management of Care",
  stepCount: 3,
  reviewStatus: "needs_expert_review",
  state: "new",
  stepsDone: 0,
  runsFinished: 0,
  lastVerdict: null,
  ...over,
});

describe("lab lists", () => {
  test("grouped by unit in server order, with counts", () => {
    const list = [item(), item({ id: "l2", unitId: "u2", unitTitle: "Safety" }), item({ id: "l3" })];
    assert.deepEqual(groupByUnit(list).map((g) => [g.unitTitle, g.labs.length]), [["Management of Care", 2], ["Safety", 1]]);
    assert.deepEqual(labCountsByUnit(list), { u1: 2, u2: 1 });
  });
  test("state labels never say failed", () => {
    assert.equal(labStateLabel(item()), "Not started: 3 steps");
    assert.equal(labStateLabel(item({ stepCount: 1 })), "Not started");
    assert.equal(labStateLabel(item({ state: "in_progress", stepsDone: 1 })), "In progress: step 2 of 3");
    assert.equal(labStateLabel(item({ state: "done", lastVerdict: "correct" })), "Done: every part met");
    assert.equal(labStateLabel(item({ state: "done", lastVerdict: "incorrect" })), "Done: worth another look later");
    for (const v of ["correct", "partial", "incorrect", null] as const) {
      assert.doesNotMatch(labStateLabel(item({ state: "done", lastVerdict: v })), /fail|wrong/i);
    }
  });
  test("the screen-reader label names kind, objective, state and review status", () => {
    const l = labA11yLabel(item());
    assert.match(l, /^Case lab: Who do you see first\?\. Objective: Prioritising by acuity\. Not started: 3 steps\. Not yet checked by a subject expert\.$/);
    assert.doesNotMatch(labA11yLabel(item({ reviewStatus: "approved" })), /subject expert/);
  });
});

const result = (scores: LabStepResult["partScores"]): LabStepResult => ({
  index: 0,
  verdict: "partial",
  feedback: "f",
  partScores: scores,
  missedParts: [],
  fixNext: null,
  answers: ["mine one", "mine two"],
  reference: [
    { label: "Priority", criteria: "c1", modelAnswer: "model one" },
    { label: "Action", criteria: "c2", modelAnswer: "model two" },
  ],
});

describe("per-part results", () => {
  test("rows follow the rubric order, with the learner's answer and the model answer", () => {
    const rows = partRows(result([{ part: "Action", score: "missed", comment: "c" }, { part: "Priority", score: "met", comment: "" }]), ["Priority", "Action"]);
    assert.deepEqual(rows.map((r) => [r.label, r.state, r.answer, r.modelAnswer]), [
      ["Priority", "met", "mine one", "model one"],
      ["Action", "missed", "mine two", "model two"],
    ]);
    assert.equal(partA11yLabel(rows[1], 1), "Part 2: Action. Not yet. c");
  });
  test("a part without a valid score is never shown as met", () => {
    const rows = partRows(result([{ part: "Something else", score: "met", comment: "" }]), ["Priority", "Action"]);
    assert.deepEqual(rows.map((r) => r.state), ["unscored", "unscored"]);
    assert.deepEqual(partRows(result([{ part: "Priority", score: "great", comment: "" }]), ["Priority"]).map((r) => r.state), ["unscored"]);
  });
  test("misses are framed as information", () => {
    assert.match(verdictMessage("incorrect", true), /^Not yet/);
    assert.doesNotMatch(verdictMessage("incorrect", true) + verdictMessage("partial", false), /fail|wrong|bad/i);
    assert.match(assistNote({ assisted: true, assistReason: "repeat" })!, /counts lightly/);
    assert.equal(assistNote({ assisted: false, assistReason: null }), null);
  });
});

describe("lab drafts", () => {
  test("keyed per user, lab, run and step under the draft prefix the logout sweep removes", () => {
    const k = labDraftKey("user-1", "lab.1", "run-1", 2);
    assert.equal(k, "ascendra.draft.lab.user-1.lab_1_run-1_2");
    assert.equal(localDataOwner(k), "user-1");
  });
  test("round-trips, trims to the part count and bounds each part; empty means nothing to keep", () => {
    const p = labDraftPayload({ parts: ["a", "b"], sentId: null, sentSig: null })!;
    assert.deepEqual(parseLabDraft(p, 3), { parts: ["a", "b", ""], sentId: null, sentSig: null });
    assert.equal(labDraftPayload({ parts: ["", " "], sentId: null, sentSig: null }), null);
    assert.ok(labDraftPayload({ parts: ["", ""], sentId: "id", sentSig: "s" }), "a sent id is kept so a resend replays");
    assert.equal(parseLabDraft("not json", 2), null);
    assert.equal(parseLabDraft(JSON.stringify({ parts: ["x".repeat(LAB_PART_MAX + 10)] }), 1)!.parts[0].length, LAB_PART_MAX);
  });
  test("the same answers (ignoring surrounding spaces) are the same submission; at least one part is needed", () => {
    assert.equal(answersSignature(0, [" a ", "b"]), answersSignature(0, ["a", "b "]));
    assert.notEqual(answersSignature(0, ["a"]), answersSignature(1, ["a"]));
    assert.equal(canSubmit(["", " "]), false);
    assert.equal(canSubmit(["", "x"]), true);
    assert.equal(canSubmit(["x".repeat(LAB_PART_MAX + 1)]), false);
  });
});

describe("REQ-124: lab access on Free and Plus", () => {
  test("the sample is labelled as a sample, other labs say which plan has them, nothing when all are open", () => {
    assert.equal(labAccessBadge("sample"), "Sample lab");
    assert.equal(labAccessBadge("locked"), "Part of Pro");
    assert.equal(labAccessBadge("full"), null);
    assert.equal(labAccessBadge(undefined), null, "an older server sends no access");
    assert.match(labA11yLabel(item({ access: "sample" })), /sample lab for this course/);
    assert.match(labA11yLabel(item({ access: "locked" })), /Part of the Pro plan/);
    assert.doesNotMatch(labA11yLabel(item({ access: "full" })), /plan/);
  });
});
