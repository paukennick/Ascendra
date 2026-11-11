// Routes holding in-progress work that an over-the-air reload would discard.
// The one list for both reload paths: src/updates/useAppUpdates.ts never
// applies a native update silently on these, and the web version check
// (src/lib/webVersion.ts, REQ-177) never reloads a tab by itself on them.
// REQ-177 added labs, exams, quizzes and the other in-progress screens.
// REQ-199: "/sim/" is one run (src/sim/useSimRun.ts). Its unsent commands are
// journaled on the device, but a reload mid-run would still throw the
// learner out of a running clinical or architecture scenario. The trailing
// slash keeps the sims list ("/sims") reloadable.
export const PROTECTED_ROUTE_FRAGMENTS = [
  "/lesson",
  "/pbq",
  "/chat",
  "/lab",
  "/sim/",
  "/exam",
  "/quiz",
  "/review-session",
  "/unit-check",
  "/explain",
  "/placement",
] as const;

export function holdsUnsavedWork(pathname: string): boolean {
  return PROTECTED_ROUTE_FRAGMENTS.some((fragment) => pathname.includes(fragment));
}
