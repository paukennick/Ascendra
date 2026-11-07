import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { planCourseReturn } from "./courseReturn.ts";

describe("Back to course from a lesson (REQ-101, FAIL-096)", () => {
  test("pops back only when the nearest dashboard is this course", () => {
    assert.equal(planCourseReturn("B", ["/", "/course/B", "/course/B/lesson/o1"]), "dismissTo");
    assert.equal(planCourseReturn("B", ["/", "/course/B/", "/course/B/lesson/o1"]), "dismissTo");
    assert.equal(planCourseReturn("B", ["/", "/course/B", "/course/B/chat", "/course/B/lesson/o1"]), "dismissTo");
  });
  test("another course's dashboard nearer in the stack means push", () => {
    assert.equal(planCourseReturn("B", ["/", "/course/B", "/course/A", "/course/B/lesson/o1"]), "push");
  });
  test("no dashboard in the stack means push (dismissTo would replace the lesson)", () => {
    assert.equal(planCourseReturn("B", ["/", "/course/B/lesson/o1"]), "push");
    assert.equal(planCourseReturn("B", []), "push");
  });
});
