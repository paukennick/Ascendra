// Routes holding in-progress work that an over-the-air reload would discard
// (src/updates/useAppUpdates.ts never applies an update silently on these).
// REQ-199: "/sim/" is one run (src/sim/useSimRun.ts). Its unsent commands are
// journaled on the device, but a reload mid-run would still throw the
// learner out of a running clinical or architecture scenario.
export const PROTECTED_ROUTE_FRAGMENTS = ["/lesson", "/pbq", "/chat", "/sim/"] as const;

export function holdsUnsavedWork(pathname: string): boolean {
  return PROTECTED_ROUTE_FRAGMENTS.some((fragment) => pathname.includes(fragment));
}
