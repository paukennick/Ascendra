// REQ-175: the app-version header and the "Update required" answer.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldTryOta, updatePromptView, versionLine } from "./updatePrompt.ts";
import { APP_VERSION, APP_PLATFORM_HEADER, APP_VERSION_HEADER, appHeaders, buildTag, readUpdateRequired } from "./appVersion.ts";

test("APP_VERSION matches app.json's expo.version", () => {
  const appJson = JSON.parse(readFileSync(new URL("../../app.json", import.meta.url), "utf8"));
  assert.equal(APP_VERSION, appJson.expo.version);
});

// REQ-300 (FAIL-2040): one version, four places. Settings once read it from
// expo-constants with a "1.0.0" fallback, a different source from the header.
test("APP_VERSION, app.json, package.json and package-lock.json name the same version", () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), "utf8"));
  const lock = read("package-lock.json");
  const where: Record<string, string> = {
    "app.json expo.version": read("app.json").expo.version,
    "package.json version": read("package.json").version,
    "package-lock.json version": lock.version,
    'package-lock.json packages[""].version': lock.packages?.[""]?.version,
  };
  for (const [name, v] of Object.entries(where)) {
    assert.equal(v, APP_VERSION, `${name} is ${v} but APP_VERSION (src/lib/appVersion.ts) is ${APP_VERSION}: change all four together (docs/versioning.md)`);
  }
});

test("Settings > About shows APP_VERSION, the version the server is sent, with no second source", () => {
  const settings = readFileSync(new URL("../../app/(app)/settings.tsx", import.meta.url), "utf8");
  assert.match(settings, /<Muted>\{APP_VERSION\}<\/Muted>/);
  assert.doesNotMatch(settings, /expo-constants|Constants\.expoConfig/);
  assert.doesNotMatch(settings, /"1\.0\.0"/);
});

test("APP_VERSION is a semver the server can read", () => {
  assert.match(APP_VERSION, /^\d{1,4}\.\d{1,4}\.\d{1,4}$/);
});

test("build tags are short and header-safe", () => {
  assert.equal(buildTag("web", "anything", false), "web");
  assert.equal(buildTag("android", null, true), "embedded");
  assert.equal(buildTag("ios", "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d", false), "u.1a2b3c4d");
  assert.equal(buildTag("android", "1a2b3c4d-5e6f", true), "embedded");
  assert.deepEqual(appHeaders({ version: "2.0.0", build: "u.1a2b3c4d", platform: "ios" }), {
    [APP_VERSION_HEADER]: "2.0.0+u.1a2b3c4d",
    [APP_PLATFORM_HEADER]: "ios",
  });
});

test("readUpdateRequired recognizes only the server's 426 and keeps only store links", () => {
  assert.equal(readUpdateRequired(400, { code: "update_required" }), null);
  assert.equal(readUpdateRequired(426, { error: "x" }), null);
  assert.deepEqual(
    readUpdateRequired(426, {
      code: "update_required",
      error: "Please update Ascendra.",
      minVersion: "2.1.0",
      storeUrl: "https://play.google.com/store/apps/details?id=com.hel1x.ascendra",
    }),
    { message: "Please update Ascendra.", minVersion: "2.1.0", storeUrl: "https://play.google.com/store/apps/details?id=com.hel1x.ascendra" }
  );
  assert.equal(readUpdateRequired(426, { code: "update_required", storeUrl: "https://evil.example/" })?.storeUrl, null);
  assert.equal(readUpdateRequired(426, { code: "update_required", storeUrl: "javascript:alert(1)" })?.storeUrl, null);
});

// REQ-300: the update screen. Web reloads; a phone tries an over-the-air
// update first and only then points to the store.
describe("the update prompt", () => {
  const info = { message: "Please update Ascendra. This version is no longer supported.", minVersion: "2.1.0", storeUrl: "https://play.google.com/store/apps/details?id=com.hel1x.ascendra" };

  test("web reloads and never mentions a store", () => {
    const v = updatePromptView("web", "store", info, "2.0.0");
    assert.equal(v.action, "reload");
    assert.doesNotMatch(v.message, /store/i);
  });
  test("a phone checks for an over-the-air update first, then installs it, with no button while it works", () => {
    for (const phase of ["checking", "installing"] as const) {
      const v = updatePromptView("android", phase, info, "2.0.0");
      assert.equal(v.action, null);
      assert.equal(v.busy, true);
    }
  });
  test("with no update to install, a phone offers the store and says which version it has and needs", () => {
    const v = updatePromptView("ios", "store", info, "2.0.0");
    assert.equal(v.action, "store");
    assert.match(v.message, /You have version 2\.0\.0; version 2\.1\.0 or newer is needed\./);
  });
  test("with no store link (iOS before IOS_APP_STORE_URL is set) it says what to do by hand and lets the learner check again", () => {
    const v = updatePromptView("ios", "store", { ...info, storeUrl: null }, "2.0.0");
    assert.equal(v.action, "check-again");
    assert.match(v.message, /Open your app store/);
  });
  test("a server that names no minimum or no message still gives a sentence", () => {
    assert.equal(versionLine("2.0.0", null), "");
    const v = updatePromptView("android", "store", { message: " ", minVersion: null, storeUrl: info.storeUrl }, "2.0.0");
    assert.equal(v.message, "Please update Ascendra.");
  });
  test("a phone looks for an update only where updates are on (not Expo Go or a development build)", () => {
    assert.equal(shouldTryOta("android", true), true);
    assert.equal(shouldTryOta("ios", false), false);
    assert.equal(shouldTryOta("web", true), false);
  });
  test("the screen runs the over-the-air check before the store and reloads on the web", () => {
    const src = readFileSync(new URL("../components/UpdateRequired.tsx", import.meta.url), "utf8");
    assert.match(src, /checkForUpdateAsync\(\)[\s\S]*fetchUpdateAsync\(\)[\s\S]*reloadAsync\(\)/);
    assert.match(src, /window\.location\.reload\(\)/);
    assert.match(src, /Linking\.openURL\(info\.storeUrl/);
  });
});
