// Desktop web step 3 (REQ-328): the persistent sidebar on wide web windows.
// Phones, the native apps and windows of 900px or less must not change, and
// sims, exams, labs and the PBQ simulator keep the whole window.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  appRouteName,
  bottomBannerInsets,
  FULL_WIDTH_ROUTES,
  gridColumns,
  persistentSidebarWidth,
  showsPersistentSidebar,
  SIDEBAR_WIDTH,
  webColumnGutter,
  webHeaderInsets,
  WEB_COLUMN_BREAKPOINT,
  WEB_COLUMN_MAX_WIDTH,
} from "./webColumn.ts";
import {
  ariaCurrent,
  courseGroups,
  courseMatch,
  navMatch,
  NAV_RELEASE_NOTES,
  NAV_REVIEW,
  NAV_SETTINGS,
  RECENT_LIMIT,
  SIDEBAR_FOOTER,
  SIDEBAR_PRIMARY,
} from "./sidebarNav.ts";
import { appStackPaths } from "./navPlan.ts";
import { coursesChanged, onCoursesChanged, shouldRefreshCourses } from "./courseEvents.ts";
import { desktopWebCss } from "./desktopWebCss.ts";
import type { Track } from "../types/index.ts";

const NARROW = [320, 390, 768, 800, WEB_COLUMN_BREAKPOINT];
const WIDE = [WEB_COLUMN_BREAKPOINT + 1, 1280, 1440, 1920];

describe("where the sidebar shows", () => {
  test("never on native, at any width, and never on narrow web", () => {
    for (const os of ["ios", "android"]) for (const w of [...NARROW, ...WIDE]) assert.equal(persistentSidebarWidth(os, w, "index"), 0);
    for (const w of NARROW) assert.equal(persistentSidebarWidth("web", w, "index"), 0);
    for (const w of WIDE) assert.equal(persistentSidebarWidth("web", w, "index"), SIDEBAR_WIDTH);
  });

  test("hidden (not collapsed) on sims, exams, labs and the PBQ simulator, so they keep the window", () => {
    for (const r of FULL_WIDTH_ROUTES) {
      assert.equal(showsPersistentSidebar("web", 1440, r), false, r);
      assert.equal(webColumnGutter("web", 1440, r, persistentSidebarWidth("web", 1440, r)), 0, r);
    }
  });

  test("hidden on the first-run screens and outside the signed-in group", () => {
    for (const r of ["agree", "notice", "welcome"]) assert.equal(showsPersistentSidebar("web", 1440, r), false, r);
    assert.equal(showsPersistentSidebar("web", 1440, null), false);
  });

  test("shown on ordinary signed-in screens", () => {
    for (const r of ["index", "explore", "review", "settings", "course/[trackId]", "course/[trackId]/index", "course/[trackId]/sims", "course/[trackId]/lesson/[objectiveId]"]) {
      assert.equal(showsPersistentSidebar("web", 1440, r), true, r);
    }
  });

  test("route names from expo-router's segments", () => {
    assert.equal(appRouteName(["(app)"]), "index");
    assert.equal(appRouteName(["(app)", "explore"]), "explore");
    assert.equal(appRouteName(["(app)", "course", "[trackId]", "sim", "[simId]"]), "course/[trackId]/sim/[simId]");
    assert.equal(appRouteName(["(auth)", "login"]), null);
    assert.equal(appRouteName(["(legal)", "faq"]), null);
    assert.equal(appRouteName([]), null);
  });
});

describe("layout beside the sidebar", () => {
  test("the header lines up with the column in the space left of the sidebar", () => {
    const side = persistentSidebarWidth("web", 1440, "index");
    assert.equal(webColumnGutter("web", 1440, "index", side), (1440 - SIDEBAR_WIDTH - WEB_COLUMN_MAX_WIDTH) / 2);
    assert.deepEqual(webHeaderInsets("web", 1920, "settings", SIDEBAR_WIDTH), {
      headerLeftContainerStyle: { paddingLeft: 356 },
      headerRightContainerStyle: { paddingRight: 356 },
    });
    // 1100 - 248 = 852 < 960: the column fills the space, no inset.
    assert.deepEqual(webHeaderInsets("web", 1100, "index", SIDEBAR_WIDTH), {});
  });

  test("two cards per row only while the space beside the sidebar is wider than the breakpoint", () => {
    assert.equal(gridColumns("web", 1440, SIDEBAR_WIDTH), 2);
    assert.equal(gridColumns("web", 1000, SIDEBAR_WIDTH), 1);
    assert.equal(gridColumns("web", WEB_COLUMN_BREAKPOINT + SIDEBAR_WIDTH + 1, SIDEBAR_WIDTH), 2);
    // No sidebar (default): as in step 2.
    assert.equal(gridColumns("web", 1000), 2);
    for (const w of NARROW) assert.equal(gridColumns("web", w, 0), 1);
  });

  test("bottom banners sit over the column beside the sidebar", () => {
    const gutter = (1440 - SIDEBAR_WIDTH - WEB_COLUMN_MAX_WIDTH) / 2;
    assert.deepEqual(bottomBannerInsets("web", 1440, 16, SIDEBAR_WIDTH), { left: SIDEBAR_WIDTH + gutter + 16, right: gutter + 16 });
    assert.deepEqual(bottomBannerInsets("web", 390, 16, 0), { left: 16, right: 16 });
    assert.deepEqual(bottomBannerInsets("web", 1440, 16), { left: 256, right: 256 });
  });
});

describe("contents and the current page", () => {
  test("Home, Explore, Review and Release notes; Settings and Support at the bottom", () => {
    assert.deepEqual(SIDEBAR_PRIMARY.map((i) => i.label), ["Home", "Explore", "Review", "Release notes"]);
    assert.deepEqual(SIDEBAR_FOOTER.map((i) => i.label), ["Settings", "Support"]);
  });

  test("every destination is a screen in the signed-in stack", () => {
    const layout = readFileSync("app/(app)/_layout.tsx", "utf8");
    for (const item of [...SIDEBAR_PRIMARY, ...SIDEBAR_FOOTER]) {
      const name = item.path === "/" ? "index" : item.path.slice(1);
      assert.match(layout, new RegExp(`Stack\\.Screen name="${name}"`), item.path);
    }
  });

  test("aria-current: page on the screen itself, true on screens inside it, nothing elsewhere", () => {
    assert.equal(navMatch("/", SIDEBAR_PRIMARY[0]), "page");
    assert.equal(navMatch("/explore", SIDEBAR_PRIMARY[0]), null);
    assert.equal(navMatch("/review", NAV_REVIEW), "page");
    assert.equal(navMatch("/review-session", NAV_REVIEW), "section");
    assert.equal(navMatch("/whats-new", NAV_RELEASE_NOTES), "section");
    assert.equal(navMatch("/settings/mfa", NAV_SETTINGS), "section");
    assert.equal(navMatch("/account/sessions", NAV_SETTINGS), "section");
    assert.equal(navMatch("/settingsx", NAV_SETTINGS), null);
    assert.equal(navMatch("/support?kind=ticket", SIDEBAR_FOOTER[1]), "page");
    assert.equal(ariaCurrent("page"), "page");
    assert.equal(ariaCurrent("section"), "true");
    assert.equal(ariaCurrent(null), undefined);
  });

  test("exactly one destination is current on each screen", () => {
    for (const path of ["/", "/explore", "/review", "/review-session", "/release-notes", "/settings", "/settings/emails", "/account", "/support"]) {
      const hits = [...SIDEBAR_PRIMARY, ...SIDEBAR_FOOTER].filter((i) => navMatch(path, i) !== null);
      assert.equal(hits.length, 1, path);
    }
  });

  test("a course row is current on its dashboard and on every screen inside the course", () => {
    assert.equal(courseMatch("/course/abc", "abc"), "page");
    assert.equal(courseMatch("/course/abc/lesson/x", "abc"), "section");
    assert.equal(courseMatch("/course/abcd", "abc"), null);
    assert.equal(courseMatch("/", "abc"), null);
  });
});

function track(id: string, fav: boolean, studied: string | null): Track {
  return { id, title: id, is_favorite: fav, last_studied_at: studied } as unknown as Track;
}

describe("Recent and Favorites", () => {
  test("no course is listed twice; Recent holds at most five, newest first", () => {
    const tracks = [
      track("f1", true, "2026-11-10T00:00:00Z"),
      track("f2", true, "2026-11-12T00:00:00Z"),
      ...Array.from({ length: 7 }, (_, i) => track(`r${i}`, false, `2026-11-0${i + 1}T00:00:00Z`)),
      track("never", false, null),
    ];
    const { favorites, recent } = courseGroups(tracks);
    assert.deepEqual(favorites.map((t) => t.id), ["f2", "f1"]);
    assert.equal(recent.length, RECENT_LIMIT);
    assert.deepEqual(recent.map((t) => t.id), ["r6", "r5", "r4", "r3", "r2"]);
    assert.equal(courseGroups(null).favorites.length, 0);
  });

  test("the sidebar loads again when a course is starred or opened, and at most every 10 seconds otherwise", () => {
    let n = 0;
    const off = onCoursesChanged(() => n++);
    coursesChanged();
    off();
    coursesChanged();
    assert.equal(n, 1);
    assert.equal(shouldRefreshCourses(null, 0), true);
    assert.equal(shouldRefreshCourses(1000, 5000), false);
    assert.equal(shouldRefreshCourses(1000, 11_000), true);
  });

  test("the stack is read from the root state, up to the screen showing", () => {
    const root = {
      index: 0,
      routes: [
        {
          name: "(app)",
          state: {
            index: 1,
            routes: [
              { name: "index" },
              { name: "course/[trackId]/index", params: { trackId: "t1" } },
              { name: "settings" },
            ],
          },
        },
      ],
    };
    assert.deepEqual(appStackPaths(root), ["/", "/course/t1"]);
    assert.deepEqual(appStackPaths({ routes: [{ name: "(auth)" }] }), []);
    assert.deepEqual(appStackPaths(undefined), []);
  });
});

describe("wiring", () => {
  test("both menus read one route list; the slide-in menu hard-codes none of them", () => {
    const src = readFileSync("src/components/Sidebar.tsx", "utf8");
    const drawer = src.slice(src.indexOf("export function Sidebar("), src.indexOf("export function DesktopSidebar("));
    for (const p of ['"/explore"', '"/review"', '"/settings"']) assert.ok(!drawer.includes(p), p);
    assert.match(src, /SIDEBAR_PRIMARY\.map/);
    assert.match(src, /SIDEBAR_FOOTER\.map/);
    assert.match(src, /aria-current=\{ariaCurrent\(/);
    assert.match(src, /role="navigation"/);
  });

  test("the signed-in layout draws the sidebar on the web only, before the stack, without remounting it", () => {
    const src = readFileSync("app/(app)/_layout.tsx", "utf8");
    assert.match(src, /if \(Platform\.OS !== "web"\) return <BillingProvider>\{stack\}<\/BillingProvider>;/);
    assert.match(src, /\{wide \? <DesktopSidebar hidden=\{sidebarWidth === 0\} \/> : null\}/);
    assert.ok(src.indexOf("<DesktopSidebar") < src.indexOf("{stack}\n"));
    assert.match(src, /useColumnScreenOptions\([\s\S]*\{ sidebar: true \}\)/);
  });

  test("the menu buttons give way to the sidebar on Home and the course page", () => {
    for (const p of ["app/(app)/index.tsx", "app/(app)/course/[trackId]/index.tsx"]) {
      const src = readFileSync(p, "utf8");
      assert.match(src, /const persistentSidebar = usePersistentSidebarWidth\(\) > 0;/, p);
    }
  });

  test("the skip link and its target are styled only on wide windows", () => {
    const css = desktopWebCss();
    assert.match(css, /\[data-skip-link\]:not\(:focus-visible\)/);
    const outside = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, "").trim();
    assert.equal(outside, "");
  });
});
