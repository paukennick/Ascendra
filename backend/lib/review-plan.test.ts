import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { reviewBatchPrompt } from "./review-prompts";
import {
  chooseCachedItem,
  cleanTerms,
  GENTLE_SESSION_CAP,
  matchTerms,
  planSession,
  SESSION_CAP,
  targetTerms,
  termKey,
  termsFromTitle,
  wasRough,
  type DueCandidate,
} from "./review-plan";

const cand = (i: number, unit: string, over: Partial<DueCandidate> = {}): DueCandidate => ({
  objectiveId: `o${String(i).padStart(2, "0")}`,
  unitId: unit,
  dueOn: "2026-11-07",
  step: 0,
  lapses: 0,
  mastery: 2,
  ...over,
});

describe("planSession (REQ-108)", () => {
  test("caps at 12, most overdue first", () => {
    const due = Array.from({ length: 20 }, (_, i) => cand(i, `u${i % 3}`, { dueOn: i < 5 ? "2026-11-01" : "2026-11-07" }));
    const plan = planSession(due, null);
    assert.equal(plan.items.length, SESSION_CAP);
    assert.equal(plan.gentleStart, false);
    for (let i = 0; i < 5; i++) assert.ok(plan.items.some((c) => c.objectiveId === `o0${i}`), `overdue o0${i} included`);
  });

  test("interleaves units: no two in a row from one unit while another is available", () => {
    const due = [cand(1, "A"), cand(2, "A"), cand(3, "A"), cand(4, "B"), cand(5, "B"), cand(6, "C")];
    const units = planSession(due, null).items.map((c) => c.unitId);
    for (let i = 1; i < units.length; i++) assert.notEqual(units[i], units[i - 1], units.join(""));
  });

  test("after a rough session: shorter, and opens with the item most likely to be right", () => {
    const due = Array.from({ length: 15 }, (_, i) => cand(i, `u${i % 4}`));
    due[9] = cand(9, "u1", { step: 4, mastery: 4 });
    const plan = planSession(due, { answered: 6, correct: 2 });
    assert.equal(plan.gentleStart, true);
    assert.equal(plan.items.length, GENTLE_SESSION_CAP);
    assert.equal(plan.items[0].objectiveId, "o09");
  });

  test("rough means 3+ answered and under half right", () => {
    assert.equal(wasRough(null), false);
    assert.equal(wasRough({ answered: 2, correct: 0 }), false);
    assert.equal(wasRough({ answered: 4, correct: 2 }), false);
    assert.equal(wasRough({ answered: 4, correct: 1 }), true);
  });

  test("nothing due -> empty plan", () => {
    assert.deepEqual(planSession([], null).items, []);
  });
});

describe("terms (REQ-108, research item #10)", () => {
  test("reads a listed title", () => {
    assert.deepEqual(
      termsFromTitle("Installing and replacing laptop hardware: battery, keyboard, touchpad, and internal wireless card"),
      ["battery", "keyboard", "touchpad", "internal wireless card"]
    );
    assert.deepEqual(
      termsFromTitle("Human movement science: planes of motion, muscle actions, the kinetic chain and length-tension relationships"),
      ["planes of motion", "muscle actions", "kinetic chain", "length-tension relationships"]
    );
    assert.deepEqual(termsFromTitle("Managing configuration and secrets: Secret Manager, Certificate Manager, Parameter Manager"), [
      "Secret Manager",
      "Certificate Manager",
      "Parameter Manager",
    ]);
  });

  test("keeps commas inside parentheses together", () => {
    assert.deepEqual(termsFromTitle("Access models: MAC (labels, clearances), DAC, RBAC"), ["MAC (labels, clearances)", "DAC", "RBAC"]);
  });

  test("leaves non-list titles and clause lists to the model", () => {
    assert.equal(termsFromTitle("Querying data with Amazon Athena"), null);
    assert.equal(
      termsFromTitle("Engaging stakeholders: identifying and analyzing them, tailoring communication to their needs, and executing a plan"),
      null,
      "a list of actions is not a list of terms"
    );
    assert.equal(termsFromTitle("Complementary therapies: potential benefit"), null);
    assert.equal(
      termsFromTitle(
        "Clinical inquiry: question and evaluate practice, and bring evidence-based practice, research and experiential knowledge into changes at the bedside"
      ),
      null
    );
  });

  test("matchTerms keeps only the objective's own terms, in its spelling", () => {
    assert.deepEqual(matchTerms(["KEYBOARD", "mouse", 3, "battery", "battery"], ["battery", "keyboard"]), ["keyboard", "battery"]);
    assert.deepEqual(matchTerms("battery", ["battery"]), []);
  });

  test("cleanTerms drops junk, duplicates and long phrases", () => {
    assert.deepEqual(cleanTerms(["SQS", "sqs", "", 5, "SNS.", "a phrase that is far too long to be one term"]), ["SQS", "SNS"]);
  });

  test("targetTerms rotates toward untested terms", () => {
    const covered = new Set([termKey("battery"), termKey("Keyboard")]);
    assert.deepEqual(targetTerms(["battery", "keyboard", "touchpad", "wireless card"], covered), ["touchpad", "wireless card"]);
    assert.deepEqual(targetTerms(["battery"], covered), []);
  });

  test("chooseCachedItem prefers untested terms and writes a new one when none tests them", () => {
    const items = [
      { id: "old", terms: ["battery"], generatedAt: "2026-01-01" },
      { id: "new", terms: ["touchpad"], generatedAt: "2026-02-01" },
    ];
    assert.equal(chooseCachedItem(items, new Set(["touchpad"]))?.id, "new");
    assert.equal(chooseCachedItem(items, new Set())?.id, "old", "all covered: oldest unseen");
    assert.equal(chooseCachedItem(items, new Set(["keyboard"])), null, "untested term no item covers: write one");
    assert.equal(chooseCachedItem([], new Set()), null);
  });
});

// REQ-112 (i): a learner's mix-ups go into that objective's block; none, no text.
describe("review batch prompt with mix-ups", () => {
  const base = { key: "o1", title: "T", unitTitle: "U", teach: "teach", knownTerms: [], targetTerms: [] };
  test("the fenced block sits inside its own objective", () => {
    const { user } = reviewBatchPrompt({ trackTitle: "C", objectives: [{ ...base, mixups: "\n\n<learner_mixups>\nX\n</learner_mixups>" }, { ...base, key: "o2" }] });
    const blocks = [...user.matchAll(/<objective key="(o\d)">([\s\S]*?)<\/objective>/g)];
    assert.match(blocks[0][2], /<learner_mixups>\nX\n<\/learner_mixups>/);
    assert.doesNotMatch(blocks[1][2], /learner_mixups/);
  });
});
