// The sidebar's go() always pushed, so tapping "Account" while already on
// Account stacked a second copy, and Home -> Course -> sidebar "Home" left
// Home twice in the stack (back then returned to the same screen). This picks
// how to navigate to a destination; the sidebar performs it.
//
// REQ-093: expo-router's dismissTo (a POP_TO action) pops back to the nearest
// earlier route of the same *name* -- but if there is none it REPLACES the
// current screen (checked in react-navigation's StackRouter as bundled with
// expo-router 57). From Home that would delete Home from the history when
// jumping to Account. So dismissTo is used only for a top-level destination
// that is already in the stack; otherwise it pushes, as before.

export type NavMode = "skip" | "dismissTo" | "push";

const TOP_LEVEL = new Set(["/", "/account", "/settings", "/support", "/explore"]);
const COURSE_DASHBOARD = /^\/course\/[^/]+$/;

export function isTopLevel(path: string): boolean {
  return TOP_LEVEL.has(path) || COURSE_DASHBOARD.test(path);
}

function normalize(p: string): string {
  const noQuery = p.split("?")[0].split("#")[0];
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery || "/";
}

// A stack route ("index", "account", "course/[trackId]/index") and its params
// as the URL path expo-router would show for it, so stack entries can be
// compared with sidebar targets. Returns null if a dynamic segment has no
// string value to fill it.
export function routePath(name: string, params?: Record<string, unknown> | null): string | null {
  const segments = name.split("/").filter((s) => s !== "index");
  const out: string[] = [];
  for (const seg of segments) {
    const m = /^\[(?:\.\.\.)?(.+)\]$/.exec(seg);
    if (!m) {
      out.push(seg);
      continue;
    }
    const v = params?.[m[1]];
    if (typeof v !== "string" || !v) return null;
    out.push(v);
  }
  return "/" + out.join("/");
}

// currentPath is expo-router's usePathname() (route groups already removed).
// hasParams: the target carries query params (e.g. /support?kind=...), so
// landing on the same path may still need to change something.
// stackPaths: paths of the routes from the bottom of the stack up to and
// including the current screen.
export function planNavigation(
  currentPath: string,
  target: string,
  hasParams: boolean,
  stackPaths: readonly string[]
): NavMode {
  const here = normalize(currentPath);
  const there = normalize(target);
  if (here === there && !hasParams) return "skip";
  if (isTopLevel(there) && nearestSameRoute(stackPaths, there) === there) return "dismissTo";
  return "push";
}

// Audit 2 mobile item 5 (FAIL-065): POP_TO matches the nearest earlier
// screen by route NAME only (react-navigation's StackRouter as bundled with
// expo-router 57 -- it starts at the current screen and walks down). Every
// course dashboard has the same route name, so with Course B, ..., Course A,
// Lesson B in the stack, dismissTo("/course/B") popped to Course A's screen
// and swapped its params to B. The old "is it in the stack" check compared
// exact paths, found Course B further down, and said yes. dismissTo is only
// safe when the nearest screen with the target's route name IS the target.
//
// Returns the path of the nearest stack entry (from the top) that shares the
// target's route: any course dashboard for a course dashboard, the same path
// for every other top-level screen (their route names are unique).
function nearestSameRoute(stackPaths: readonly string[], there: string): string | null {
  const sameRoute = COURSE_DASHBOARD.test(there)
    ? (p: string) => COURSE_DASHBOARD.test(p)
    : (p: string) => p === there;
  for (let i = stackPaths.length - 1; i >= 0; i--) {
    const p = normalize(stackPaths[i]);
    if (sameRoute(p)) return p;
  }
  return null;
}

// For a single "back to this course" button (a lesson's "Back to course"):
// pop back to the course dashboard only if it is the nearest dashboard in
// the stack, otherwise push a fresh one.
export function planCourseReturn(trackId: string, stackPaths: readonly string[]): "dismissTo" | "push" {
  return nearestSameRoute(stackPaths, `/course/${trackId}`) === `/course/${trackId}` ? "dismissTo" : "push";
}
