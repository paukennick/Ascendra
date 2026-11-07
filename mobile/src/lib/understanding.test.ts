import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  cardSubtitle,
  comparisonRows,
  conceptList,
  explainAssistNote,
  explainBackLockedNote,
  explainBackOpen,
  offerRefresherAfter,
  refresherPrompt,
  rowAccessibilityLabel,
  rubricLines,
  wordCount,
} from "./understanding.ts";

const set = {
  dimensions: [
    { dimension: "Who decides", values: ["Admin labels", "Roles"] },
    { dimension: "Use", values: ["Military"] },
  ],
  concepts: [
    { position: 0, name: "MAC", aliases: [], objectiveId: null, objectiveTitle: null },
    { position: 1, name: "RBAC", aliases: [], objectiveId: null, objectiveTitle: null },
  ],
};

describe("comparison card layout (REQ-111)", () => {
  test("one row per dimension, one cell per concept, missing values as a dash", () => {
    const rows = comparisonRows(set);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[1].cells, [
      { concept: "MAC", value: "Military" },
      { concept: "RBAC", value: "—" },
    ]);
  });
  test("each row reads as one sentence for a screen reader", () => {
    assert.equal(rowAccessibilityLabel(comparisonRows(set)[0]), "Who decides: MAC, Admin labels; RBAC, Roles");
  });
  test("concept lists read naturally", () => {
    assert.equal(conceptList(["A", "B"]), "A and B");
    assert.equal(conceptList(["A", "B", "C"]), "A, B and C");
  });
  test("subtitle names past mix-ups kindly, or nothing", () => {
    assert.match(cardSubtitle({ source: "generated", yourMixUps: 2 }) ?? "", /mixed these up 2 times/);
    assert.equal(cardSubtitle({ source: "generated", yourMixUps: 0 }), null);
    assert.match(cardSubtitle({ source: "learned", yourMixUps: 0 }) ?? "", /often mix/);
  });
});

describe("explain-it-back", () => {
  test("opens at Guided and above", () => {
    assert.ok(explainBackOpen("Guided"));
    assert.ok(explainBackOpen("Transfer-ready"));
    assert.ok(!explainBackOpen("Needs review"));
    assert.ok(!explainBackOpen(null));
  });
  test("locked notes are encouraging", () => {
    for (const s of ["Needs review", "Introduced", null]) assert.doesNotMatch(explainBackLockedNote(s), /fail|wrong|bad/i);
  });
  test("rubric lines name gaps without blame", () => {
    const lines = rubricLines({ correct: true, complete: false, keyTerms: true, noMisconception: true });
    assert.deepEqual(lines.map((l) => l.met), [true, false, true, true]);
    assert.equal(lines[1].label, "Part of the idea is missing");
    assert.deepEqual(rubricLines(null), []);
  });
  test("assist notes explain why it counts as practice", () => {
    assert.match(explainAssistNote("repeat") ?? "", /tomorrow/);
    assert.match(explainAssistNote("reveal") ?? "", /own words/);
    assert.equal(explainAssistNote(null), null);
  });
  test("word count", () => {
    assert.equal(wordCount("  one two  three "), 3);
    assert.equal(wordCount(""), 0);
  });
});

describe("prerequisite refresher", () => {
  test("offered only after a miss", () => {
    assert.ok(offerRefresherAfter("incorrect"));
    assert.ok(offerRefresherAfter("partial"));
    assert.ok(!offerRefresherAfter("correct"));
  });
  test("framed as an offer", () => {
    assert.equal(refresherPrompt("Identity basics", 2), 'This builds on "Identity basics". Want a quick refresher (about 2 min) before you try again?');
  });
});

import { parseDiagnosis } from "./lessonProgress.ts";
describe("saved diagnosis (lesson resume)", () => {
  test("keeps a well-formed diagnosis, drops junk", () => {
    assert.deepEqual(parseDiagnosis({ sentence: "You may be mixing up A with B.", confusedWith: "A", conceptSetId: 3 }), {
      sentence: "You may be mixing up A with B.",
      confusedWith: "A",
      conceptSetId: null,
    });
    assert.equal(parseDiagnosis({ sentence: "  " }), null);
    assert.equal(parseDiagnosis("x"), null);
    assert.equal(parseDiagnosis(null), null);
  });
});
