// Desktop web sizing, step 2 (REQ-322): header alignment, course grids, the
// root error screen, bottom banners, and hover/focus styles. Every rule must
// leave native apps and web windows of 900px or less exactly as before, except
// two (Nick 2026-11-17): the keyboard focus ring shows at every web width, and
// the retry screen says "this browser" in any browser window.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  bottomBannerInsets,
  chunkRows,
  gridColumns,
  isWideWeb,
  sessionRetryLayout,
  SESSION_RETRY_MAX_WIDTH,
  webColumnGutter,
  webHeaderInsets,
  WEB_COLUMN_BREAKPOINT,
  WEB_COLUMN_MAX_WIDTH,
} from "./webColumn.ts";
import { desktopWebCss } from "./desktopWebCss.ts";

const NARROW = [320, 390, 768, WEB_COLUMN_BREAKPOINT];
const WIDE = [WEB_COLUMN_BREAKPOINT + 1, 1280, 1440, 1920];

describe("nothing changes on phones, native apps or narrow windows", () => {
  test("isWideWeb is false on native at every width and on narrow web", () => {
    for (const os of ["ios", "android"]) for (const w of [...NARROW, ...WIDE]) assert.equal(isWideWeb(os, w), false);
    for (const w of NARROW) assert.equal(isWideWeb("web", w), false);
    for (const w of WIDE) assert.equal(isWideWeb("web", w), true);
  });

  test("header insets are empty unless the screen has the column", () => {
    for (const w of NARROW) assert.deepEqual(webHeaderInsets("web", w, "index"), {});
    for (const w of WIDE) assert.deepEqual(webHeaderInsets("ios", w, "index"), {});
    assert.deepEqual(webHeaderInsets("web", 1440, "course/[trackId]/sim/[simId]"), {});
  });

  test("one card per row, and banners keep their 16px edges", () => {
    for (const w of NARROW) {
      assert.equal(gridColumns("web", w), 1);
      assert.deepEqual(bottomBannerInsets("web", w, 16), { left: 16, right: 16 });
    }
    assert.equal(gridColumns("android", 1440), 1);
    assert.deepEqual(bottomBannerInsets("ios", 1440, 16), { left: 16, right: 16 });
  });

  test("the retry screen is uncapped off wide web; native apps keep 'this phone', every browser window says 'this browser'", () => {
    const phone = "You're still signed in on this phone. Check your connection and try again.";
    const browser = "This browser is still signed in. Check your connection and try again.";
    for (const os of ["ios", "android"]) {
      assert.deepEqual(sessionRetryLayout(os, false), { maxWidth: null, message: phone });
      assert.deepEqual(sessionRetryLayout(os, true), { maxWidth: null, message: phone });
    }
    assert.deepEqual(sessionRetryLayout("web", false), { maxWidth: null, message: browser });
  });

  test("only the keyboard focus ring applies at every web width; hover stays inside the min-width query", () => {
    const css = desktopWebCss();
    const outside = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, "").trim();
    // Outside any media query: the focus ring rule and nothing else.
    const outsideRules = outside.match(/\{[^{}]*\}/g) ?? [];
    assert.equal(outsideRules.length, 1, "one rule at every width");
    assert.match(outside, /^[^{]*:focus-visible[^{]*\{\s*outline: 2px solid [^;]+;\s*outline-offset: 2px;\s*\}$/);
    assert.doesNotMatch(outside, /:hover/);
    const queries = css.match(/@media[^{]*/g) ?? [];
    assert.ok(queries.length >= 1);
    for (const q of queries) assert.match(q, new RegExp(`min-width: ${WEB_COLUMN_BREAKPOINT + 1}px`));
    const media = css.slice(css.indexOf("@media"));
    assert.match(media, /:hover/);
    assert.doesNotMatch(media, /:focus-visible/);
  });
});

describe("wide web windows", () => {
  test("the header lines up with the 960px column", () => {
    assert.equal(webColumnGutter("web", 1440, "index"), (1440 - WEB_COLUMN_MAX_WIDTH) / 2);
    assert.deepEqual(webHeaderInsets("web", 1920, "settings"), {
      headerLeftContainerStyle: { paddingLeft: 480 },
      headerRightContainerStyle: { paddingRight: 480 },
    });
    // Just above the breakpoint the column is the full window: no inset.
    assert.deepEqual(webHeaderInsets("web", WEB_COLUMN_BREAKPOINT + 1, "index"), {});
  });

  test("course lists show two per row", () => {
    assert.equal(gridColumns("web", 1440), 2);
    assert.deepEqual(chunkRows([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.deepEqual(chunkRows([], 2), []);
    assert.deepEqual(chunkRows([1, 2], 0), [[1], [2]]);
  });

  test("banners sit over the column", () => {
    assert.deepEqual(bottomBannerInsets("web", 1440, 16), { left: 256, right: 256 });
  });

  test("FAIL-2340: the retry screen is capped, centered and names the browser", () => {
    const wide = sessionRetryLayout("web", true);
    assert.equal(wide.maxWidth, SESSION_RETRY_MAX_WIDTH);
    assert.match(wide.message, /browser/);
    assert.doesNotMatch(wide.message, /phone|\bin in\b/);
    const src = readFileSync("src/components/SessionRetry.tsx", "utf8");
    assert.match(src, /sessionRetryLayout\(/);
    assert.doesNotMatch(src, /signed in on this phone/);
  });

  test("focus ring is visible and keyboard-only; text fields keep their own", () => {
    const css = desktopWebCss();
    assert.match(css, /:focus-visible/);
    assert.doesNotMatch(css, /:focus\s*[,{]/);
    assert.match(css, /outline: 2px solid/);
    assert.match(css, /\(hover: hover\) and \(pointer: fine\)/);
    assert.match(css, /:not\(\[aria-disabled="true"\]\):hover/);
  });
});

describe("wiring", () => {
  test("the three stacks line their headers up with the column", () => {
    for (const p of ["app/(app)/_layout.tsx", "app/(auth)/_layout.tsx", "app/(legal)/_layout.tsx"]) {
      const src = readFileSync(p, "utf8");
      assert.match(src, /useColumnScreenOptions\(/, p);
      assert.match(src, /screenOptions=\{screenOptions\}/, p);
    }
  });

  test("Home and Explore use the grid; the root layout installs the styles", () => {
    for (const p of ["app/(app)/index.tsx", "app/(app)/explore.tsx"]) {
      const src = readFileSync(p, "utf8");
      assert.match(src, /useGridColumns\(\)/, p);
      assert.match(src, /chunkRows\(/, p);
    }
    const root = readFileSync("app/_layout.tsx", "utf8");
    assert.match(root, /installDesktopWebStyles\(\)/);
    assert.match(root, /bottomBannerInsets\(/);
    assert.match(readFileSync("src/components/UpdateBanner.tsx", "utf8"), /bottomBannerInsets\(/);
  });
});
