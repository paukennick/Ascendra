// REQ-175: the app-version header, legacy detection and the minimum version.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APP_PLATFORM_HEADER,
  APP_VERSION_HEADER,
  PLAY_STORE_URL,
  UPDATE_REQUIRED_CODE,
  appClient,
  compareSemver,
  isLegacyClient,
  minAppVersion,
  needsUpdate,
  parseSemver,
  storeUrlFor,
  updateRequiredBody,
} from "./client-version";
import { acceptableTermsVersions, CURRENT_TERMS_VERSION, PREVIOUS_TERMS_VERSION, isAcceptableTermsVersion } from "./legal";
import { allowedOriginsFor } from "../proxy";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const req = (h: Record<string, string> = {}) => new Request("http://t/api/x", { headers: h });

test("parseSemver reads version and build, refuses anything else", () => {
  assert.deepEqual(parseSemver("2.0.0+u.abcdef12"), { version: [2, 0, 0], build: "u.abcdef12" });
  assert.deepEqual(parseSemver(" 10.2.33 "), { version: [10, 2, 33], build: null });
  for (const bad of ["", "2", "2.0", "v2.0.0", "2.0.0-beta", "2.0.0+", "2.0.0+a b", "99999.0.0", null, undefined]) {
    assert.equal(parseSemver(bad as string), null, String(bad));
  }
});

test("compareSemver orders numerically, not as text", () => {
  assert.equal(compareSemver([2, 10, 0], [2, 9, 0]), 1);
  assert.equal(compareSemver([2, 0, 0], [2, 0, 0]), 0);
  assert.equal(compareSemver([1, 99, 99], [2, 0, 0]), -1);
});

test("legacy means the header is absent; an unreadable header is not legacy", () => {
  assert.equal(isLegacyClient(req()), true);
  assert.equal(appClient(req()), null);
  assert.equal(isLegacyClient(req({ [APP_VERSION_HEADER]: "garbage" })), false);
  assert.deepEqual(appClient(req({ [APP_VERSION_HEADER]: "garbage" })), { version: null, build: null, platform: null });
  assert.deepEqual(appClient(req({ "x-ascendra-app": "2.0.0+web", [APP_PLATFORM_HEADER]: "WEB" })), {
    version: [2, 0, 0],
    build: "web",
    platform: "web",
  });
});

test("legacy clients may accept the previous Terms version; headered clients only the current one", () => {
  assert.deepEqual(acceptableTermsVersions({ legacy: false }), [CURRENT_TERMS_VERSION]);
  assert.deepEqual(acceptableTermsVersions({ legacy: true }), [CURRENT_TERMS_VERSION, PREVIOUS_TERMS_VERSION]);
  assert.equal(isAcceptableTermsVersion(PREVIOUS_TERMS_VERSION, { legacy: false }), false);
  assert.equal(isAcceptableTermsVersion(PREVIOUS_TERMS_VERSION, { legacy: true }), true);
  assert.equal(isAcceptableTermsVersion("2020-01-01", { legacy: true }), false);
});

test("MIN_APP_VERSION: unset or unreadable means no minimum", () => {
  assert.equal(minAppVersion({}), null);
  assert.equal(minAppVersion({ MIN_APP_VERSION: "" }), null);
  assert.equal(minAppVersion({ MIN_APP_VERSION: "two" }), null);
  assert.deepEqual(minAppVersion({ MIN_APP_VERSION: "2.1.0" }), [2, 1, 0]);
});

test("needsUpdate: below the minimum or unreadable; never for legacy or with no minimum", () => {
  const min = [2, 1, 0] as const;
  assert.equal(needsUpdate(req({ [APP_VERSION_HEADER]: "2.0.9+embedded" }), min), true);
  assert.equal(needsUpdate(req({ [APP_VERSION_HEADER]: "2.1.0+embedded" }), min), false);
  assert.equal(needsUpdate(req({ [APP_VERSION_HEADER]: "3.0.0+web" }), min), false);
  assert.equal(needsUpdate(req({ [APP_VERSION_HEADER]: "garbage" }), min), true);
  assert.equal(needsUpdate(req(), min), false, "webhooks, cron and pre-header builds are not checked");
  assert.equal(needsUpdate(req({ [APP_VERSION_HEADER]: "0.0.1+web" }), null), false);
});

test("the 426 body names the code, the minimum and only a real store link", () => {
  const body = updateRequiredBody(req({ [APP_VERSION_HEADER]: "2.0.0+embedded", [APP_PLATFORM_HEADER]: "android" }), [2, 1, 0], {});
  assert.equal(body.code, UPDATE_REQUIRED_CODE);
  assert.equal(body.minVersion, "2.1.0");
  assert.equal(body.storeUrl, PLAY_STORE_URL);
  assert.match(body.error, /update Ascendra/i);
  assert.equal(storeUrlFor("ios", {}), null);
  assert.equal(storeUrlFor("ios", { IOS_APP_STORE_URL: "https://evil.example/x" }), null);
  assert.equal(storeUrlFor("ios", { IOS_APP_STORE_URL: "https://apps.apple.com/app/id1" }), "https://apps.apple.com/app/id1");
  assert.equal(storeUrlFor("web", {}), null);
});

test("proxy allows the new headers cross-origin and answers 426 before routes (static)", () => {
  assert.ok(allowedOriginsFor({}).length > 0);
  const src = readFileSync(join(__dirname, "..", "proxy.ts"), "utf8");
  assert.match(src, /X-Ascendra-App, X-Ascendra-Platform/);
  assert.match(src, /status: 426/);
});
