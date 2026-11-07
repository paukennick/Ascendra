import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { domainLine, readinessSummary } from "./progress.ts";
import type { CourseReadiness } from "../types/index.ts";

const base: CourseReadiness = {
  blueprintWeighted: true,
  status: "building",
  readinessPercent: 42,
  coveragePercent: 70,
  accuracyPercent: 81,
  objectives: 20,
  practiced: 14,
  focusUnitId: "b",
  domains: [
    { unitId: "a", title: "Threats", weight: 60, objectives: 10, practiced: 10, coveragePercent: 100, accuracyPercent: 85, readinessPercent: 60 },
    { unitId: "b", title: "Architecture", weight: 40, objectives: 10, practiced: 4, coveragePercent: 40, accuracyPercent: 70, readinessPercent: 15 },
  ],
};

describe("readinessSummary (REQ-100)", () => {
  test("building: shows the readiness number, coverage and accuracy apart, and one next step", () => {
    const s = readinessSummary(base)!;
    assert.equal(s.headline, "Building readiness");
    assert.equal(s.percent, 42);
    assert.deepEqual(s.lines, [
      "You've practiced 14 of 20 objectives (70% of the exam by weight).",
      "On what you've practiced, your weighted accuracy is 81%.",
      "Biggest gain next: Architecture.",
    ]);
  });

  test("little evidence never shows a readiness number, however accurate", () => {
    const s = readinessSummary({ ...base, status: "not_enough_evidence", accuracyPercent: 100, coveragePercent: 10, practiced: 2 })!;
    assert.equal(s.headline, "Not enough evidence yet");
    assert.equal(s.percent, null);
    assert.match(s.lines.join(" "), /Practice more objectives/);
  });

  test("no evidence and no objectives", () => {
    assert.equal(readinessSummary({ ...base, status: "no_evidence", practiced: 0, accuracyPercent: null })!.percent, null);
    assert.equal(readinessSummary({ ...base, objectives: 0 }), null);
    assert.equal(readinessSummary(null), null);
  });

  test("a course without a blueprint says 'of the course'", () => {
    assert.match(readinessSummary({ ...base, blueprintWeighted: false })!.lines[0], /70% of the course\)/);
  });

  test("domainLine", () => {
    assert.equal(domainLine(base.domains[1]), "4/10 practiced · 70% accuracy · 15% ready");
    assert.equal(domainLine({ ...base.domains[1], practiced: 0, accuracyPercent: null, readinessPercent: 0 }), "0/10 practiced · 0% ready");
  });
});

describe("REQ-117 readiness wording", () => {
  test("shows how much is confirmed at a spaced review", () => {
    const s = readinessSummary({ ...base, keptPercent: 40 })!;
    assert.ok(s.lines.some((l) => /40% confirmed at a spaced review/.test(l)));
  });
});
