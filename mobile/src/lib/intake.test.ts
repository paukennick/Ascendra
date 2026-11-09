// REQ-169: the intake form's pure parts on the phone.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addTarget,
  EMPTY_FORM,
  formFromView,
  intakeBody,
  intakeSummary,
  MAX_TARGETS,
  parseIntakeView,
  removeTarget,
  setExamDate,
  SUGGESTION_NOTE,
  suggestionLink,
} from "./intake.ts";

describe("the intake form", () => {
  test("courses: add once, at most five, remove, set a date; the body carries only ids and dates", () => {
    let f = addTarget(EMPTY_FORM, { id: "a", title: "Security+" });
    f = addTarget(f, { id: "a", title: "Security+" });
    assert.equal(f.targets.length, 1);
    for (let i = 0; i < 10; i++) f = addTarget(f, { id: `x${i}`, title: "x" });
    assert.equal(f.targets.length, MAX_TARGETS);
    f = setExamDate(removeTarget(f, "x0"), "a", "2027-01-18");
    const body = intakeBody({ ...f, goal: "pass_exam", useFor: "work" }, "2026-11-09");
    assert.deepEqual(body.targets[0], { trackId: "a", examDate: "2027-01-18" });
    assert.equal(body.today, "2026-11-09");
    assert.equal(EMPTY_FORM.targets.length, 0, "the shared empty form is never changed");
  });
  test("the server's view parses defensively and round-trips into the form", () => {
    assert.equal(parseIntakeView(null), null);
    assert.equal(parseIntakeView({ targets: "x" }), null);
    const v = parseIntakeView({ answered: true, goal: "new_skill", targets: [{ trackId: "a", title: "A", examDate: null }], planSuggestion: { scopes: ["pm"], period: null, reason: "r" } })!;
    assert.equal(formFromView(v).goal, "new_skill");
    assert.equal(intakeSummary(v), "A");
    assert.equal(intakeSummary(null), "Not filled in");
    assert.deepEqual(suggestionLink(v.planSuggestion!), { pathname: "/plans", params: { scope: "pm" } });
  });
  test("no price anywhere on the form; the suggestion says prices are the same for everyone", () => {
    assert.match(SUGGESTION_NOTE, /same for everyone/);
    for (const f of ["../components/IntakeForm.tsx", "../components/IntakeResult.tsx", "./intake.ts"]) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      assert.doesNotMatch(src, /usd|priceText|\$\{.*price/i, f);
    }
  });
});
