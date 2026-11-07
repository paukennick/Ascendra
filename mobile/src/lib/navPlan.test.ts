import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isTopLevel, planCourseReturn, planNavigation, routePath } from "./navPlan.ts";

describe("sidebar navigation plan", () => {
  test("tapping the screen you are already on does nothing", () => {
    assert.equal(planNavigation("/account", "/account", false, ["/", "/account"]), "skip");
    assert.equal(planNavigation("/", "/", false, ["/"]), "skip");
    assert.equal(planNavigation("/course/abc", "/course/abc", false, ["/", "/course/abc"]), "skip");
    assert.equal(planNavigation("/course/abc/chat", "/course/abc/chat", false, ["/", "/course/abc/chat"]), "skip");
    assert.equal(planNavigation("/course/abc/", "/course/abc", false, ["/", "/course/abc"]), "skip");
  });
  test("same path with params is not skipped (support?kind=course_request)", () => {
    assert.equal(planNavigation("/support", "/support", true, ["/", "/support"]), "dismissTo");
  });
  test("a top-level screen already in the stack is popped back to, not stacked again", () => {
    assert.equal(planNavigation("/course/abc", "/", false, ["/", "/course/abc"]), "dismissTo");
    assert.equal(planNavigation("/course/abc", "/course/abc", true, ["/", "/course/abc"]), "dismissTo");
    assert.equal(planNavigation("/account", "/settings", false, ["/", "/settings", "/account"]), "dismissTo");
  });
  test("a top-level screen NOT in the stack is pushed, so the current one is never replaced", () => {
    // From Home, dismissTo would replace Home itself.
    assert.equal(planNavigation("/", "/account", false, ["/"]), "push");
    assert.equal(planNavigation("/", "/settings", false, ["/"]), "push");
    assert.equal(planNavigation("/", "/support", true, ["/"]), "push");
    assert.equal(planNavigation("/", "/course/xyz", false, ["/"]), "push");
    // A different course's dashboard in the stack doesn't count.
    assert.equal(planNavigation("/course/abc", "/course/xyz", false, ["/", "/course/abc"]), "push");
  });
  test("FAIL-065: a course dashboard is popped to only if it is the NEAREST dashboard in the stack", () => {
    // Course B, ..., Course A, Lesson B: popping by route name would land on
    // Course A's screen with its course swapped to B.
    const stack = ["/", "/course/B", "/course/B/progress", "/course/A", "/course/B/lesson/o1"];
    assert.equal(planNavigation("/course/B/lesson/o1", "/course/B", false, stack), "push");
    // Course A is the nearest dashboard, so popping to it is right.
    assert.equal(planNavigation("/course/B/lesson/o1", "/course/A", false, stack), "dismissTo");
    // Current screen is a dashboard for another course: push, never swap it.
    assert.equal(planNavigation("/course/A", "/course/B", false, ["/", "/course/B", "/course/A"]), "push");
    // Static top-level screens have unique route names; any copy is the target.
    assert.equal(planNavigation("/course/A", "/", false, ["/", "/course/B", "/course/A"]), "dismissTo");
    assert.equal(planNavigation("/course/A", "/support", true, ["/", "/support", "/course/A"]), "dismissTo");
  });
  test("FAIL-065: Back to course from a lesson", () => {
    assert.equal(planCourseReturn("B", ["/", "/course/B", "/course/B/lesson/o1"]), "dismissTo");
    assert.equal(planCourseReturn("B", ["/", "/course/B", "/course/A", "/course/B/lesson/o1"]), "push");
    assert.equal(planCourseReturn("B", ["/", "/course/B/lesson/o1"]), "push");
    assert.equal(planCourseReturn("B", ["/", "/course/B/", "/course/B/lesson/o1"]), "dismissTo");
  });
  test("detail screens always push", () => {
    assert.equal(planNavigation("/course/abc", "/course/abc/progress", true, ["/", "/course/abc"]), "push");
    assert.equal(planNavigation("/course/abc", "/course/abc/lesson/o1", true, ["/", "/course/abc"]), "push");
    assert.equal(planNavigation("/", "/faq", false, ["/"]), "push");
    assert.equal(planNavigation("/", "/disclaimer", false, ["/"]), "push");
  });
  test("what counts as top level", () => {
    assert.equal(isTopLevel("/course/abc"), true);
    assert.equal(isTopLevel("/course/abc/chat"), false);
    assert.equal(isTopLevel("/course"), false);
    assert.equal(isTopLevel("/account/sessions"), false);
    assert.equal(isTopLevel("/settings/mfa"), false);
  });
});

describe("stack route names to paths", () => {
  test("static and index routes", () => {
    assert.equal(routePath("index"), "/");
    assert.equal(routePath("account"), "/account");
    assert.equal(routePath("settings/mfa"), "/settings/mfa");
  });
  test("dynamic segments are filled from params", () => {
    assert.equal(routePath("course/[trackId]/index", { trackId: "abc" }), "/course/abc");
    assert.equal(routePath("course/[trackId]/lesson/[objectiveId]", { trackId: "a", objectiveId: "o" }), "/course/a/lesson/o");
  });
  test("a missing or non-string param yields null rather than a wrong path", () => {
    assert.equal(routePath("course/[trackId]/index", {}), null);
    assert.equal(routePath("course/[trackId]/index", { trackId: 5 }), null);
    assert.equal(routePath("course/[trackId]/index", undefined), null);
  });
});
