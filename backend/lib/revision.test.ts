// REQ-105: the pure pieces of "explain every option, then revise once".
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { partsToRevise, retryRefusal } from "./revision";
import { optionReasonsFor } from "./lesson-store";
import { presentationOrder, shuffleForPresentation } from "./choice-order";

describe("partsToRevise", () => {
  const parts = ["Identify the threat", "Pick a control", "Write the ticket"];
  test("keeps the scenario's own labels the attempt missed, in scenario order, ignoring case and spacing", () => {
    assert.deepEqual(partsToRevise(parts, ["write the  ticket", " Identify the threat "]), [
      "Identify the threat",
      "Write the ticket",
    ]);
  });
  test("no usable list (incorrect with none named, reworded labels, junk) revises every sub-part", () => {
    assert.deepEqual(partsToRevise(parts, []), parts);
    assert.deepEqual(partsToRevise(parts, ["the second bit"]), parts);
    assert.deepEqual(partsToRevise(parts, null), parts);
    assert.deepEqual(partsToRevise(parts, [3, null]), parts);
  });
});

describe("retryRefusal", () => {
  const target = {
    id: "a",
    kind: "lesson",
    stage: "solo",
    format: "open",
    question: "q",
    objective_id: "o",
    pbq_scenario_id: null,
    verdict: "incorrect",
    missed_parts: [],
  };
  test("maps each lookup to its status code; ok + same item goes ahead", async () => {
    assert.equal(retryRefusal({ status: "not-found" }, () => true)?.status, 404);
    assert.equal(retryRefusal({ status: "is-revision" }, () => true)?.status, 400);
    assert.equal(retryRefusal({ status: "not-a-miss" }, () => true)?.status, 400);
    assert.equal(retryRefusal({ status: "already-revised" }, () => true)?.status, 409);
    assert.equal(retryRefusal({ status: "ok", target }, () => false)?.status, 400);
    assert.equal(retryRefusal({ status: "ok", target }, () => true), null);
  });
});

describe("optionReasonsFor", () => {
  test("only a full list of non-empty strings, one per choice, is kept", () => {
    const choices = ["a", "b", "c", "d"];
    assert.deepEqual(optionReasonsFor(["1", "2", "3", "4"], choices), ["1", "2", "3", "4"]);
    assert.equal(optionReasonsFor(["1", "2", "3"], choices), null);
    assert.equal(optionReasonsFor(["1", "2", "", "4"], choices), null);
    assert.equal(optionReasonsFor(null, choices), null);
    assert.equal(optionReasonsFor(["1", 2, "3", "4"], choices), null);
  });
  test("shuffled with the same order as the choices, each reason stays with its option", () => {
    const choices = ["right", "w1", "w2", "w3"];
    const reasons = choices.map((c) => `why ${c}`);
    const order = presentationOrder("seed-x", 4);
    const shownChoices = shuffleForPresentation(choices, order);
    const shownReasons = shuffleForPresentation(reasons, order);
    shownChoices.forEach((c, i) => assert.equal(shownReasons[i], `why ${c}`));
  });
});
