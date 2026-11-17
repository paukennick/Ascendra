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
export function webColumnGutter(platform: string, windowWidth: number, routeName: string): number {
  if (!usesWebColumn(platform, windowWidth, routeName)) return 0;
  return Math.max(0, Math.floor((windowWidth - WEB_COLUMN_MAX_WIDTH) / 2));
}

/** Header options that line the header up with the column; {} when there is no column. */
export function webHeaderInsets(
  platform: string,
  windowWidth: number,
  routeName: string
): { headerLeftContainerStyle?: { paddingLeft: number }; headerRightContainerStyle?: { paddingRight: number } } {
  const gutter = webColumnGutter(platform, windowWidth, routeName);
  if (gutter === 0) return {};
  return { headerLeftContainerStyle: { paddingLeft: gutter }, headerRightContainerStyle: { paddingRight: gutter } };
}

/** Course lists (Home favorites, Explore) show two cards per row on wide web windows, one everywhere else. */
export const WIDE_GRID_COLUMNS = 2;
export function gridColumns(platform: string, windowWidth: number): number {
  return isWideWeb(platform, windowWidth) ? WIDE_GRID_COLUMNS : 1;
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
export function bottomBannerInsets(platform: string, windowWidth: number, edge: number): { left: number; right: number } {
  if (!isWideWeb(platform, windowWidth)) return { left: edge, right: edge };
  const side = Math.max(0, Math.floor((windowWidth - WEB_COLUMN_MAX_WIDTH) / 2)) + edge;
  return { left: side, right: side };
}

/** Width of the "We couldn't reach Ascendra" screen's content on a wide web window. */
export const SESSION_RETRY_MAX_WIDTH = 440;

/**
 * REQ-322 (FAIL-2340): the root "couldn't reach Ascendra" screen sits outside
 * every stack, so the column never reached it. On a wide web window its
 * content is capped and centered, and it names the browser rather than a
 * phone. Everywhere else it is exactly as before.
 */
export function sessionRetryLayout(platform: string, wide: boolean): { maxWidth: number | null; where: string } {
  if (platform === "web" && wide) return { maxWidth: SESSION_RETRY_MAX_WIDTH, where: "in this browser" };
  return { maxWidth: null, where: "on this phone" };
}
