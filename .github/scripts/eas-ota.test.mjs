// REQ-176: run with `node --test .github/scripts/eas-ota.test.mjs`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBundleText, decide, renderSummary, resolveProfileEnv, shellExports } from "./eas-ota.mjs";

const build = (o) => ({
  id: o.id,
  platform: o.platform.toUpperCase(),
  status: o.status ?? "FINISHED",
  buildProfile: o.profile ?? "production",
  updateChannel: o.channel === null ? null : { name: o.channel ?? "production" },
  distribution: "STORE",
  appVersion: "2.0.0",
  appBuildVersion: o.n ?? "1",
  runtime: o.runtime ? { version: o.runtime } : null,
  completedAt: o.at ?? "2026-11-01T00:00:00.000Z",
  gitCommitHash: "abcdef1234",
});

const byPlatform = (ds) => Object.fromEntries(ds.map((d) => [d.platform, d]));

test("publishes only a platform whose runtime matches a finished build on the channel", () => {
  const d = byPlatform(
    decide({
      channel: "production",
      runtimes: { android: "AAA", ios: "III" },
      builds: [
        build({ id: "a1", platform: "android", runtime: "AAA" }),
        build({ id: "i1", platform: "ios", runtime: "OLD" }),
      ],
    }),
  );
  assert.equal(d.android.verdict, "match");
  assert.equal(d.android.publish, true);
  assert.equal(d.android.profile, "production");
  assert.equal(d.ios.verdict, "no-match");
  assert.equal(d.ios.publish, false);
  assert.equal(d.ios.compareBuild.id, "i1");
});

test("a match on another channel is reported but not published", () => {
  const d = byPlatform(
    decide({
      channel: "production",
      runtimes: { android: "AAA", ios: "III" },
      builds: [
        build({ id: "p1", platform: "android", runtime: "AAA", channel: "preview", profile: "preview" }),
        build({ id: "a0", platform: "android", runtime: "OLD", at: "2026-09-26T00:00:00Z" }),
      ],
    }),
  );
  assert.equal(d.android.verdict, "match-other-channel");
  assert.equal(d.android.publish, false);
  // Diff against the newest build on the target channel, not the preview one.
  assert.equal(d.android.compareBuild.id, "a0");
  assert.equal(d.ios.verdict, "no-builds");
});

test("unfinished builds and a missing runtime never publish", () => {
  const d = byPlatform(
    decide({
      channel: "production",
      runtimes: { android: null, ios: "III" },
      builds: [
        build({ id: "a1", platform: "android", runtime: "AAA" }),
        build({ id: "i1", platform: "ios", runtime: "III", status: "ERRORED" }),
      ],
    }),
  );
  assert.equal(d.android.verdict, "no-runtime");
  assert.equal(d.ios.verdict, "no-builds");
  assert.equal(d.android.publish || d.ios.publish, false);
});

test("compares against the newest build", () => {
  const d = byPlatform(
    decide({
      channel: "production",
      runtimes: { android: "NEW", ios: "x" },
      builds: [
        build({ id: "old", platform: "android", runtime: "R1", at: "2026-09-01T00:00:00Z" }),
        build({ id: "new", platform: "android", runtime: "R2", at: "2026-10-01T00:00:00Z" }),
      ],
    }),
  );
  assert.equal(d.android.compareBuild.id, "new");
});

test("summary says nothing will be published when nothing matches", () => {
  const decisions = decide({ channel: "production", runtimes: { android: "A", ios: "I" }, builds: [build({ id: "a", platform: "android", runtime: "B" })] });
  const s = renderSummary({ channel: "production", dryRun: false, decisions, updates: { currentPage: [] } });
  assert.match(s, /nothing to publish/);
  assert.match(s, /android: NO MATCH/);
  assert.doesNotMatch(s, /Result: publishing/);
});

test("profile env follows extends and the child wins", () => {
  const eas = { build: { production: { env: { A: "1", B: "2" } }, preview: { extends: "production", env: { B: "3" } } } };
  assert.deepEqual(resolveProfileEnv(eas, "preview"), { A: "1", B: "3" });
  assert.throws(() => resolveProfileEnv(eas, "nope"));
  assert.throws(() => resolveProfileEnv({ build: { x: { extends: "x" } } }, "x"));
});

test("shell exports quote values safely", () => {
  assert.equal(shellExports({ A: "it's" }), "export A='it'\\''s'\n");
  assert.throws(() => shellExports({ "A;rm": "x" }));
});

test("bundle check wants the production URL and no LAN URL", () => {
  const url = "https://backend.example.app";
  assert.deepEqual(checkBundleText(`x ${url} y`, url), []);
  assert.equal(checkBundleText("x", url).length, 1);
  assert.equal(checkBundleText(`${url} http://10.0.0.85:3000`, url).length, 1);
  assert.equal(checkBundleText(`${url} http://192.168.1.20:3000`, url).length, 1);
  // React Native's own Metro default is in every bundle and is not a leak.
  assert.deepEqual(checkBundleText(`${url} http://localhost:8081`, url), []);
  assert.equal(checkBundleText("anything", "").length, 1);
});
