// REQ-328: the persistent sidebar lists Favorites from its own copy of the
// course list. A screen that stars or unstars a course says so here, and the
// sidebar loads the list again, so its Favorites follow at once.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onCoursesChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function coursesChanged(): void {
  for (const fn of [...listeners]) {
    try {
      fn();
    } catch {
      // A listener's failure must not stop the others.
    }
  }
}

/**
 * Whether the sidebar should load the course list again after the screen
 * changed: at most once per `minMs`, so moving between screens quickly does
 * not send a request each time. Recent courses change when a course is opened.
 */
export function shouldRefreshCourses(lastLoadedAt: number | null, now: number, minMs: number = 10_000): boolean {
  return lastLoadedAt === null || now - lastLoadedAt >= minMs;
}
