// REQ-169: the intake form's pure parts -- validation, the hours split and
// the plan suggestion. No database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cheapestPeriod, monthsUntil, suggestPlan } from "./intake-suggest";
import { hoursPerCourse, IntakeInputError, parseIntake, suggestsPlacement } from "./intake";

const ON = { BILLING_ENABLED: "true" };
const T = "2026-11-09";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("parseIntake", () => {
  test("every answer is optional", () => {
    assert.deepEqual(parseIntake({}, T), { goal: null, experience: null, weeklyHours: null, useFor: null, targets: [], applyToPlan: true });
  });
  test("known choices only; hours in half hours within the plan's range", () => {
    const v = parseIntake({ goal: "pass_exam", experience: "retake", weeklyHours: "7.3", useFor: "work", targets: [{ trackId: A, examDate: "2027-01-18" }] }, T);
    assert.equal(v.weeklyHours, 7.5);
    assert.deepEqual(v.targets, [{ trackId: A, examDate: "2027-01-18" }]);
    assert.throws(() => parseIntake({ goal: "get_rich" }, T), IntakeInputError);
    assert.throws(() => parseIntake({ useFor: "school" }, T), /useFor/);
    assert.throws(() => parseIntake({ weeklyHours: 61 }, T), /weeklyHours/);
    assert.throws(() => parseIntake({ weeklyHours: 0 }, T), /weeklyHours/);
  });
  test("courses: valid ids, no duplicates, at most five, dates from today and within three years", () => {
    assert.equal(parseIntake({ targets: [{ trackId: A }, { trackId: A.toUpperCase() }] }, T).targets.length, 1);
    assert.throws(() => parseIntake({ targets: [{ trackId: "x" }] }, T), /valid id/);
    assert.throws(() => parseIntake({ targets: Array.from({ length: 6 }, (_, i) => ({ trackId: A.replace(/1$/, String(i)) })) }, T), /up to 5/);
    assert.throws(() => parseIntake({ targets: [{ trackId: A, examDate: "2026-11-08" }] }, T), /already passed/);
    assert.throws(() => parseIntake({ targets: [{ trackId: A, examDate: "2030-01-01" }] }, T), /three years/);
    assert.throws(() => parseIntake({ targets: "abc" }, T), /list/);
  });
  test("weekly hours are shared evenly between courses; placement is offered to anyone who knows some of it", () => {
    assert.equal(hoursPerCourse(8, 1), 8);
    assert.equal(hoursPerCourse(5, 2), 2.5);
    assert.equal(hoursPerCourse(2, 5), 0.5);
    assert.equal(suggestsPlacement("new"), false);
    assert.equal(suggestsPlacement("retake"), true);
    assert.equal(suggestsPlacement(null), false);
  });
});

describe("the plan suggestion", () => {
  test("nothing while paid plans are off (no price talk at all)", () => {
    assert.equal(suggestPlan({ targets: [{ category: "it_cloud", examDate: "2027-01-18" }], useFor: null, today: T }, {}), null);
  });
  test("Nick's example: an exam about 10 weeks away suggests 3 months", () => {
    assert.equal(monthsUntil("2027-01-18", T), 3);
    const s = suggestPlan({ targets: [{ category: "it_cloud", examDate: "2027-01-18" }], useFor: "personal", today: T }, ON)!;
    assert.deepEqual(s.scopes, ["it_cloud"]);
    assert.equal(s.period, "quarterly");
    assert.match(s.reason, /about 3 months away/);
  });
  test("the length is the cheapest way to cover the time at the published prices", () => {
    assert.equal(cheapestPeriod("it_cloud_plus", 1, {}), "monthly");
    assert.equal(cheapestPeriod("it_cloud_plus", 2, {}), "monthly"); // 25.98 < 29.99
    assert.equal(cheapestPeriod("it_cloud_plus", 6, {}), "quarterly"); // 59.98 < 79.99
    assert.equal(cheapestPeriod("it_cloud_plus", 8, {}), "yearly"); // 79.99 < 89.97
    assert.equal(cheapestPeriod("clinical_pro", 10, {}), "quarterly", "clinical has no yearly length");
    assert.equal(suggestPlan({ targets: [{ category: "pm", examDate: null }], useFor: null, today: T }, ON)!.period, null);
  });
  test("categories: one -> that plan; several or 'other' -> all-access; clinical -> clinical, or all-access with the add-on", () => {
    const scopes = (cats: Array<"it_cloud" | "pm" | "fitness" | "clinical" | "other" | "own">) =>
      suggestPlan({ targets: cats.map((category) => ({ category, examDate: null })), useFor: null, today: T }, ON)?.scopes ?? null;
    assert.deepEqual(scopes(["pm"]), ["pm"]);
    assert.deepEqual(scopes(["pm", "pm"]), ["pm"]);
    assert.deepEqual(scopes(["pm", "fitness"]), ["all_access"]);
    assert.deepEqual(scopes(["other"]), ["all_access"]);
    assert.deepEqual(scopes(["clinical"]), ["clinical"]);
    assert.deepEqual(scopes(["clinical", "it_cloud"]), ["all_access", "clinical"]);
    assert.equal(scopes(["own"]), null, "a learner's own course needs no particular plan");
    assert.equal(scopes([]), null);
  });
  test("teaching a class: no personal plan is suggested", () => {
    assert.equal(suggestPlan({ targets: [{ category: "it_cloud", examDate: null }], useFor: "teaching", today: T }, ON), null);
  });
  test("never a price: the suggestion has no price field and its inputs are only categories and the exam date", () => {
    const s = suggestPlan({ targets: [{ category: "fitness", examDate: "2027-06-01" }], useFor: "work", today: T }, ON)!;
    assert.deepEqual(Object.keys(s).sort(), ["period", "reason", "scopes"]);
    assert.doesNotMatch(s.reason, /\$|\d+\.\d\d|discount|% off/i);
    // Experience, goal and hours are not even parameters of suggestPlan.
    const src = readFileSync(path.join(__dirname, "intake-suggest.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(src, /experience|weeklyHours|goal/);
  });
});
