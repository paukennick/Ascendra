// REQ-206 (FAIL-926): a course, lesson or lab that doesn't exist (a stale
// link, a removed course) answers 404, and Retry can never succeed. Those
// screens offer a way out instead.
export const NOT_FOUND_ACTION_LABEL = "Go to my courses";

export function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { status?: unknown }).status === 404;
}
