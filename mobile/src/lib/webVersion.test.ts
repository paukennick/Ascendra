// REQ-177: the web version check (src/lib/webVersion.ts) and its wiring.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AUTO_RELOAD_GAP_MS,
  WEB_VERSION_CHECK_MS,
  WEB_VERSION_MIN_GAP_MS,
  autoReloadMarker,
  compareBuild,
  holdsUnsavedWork,
  mayAutoReload,
  readBuildId,
  shouldCheckNow,
} from "./webVersion.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const A = "1a2b3c4d5e6f";
const B = "9f8e7d6c5b4a";

describe("comparing builds", () => {
  test("new only when both ids are known and differ", () => {
    assert.equal(compareBuild(A, A), "same");
    assert.equal(compareBuild(A, B), "new");
    for (const [x, y] of [["", B], [A, null], ["local", B], [A, undefined], [A, "<script>"], [A, 42]] as const) {
      assert.equal(compareBuild(x, y), "unknown", `${x} ${y}`);
    }
    assert.equal(readBuildId("x".repeat(65)), null);
  });

  test("checks every 10 minutes, focus at most once a minute", () => {
    assert.equal(WEB_VERSION_CHECK_MS, 10 * 60_000);
    assert.equal(shouldCheckNow(0, WEB_VERSION_MIN_GAP_MS), true);
    assert.equal(shouldCheckNow(1000, 1000 + WEB_VERSION_MIN_GAP_MS - 1), false);
  });
});

describe("never reload over work in progress", () => {
  test("lessons, labs, sims, exams, PBQs and other attempts are protected", () => {
    for (const p of [
      "/course/t/lesson/o",
      "/course/t/lab/l",
      "/course/t/sim/s",
      "/course/t/exam",
      "/course/t/pbq",
      "/course/t/quiz",
      "/review-session",
      "/unit-check",
      "/course/t/explain/o",
      "/course/t/placement",
      "/course/t/chat",
    ]) {
      assert.equal(holdsUnsavedWork(p), true, p);
    }
    for (const p of ["/", "/explore", "/settings", "/course/t"]) assert.equal(holdsUnsavedWork(p), false, p);
  });

  test("a 426 reloads by itself only on a safe screen, once per build per 10 minutes", () => {
    const now = 5_000_000;
    assert.equal(mayAutoReload({ pathname: "/", buildId: A, marker: null, now }), true);
    assert.equal(mayAutoReload({ pathname: "/course/t/lab/l", buildId: A, marker: null, now }), false);
    const marker = autoReloadMarker(A, now);
    assert.equal(mayAutoReload({ pathname: "/", buildId: A, marker, now: now + 1000 }), false, "no reload loop");
    assert.equal(mayAutoReload({ pathname: "/", buildId: A, marker, now: now + AUTO_RELOAD_GAP_MS }), true);
    assert.equal(mayAutoReload({ pathname: "/", buildId: B, marker, now: now + 1000 }), true, "a new bundle may reload once itself");
  });
});

describe("wiring (static)", () => {
  test("useAppUpdates checks /api/version on the web and reuses the banner; native uses the shared safe-route rule", () => {
    const hook = read("../updates/useAppUpdates.ts");
    assert.match(hook, /api\.get<[^>]*>\("\/api\/version"\)/);
    assert.match(hook, /visibilitychange/);
    assert.match(hook, /from "@\/lib\/webVersion"/);
    assert.doesNotMatch(hook, /const PROTECTED_ROUTE_FRAGMENTS/);
  });
  test("the web export bakes the deployed commit in", () => {
    assert.match(read("../../../backend/scripts/build-webapp.sh"), /EXPO_PUBLIC_WEB_BUILD_ID="\$\{VERCEL_GIT_COMMIT_SHA:-\}"/);
  });
  test("the root layout auto-reloads a too-old web bundle through mayAutoReload", () => {
    assert.match(read("../../app/_layout.tsx"), /mayAutoReload\(\{ pathname/);
  });
});
