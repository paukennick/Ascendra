// Desktop web sizing, step 1 (Nick, 2026-11-14: "make the desktop web browser
// version size correctly without affecting the mobile version").
//
// On the web, when the window is wider than WEB_COLUMN_BREAKPOINT, every
// signed-in, sign-in and legal screen sits in a centered column at most
// WEB_COLUMN_MAX_WIDTH wide, so lists, cards and buttons stop stretching across
// a 1440px monitor. Phones, tablets in the native app and narrow browser
// windows get exactly what they had before (no wrapper at all).
//
// Screens that use the width for real work are left full width: the
// simulation player (monitor, console, board and terminal screens), the
// practice and mock exam (question plus navigator), labs (diagram labs) and the
// PBQ simulator.

export const WEB_COLUMN_BREAKPOINT = 900;
export const WEB_COLUMN_MAX_WIDTH = 960;

/** Route names (as expo-router names them inside the (app) group) that keep the full window width. */
export const FULL_WIDTH_ROUTES: readonly string[] = [
  "course/[trackId]/sim/[simId]",
  "course/[trackId]/exam",
  "course/[trackId]/lab/[labId]",
  "course/[trackId]/pbq",
];

export function usesWebColumn(platform: string, windowWidth: number, routeName: string): boolean {
  if (platform !== "web") return false;
  if (!(windowWidth > WEB_COLUMN_BREAKPOINT)) return false;
  return !FULL_WIDTH_ROUTES.includes(routeName);
}

// Desktop web sizing, step 2 (REQ-322). Everything below is a no-op unless the
// window is a wide web window, so phones, the native apps and narrow browser
// windows render exactly as before.

/** True only on the web in a window wider than WEB_COLUMN_BREAKPOINT. */
export function isWideWeb(platform: string, windowWidth: number): boolean {
  return platform === "web" && windowWidth > WEB_COLUMN_BREAKPOINT;
}

/**
 * How far in from each window edge the centered column starts (0 when the
 * screen has no column). The header uses it so its back button, title and
 * right-hand buttons line up with the column instead of the window edges.
 */
export function webColumnGutter(platform: string, windowWidth: number, routeName: string, sidebarWidth: number = 0): number {
  if (!usesWebColumn(platform, windowWidth, routeName)) return 0;
  // REQ-328: with the persistent sidebar the header and column share what is
  // left of the window beside it.
  return Math.max(0, Math.floor((windowWidth - sidebarWidth - WEB_COLUMN_MAX_WIDTH) / 2));
}

/** Header options that line the header up with the column; {} when there is no column. */
export function webHeaderInsets(
  platform: string,
  windowWidth: number,
  routeName: string,
  sidebarWidth: number = 0
): { headerLeftContainerStyle?: { paddingLeft: number }; headerRightContainerStyle?: { paddingRight: number } } {
  const gutter = webColumnGutter(platform, windowWidth, routeName, sidebarWidth);
  if (gutter === 0) return {};
  return { headerLeftContainerStyle: { paddingLeft: gutter }, headerRightContainerStyle: { paddingRight: gutter } };
}

/** Course lists (Home favorites, Explore) show two cards per row on wide web windows, one everywhere else. */
export const WIDE_GRID_COLUMNS = 2;
export function gridColumns(platform: string, windowWidth: number, sidebarWidth: number = 0): number {
  // REQ-328: two per row only while the area beside the sidebar is itself
  // wider than the breakpoint (a 1000px window leaves 752px: one per row).
  return isWideWeb(platform, windowWidth) && windowWidth - sidebarWidth > WEB_COLUMN_BREAKPOINT ? WIDE_GRID_COLUMNS : 1;
}

/** Splits a list into rows of `columns` items, in order. The last row may be short. */
export function chunkRows<T>(items: readonly T[], columns: number): T[][] {
  const n = Math.max(1, Math.floor(columns));
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));
  return rows;
}

/**
 * Side offsets for a banner pinned to the bottom of the window (the idle
 * warning and the update banner): on a wide web window it sits over the
 * column, not across the whole monitor. `edge` is the inset used elsewhere.
 */
export function bottomBannerInsets(
  platform: string,
  windowWidth: number,
  edge: number,
  sidebarWidth: number = 0
): { left: number; right: number } {
  if (!isWideWeb(platform, windowWidth)) return { left: edge, right: edge };
  // REQ-328: beside the persistent sidebar, centered over the column there.
  const side = Math.max(0, Math.floor((windowWidth - sidebarWidth - WEB_COLUMN_MAX_WIDTH) / 2)) + edge;
  return { left: sidebarWidth + side, right: side };
}

// Overlays the root layout draws outside every stack, so the column never
// wraps them; each needs its own wide-window rule (REQ-322):
//   - SessionRetry ("We couldn't reach Ascendra"): sessionRetryLayout
//   - IdleWarningBanner, UpdateBanner: bottomBannerInsets
//   - AppLock, UpdateRequired: already cap their content at 360px
//   - lock screen (native only) and +not-found: cap themselves (360px, Screen)

/** Width of the "We couldn't reach Ascendra" screen's content on a wide web window. */
export const SESSION_RETRY_MAX_WIDTH = 440;

/**
 * REQ-322 (FAIL-2340): the root "couldn't reach Ascendra" screen sits outside
 * every stack, so the column never reached it. On a wide web window its
 * content is capped and centered, and it names the browser rather than a
 * phone. Everywhere else it is exactly as before.
 */
export function sessionRetryLayout(platform: string, wide: boolean): { maxWidth: number | null; message: string } {
  if (platform === "web" && wide) {
    return { maxWidth: SESSION_RETRY_MAX_WIDTH, message: "This browser is still signed in. Check your connection and try again." };
  }
  return { maxWidth: null, message: "You're still signed in on this phone. Check your connection and try again." };
}

// Desktop web step 3 (REQ-328): a persistent sidebar on wide web windows,
// in place of the menu button on Home and the course page.

/** Width of the persistent sidebar. */
export const SIDEBAR_WIDTH = 248;

/**
 * Signed-in screens that never show the persistent sidebar:
 * - the full-width screens (sims, exams, labs, PBQ simulator) keep the whole
 *   window, as in step 1 (the sidebar is hidden, not collapsed to a rail);
 * - the first-run screens (Terms prompt, study notice, welcome) finish by
 *   moving on and have no back button, so they offer no way out either.
 */
export const SIDEBAR_HIDDEN_ROUTES: readonly string[] = [...FULL_WIDTH_ROUTES, "agree", "notice", "welcome"];

/**
 * The (app) stack's route name for expo-router's useSegments(), or null when
 * the screen is outside the signed-in group (sign-in and legal pages).
 * ["(app)"] is Home ("index"); ["(app)","course","[trackId]","sim","[simId]"]
 * is "course/[trackId]/sim/[simId]".
 */
export function appRouteName(segments: readonly string[]): string | null {
  if (segments[0] !== "(app)") return null;
  const rest = segments.slice(1);
  return rest.length ? rest.join("/") : "index";
}

/** Whether the screen shows the persistent sidebar (web wider than the breakpoint, signed-in group, not a hidden route). */
export function showsPersistentSidebar(platform: string, windowWidth: number, appRoute: string | null): boolean {
  if (!isWideWeb(platform, windowWidth)) return false;
  if (appRoute === null) return false;
  return !SIDEBAR_HIDDEN_ROUTES.includes(appRoute);
}

/** The persistent sidebar's width for a screen, 0 where it is not shown. */
export function persistentSidebarWidth(platform: string, windowWidth: number, appRoute: string | null): number {
  return showsPersistentSidebar(platform, windowWidth, appRoute) ? SIDEBAR_WIDTH : 0;
}
