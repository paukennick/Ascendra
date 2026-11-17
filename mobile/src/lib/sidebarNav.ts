// The app's main menu, in one place (REQ-328, desktop web step 3).
//
// Two components draw it: the slide-in menu (src/components/Sidebar.tsx,
// opened from the button on Home on phones, the native apps and narrow web
// windows) and the persistent sidebar that replaces that button on web
// windows wider than 900px. Both read the destinations below, so a route
// added or renamed here changes both.
//
// Pure TypeScript: no React, so node --test can load it.
import { t } from "./i18n.ts";
import { RELEASE_NOTES_LABEL, RELEASE_NOTES_ROUTE } from "./whatsNew.ts";
import type { Track } from "../types/index.ts";

export type NavIcon = "home" | "compass" | "rotate-ccw" | "gift" | "settings" | "life-buoy";

export interface NavItem {
  key: string;
  icon: NavIcon;
  /** Label on the persistent sidebar. */
  label: string;
  /** Label in the slide-in menu, where it differs. */
  menuLabel?: string;
  path: string;
  /**
   * Other paths that belong to this destination (the review session belongs
   * to Review, two-factor settings to Settings). The item is marked as the
   * current section on them, not as the current page.
   */
  section?: readonly string[];
}

export const NAV_HOME: NavItem = { key: "home", icon: "home", label: "Home", path: "/" };
export const NAV_EXPLORE: NavItem = { key: "explore", icon: "compass", label: "Explore", menuLabel: "Explore all courses", path: "/explore" };
export const NAV_REVIEW: NavItem = {
  key: "review",
  icon: "rotate-ccw",
  label: t("menu.review"),
  path: "/review",
  section: ["/review-session", "/review-coverage", "/unit-check"],
};
export const NAV_RELEASE_NOTES: NavItem = {
  key: "release-notes",
  icon: "gift",
  label: RELEASE_NOTES_LABEL,
  path: RELEASE_NOTES_ROUTE,
  section: ["/whats-new"],
};
export const NAV_SETTINGS: NavItem = {
  key: "settings",
  icon: "settings",
  label: "Settings",
  path: "/settings",
  // Account, plans and access are opened from Settings.
  section: ["/settings/*", "/account", "/account/*", "/plans"],
};
export const NAV_SUPPORT: NavItem = { key: "support", icon: "life-buoy", label: "Support", path: "/support" };

/** Top of the persistent sidebar. */
export const SIDEBAR_PRIMARY: readonly NavItem[] = [NAV_HOME, NAV_EXPLORE, NAV_REVIEW, NAV_RELEASE_NOTES];
/** Pinned to the bottom of the persistent sidebar. */
export const SIDEBAR_FOOTER: readonly NavItem[] = [NAV_SETTINGS, NAV_SUPPORT];

export function normalizePath(p: string): string {
  const noQuery = p.split("?")[0].split("#")[0];
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery || "/";
}

function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith("/*")) return path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

/**
 * How an item relates to the screen showing: "page" when it is that screen
 * (aria-current="page"), "section" when the screen belongs to it
 * (aria-current="true"), null otherwise.
 */
export function navMatch(currentPath: string, item: Pick<NavItem, "path" | "section">): "page" | "section" | null {
  const here = normalizePath(currentPath);
  if (here === normalizePath(item.path)) return "page";
  if ((item.section ?? []).some((p) => matchesPattern(here, p))) return "section";
  return null;
}

/** A course row matches its dashboard as the page and every screen inside the course as its section. */
export function courseMatch(currentPath: string, trackId: string): "page" | "section" | null {
  const here = normalizePath(currentPath);
  const dash = `/course/${trackId}`;
  if (here === dash) return "page";
  if (here.startsWith(dash + "/")) return "section";
  return null;
}

/** The aria-current value for a match. */
export function ariaCurrent(match: "page" | "section" | null): "page" | "true" | undefined {
  return match === "page" ? "page" : match === "section" ? "true" : undefined;
}

function byLastStudied(a: Track, b: Track): number {
  const aTime = a.last_studied_at ? new Date(a.last_studied_at).getTime() : 0;
  const bTime = b.last_studied_at ? new Date(b.last_studied_at).getTime() : 0;
  return bTime - aTime;
}

export const RECENT_LIMIT = 5;

/**
 * Favorites (most recently studied first) and up to five recent courses that
 * are not favorites, so no course is listed twice. Shared by both menus.
 */
export function courseGroups(tracks: readonly Track[] | null | undefined): { favorites: Track[]; recent: Track[] } {
  const list = tracks ?? [];
  const favorites = list.filter((t) => t.is_favorite).sort(byLastStudied);
  const favoriteIds = new Set(favorites.map((t) => t.id));
  const recent = list
    .filter((t) => !favoriteIds.has(t.id) && t.last_studied_at)
    .sort(byLastStudied)
    .slice(0, RECENT_LIMIT);
  return { favorites, recent };
}
