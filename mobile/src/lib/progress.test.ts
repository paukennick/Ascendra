import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { examReadiness } from "./progress.ts";

describe("examReadiness", () => {
  test("weights each unit's mastered share by its exam weight", () => {
    const r = examReadiness([
      { weight: 60, total_objectives: 10, mastered_objectives: 10 },
      { weight: 40, total_objectives: 10, mastered_objectives: 0 },
    ]);
    assert.equal(r, 60);
  });

  test("normalises by the weights' own sum when they don't total 100", () => {
    const r = examReadiness([
      { weight: 45, total_objectives: 4, mastered_objectives: 4 },
      { weight: 40, total_objectives: 4, mastered_objectives: 4 },
    ]);
    assert.equal(r, 100);
  });

  test("accepts numeric strings (Postgres numeric comes back as text)", () => {
    const r = examReadiness([
      { weight: "50", total_objectives: 2, mastered_objectives: 1 },
      { weight: "50", total_objectives: 2, mastered_objectives: 1 },
    ]);
    assert.equal(r, 50);
  });

  test("returns null for unweighted or single-weighted tracks", () => {
    assert.equal(examReadiness(null), null);
    assert.equal(examReadiness([{ weight: null, total_objectives: 3, mastered_objectives: 1 }]), null);
    assert.equal(examReadiness([{ weight: 100, total_objectives: 3, mastered_objectives: 1 }]), null);
  });
});
