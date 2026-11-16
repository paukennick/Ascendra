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
