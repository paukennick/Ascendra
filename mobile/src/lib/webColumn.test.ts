// Desktop web sizing, step 1: the centered column rule and its wiring.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { FULL_WIDTH_ROUTES, usesWebColumn, WEB_COLUMN_BREAKPOINT, WEB_COLUMN_MAX_WIDTH } from "./webColumn.ts";

describe("web column rule", () => {
  test("native apps never get the column, at any width", () => {
    for (const os of ["ios", "android"]) {
      for (const w of [375, 900, 1024, 1440]) assert.equal(usesWebColumn(os, w, "index"), false);
    }
  });

  test("narrow web windows and phones in a browser are unchanged", () => {
    for (const w of [320, 390, 768, WEB_COLUMN_BREAKPOINT]) assert.equal(usesWebColumn("web", w, "index"), false);
  });

  test("wide web windows get the column on ordinary screens", () => {
    for (const r of ["index", "explore", "settings", "login", "terms", "course/[trackId]/index", "course/[trackId]/lesson/[objectiveId]"]) {
      assert.equal(usesWebColumn("web", 1440, r), true, r);
    }
    assert.equal(usesWebColumn("web", WEB_COLUMN_BREAKPOINT + 1, "index"), true);
  });

  test("sims, exams, labs and the PBQ simulator keep the full width", () => {
    for (const r of FULL_WIDTH_ROUTES) assert.equal(usesWebColumn("web", 1440, r), false, r);
  });

  test("the column is wider than the 720px reading width, so screens that cap themselves still fit", () => {
    assert.ok(WEB_COLUMN_MAX_WIDTH > 720);
    assert.ok(WEB_COLUMN_MAX_WIDTH > WEB_COLUMN_BREAKPOINT);
  });
});

describe("web column wiring", () => {
  const appLayout = readFileSync("app/(app)/_layout.tsx", "utf8");

  test("the signed-in, sign-in and legal stacks use it", () => {
    for (const p of ["app/(app)/_layout.tsx", "app/(auth)/_layout.tsx", "app/(legal)/_layout.tsx"]) {
      assert.match(readFileSync(p, "utf8"), /screenLayout=\{webColumnLayout\}/, p);
    }
  });

  test("every full-width route is a real screen in the signed-in stack", () => {
    for (const r of FULL_WIDTH_ROUTES) {
      assert.ok(appLayout.includes(`name="${r}"`), r);
      assert.ok(existsSync(`app/(app)/${r}.tsx`), r);
    }
  });
});
