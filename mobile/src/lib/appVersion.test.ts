// REQ-175: the app-version header and the "Update required" answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APP_VERSION, APP_PLATFORM_HEADER, APP_VERSION_HEADER, appHeaders, buildTag, readUpdateRequired } from "./appVersion.ts";

test("APP_VERSION matches app.json's expo.version", () => {
  const appJson = JSON.parse(readFileSync(new URL("../../app.json", import.meta.url), "utf8"));
  assert.equal(APP_VERSION, appJson.expo.version);
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
