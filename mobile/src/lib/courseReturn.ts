// REQ-101 (FAIL-096): a lesson's "Back to course" used router.dismissTo,
// which (expo-router 57's StackRouter POP_TO) pops to the nearest earlier
// screen with the same route NAME. Every course dashboard shares one name,
// so with Course B, Course A, Lesson B in the stack it landed on Course A's
// screen with B's params. Pop back only when the nearest dashboard in the
// stack is this course; otherwise push a fresh one.
//
// Same rule as planCourseReturn in navPlan.ts on fix/mobile-flows-2
// (FAIL-065); once both are merged this file can be replaced by that one.

const COURSE_DASHBOARD = /^\/course\/[^/]+$/;

function normalize(p: string): string {
  const noQuery = p.split("?")[0].split("#")[0];
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery || "/";
}

// stackPaths: the stack from the bottom up to and including the current screen.
export function planCourseReturn(trackId: string, stackPaths: readonly string[]): "dismissTo" | "push" {
  for (let i = stackPaths.length - 1; i >= 0; i--) {
    const p = normalize(stackPaths[i]);
    if (COURSE_DASHBOARD.test(p)) return p === `/course/${trackId}` ? "dismissTo" : "push";
  }
  return "push";
}
