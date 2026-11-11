// FAIL-1166: the Android preview build summary never throws and always names
// the build, whatever shape `eas build --json` has.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPageUrl, firstBuild, summarize } from "./eas-build-summary.mjs";

const ID = "0f4a1b2c-3d4e-4f50-8a9b-1c2d3e4f5a6b";
const old = {
  id: ID,
  status: "FINISHED",
  appVersion: "1.4.0",
  appBuildVersion: "27",
  project: { slug: "ascendra", ownerAccount: { name: "someowner" } },
  artifacts: { applicationArchiveUrl: "https://expo.dev/artifacts/eas/abc.apk" },
};

test("the old shape still gives the constructed page, version and APK", () => {
  const s = summarize(JSON.stringify([old]));
  assert.match(s, /Install page \(QR code\): https:\/\/expo\.dev\/accounts\/someowner\/projects\/ascendra\/builds\/0f4a1b2c-/);
  assert.match(s, /Version: 1\.4\.0 \(27\)/);
  assert.match(s, /APK: https:\/\/expo\.dev\/artifacts\/eas\/abc\.apk/);
  assert.match(s, /Status: FINISHED/);
});

test("the shape that crashed the job (no project.ownerAccount) does not throw and falls back to the build id", () => {
  const { project: _p, ...noProject } = old;
  const s = summarize(JSON.stringify([noProject]));
  assert.match(s, new RegExp(`Build id: ${ID}`));
  assert.doesNotMatch(s, /Install page/);
  const partial = summarize(JSON.stringify([{ ...old, project: { slug: "ascendra" } }]));
  assert.match(partial, new RegExp(`Build id: ${ID}`));
  assert.doesNotMatch(partial, /Install page/);
});

test("a page URL from EAS is used as given, if it is an expo.dev page", () => {
  const page = `https://expo.dev/accounts/o/projects/p/builds/${ID}`;
  assert.equal(buildPageUrl({ ...old, buildDetailsPageUrl: page, project: undefined }), page);
  assert.equal(buildPageUrl({ id: ID, buildDetailsPageUrl: "https://evil.example/x" }), null);
  assert.match(summarize(JSON.stringify([{ id: ID, buildDetailsPageUrl: "javascript:alert(1)" }])), new RegExp(`Build id: ${ID}`));
});

test("a single object, or log lines before the JSON, are read", () => {
  assert.equal(firstBuild(JSON.stringify(old)).id, ID);
  assert.equal(firstBuild(`Using remote server\n${JSON.stringify([old])}`).id, ID);
});

test("unreadable, empty or missing output is reported, not thrown", () => {
  for (const raw of ["", "   ", "not json", "[", "[]", "null", "[null]", "[1]", '"x"', undefined]) {
    assert.match(summarize(raw), /could not be read/, String(raw));
  }
});

test("odd values never reach the summary: no markdown, no non-https links", () => {
  const s = summarize(JSON.stringify([{
    id: ID,
    status: "FINISHED\n## injected",
    appVersion: "1.0.0",
    artifacts: { applicationArchiveUrl: "http://insecure.example/a.apk", buildUrl: "https://ok.example/b.apk\n[x](y)" },
  }]));
  assert.doesNotMatch(s, /injected/);
  assert.doesNotMatch(s, /APK:/);
  assert.match(s, /Version: 1\.0\.0/);
});
