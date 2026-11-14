// REQ-261: the analytics loader (src/lib/webAnalytics.web.ts) and where it is
// wired: web only, once, off for GPC / Do Not Track, off unless the build
// flag is on, never in the native bundle.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resetWebAnalyticsForTests, startWebAnalytics } from "./webAnalytics.web.ts";
import { redactEvent } from "./analyticsPrivacy.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

type Call = { props: Record<string, unknown> | undefined };
function fakes() {
  const analytics: Call[] = [];
  const speed: Call[] = [];
  return {
    analytics,
    speed,
    deps: {
      inject: ((props?: Record<string, unknown>) => void analytics.push({ props })) as never,
      injectSpeedInsights: ((props?: Record<string, unknown>) => {
        speed.push({ props });
        return null;
      }) as never,
    },
  };
}

beforeEach(() => resetWebAnalyticsForTests());

describe("loading the scripts", () => {
  test("flag on, no opt-out signal: both scripts load once, each with the redacting beforeSend", () => {
    const f = fakes();
    assert.equal(startWebAnalytics({ ...f.deps, flag: "on", signals: { navigator: { globalPrivacyControl: false, doNotTrack: "0" } } }), true);
    assert.equal(f.analytics.length, 1);
    assert.equal(f.speed.length, 1);
    assert.equal(f.analytics[0].props?.beforeSend, redactEvent);
    assert.equal(f.speed[0].props?.beforeSend, redactEvent);
    // the same-origin script, never the development one on another host
    assert.equal(f.analytics[0].props?.mode, "production");
    // nothing that identifies a visitor or sets up events is passed
    assert.deepEqual(Object.keys(f.analytics[0].props!).sort(), ["beforeSend", "mode"]);
    assert.deepEqual(Object.keys(f.speed[0].props!).sort(), ["beforeSend"]);
  });

  test("called again, it adds nothing more", () => {
    const f = fakes();
    const args = { ...f.deps, flag: "on", signals: {} };
    assert.equal(startWebAnalytics(args), true);
    assert.equal(startWebAnalytics(args), false);
    assert.equal(f.analytics.length + f.speed.length, 2);
  });

  test("Global Privacy Control: neither script loads", () => {
    const f = fakes();
    assert.equal(startWebAnalytics({ ...f.deps, flag: "on", signals: { navigator: { globalPrivacyControl: true } } }), false);
    assert.equal(f.analytics.length + f.speed.length, 0);
  });

  test("Do Not Track: neither script loads", () => {
    const f = fakes();
    assert.equal(startWebAnalytics({ ...f.deps, flag: "on", signals: { navigator: { doNotTrack: "1" } } }), false);
    assert.equal(f.analytics.length + f.speed.length, 0);
  });

  test("a later call after an opt-out can still load once the signal is gone (nothing was marked started)", () => {
    const f = fakes();
    startWebAnalytics({ ...f.deps, flag: "on", signals: { navigator: { doNotTrack: "1" } } });
    assert.equal(startWebAnalytics({ ...f.deps, flag: "on", signals: {} }), true);
  });

  test("flag off or unset: neither script loads", () => {
    for (const flag of [undefined, "", "off", "0", "false"]) {
      const f = fakes();
      assert.equal(startWebAnalytics({ ...f.deps, flag, signals: {} }), false, String(flag));
      assert.equal(f.analytics.length + f.speed.length, 0);
    }
  });

  test("with no flag given, the build's own value is used: unset in a test run means off", () => {
    const f = fakes();
    delete process.env.EXPO_PUBLIC_WEB_ANALYTICS;
    assert.equal(startWebAnalytics({ ...f.deps, signals: {} }), false);
    process.env.EXPO_PUBLIC_WEB_ANALYTICS = "on";
    try {
      assert.equal(startWebAnalytics({ ...f.deps, signals: {} }), true);
    } finally {
      delete process.env.EXPO_PUBLIC_WEB_ANALYTICS;
    }
  });

  test("a script that throws cannot break the app", () => {
    const boom = (() => {
      throw new Error("blocked");
    }) as never;
    assert.doesNotThrow(() => startWebAnalytics({ inject: boom, injectSpeedInsights: boom, flag: "on", signals: {} }));
  });

  test("the real packages, called in Node (no browser), do nothing and do not throw", () => {
    assert.doesNotThrow(() => startWebAnalytics({ flag: "on", signals: {} }));
  });
});

describe("where it is wired", () => {
  test("the native file imports nothing, so the packages never reach the phone bundle", () => {
    const native = read("./webAnalytics.ts");
    assert.ok(!/^\s*import\b/m.test(native), "webAnalytics.ts must not import anything");
    assert.ok(!/@vercel/.test(native.replace(/\/\/.*$/gm, "")));
    assert.match(native, /export function startWebAnalytics\(\): void/);
  });

  test("only the .web.ts file imports the Vercel packages, and nothing else in the app does", () => {
    const web = read("./webAnalytics.web.ts");
    assert.match(web, /from "@vercel\/analytics"/);
    assert.match(web, /from "@vercel\/speed-insights"/);
    for (const rel of ["../../app/_layout.tsx", "./webAnalytics.ts", "./analyticsPrivacy.ts", "../api/client.ts"]) {
      assert.ok(!read(rel).includes("@vercel/"), `${rel} must not import the analytics packages`);
    }
  });

  test("no custom events and no identifiers: the loader never calls track or pageview", () => {
    const web = read("./webAnalytics.web.ts").replace(/\/\/.*$/gm, "");
    assert.ok(!/\btrack\b|\bpageview\(|identify|setUser|userId/.test(web));
  });

  test("the root layout starts it once, through the platform-resolved module", () => {
    const layout = read("../../app/_layout.tsx");
    assert.equal(layout.match(/startWebAnalytics\(\)/g)?.length, 1);
    assert.match(layout, /import \{ startWebAnalytics \} from "@\/lib\/webAnalytics";/);
  });

  test("the packages are pinned exactly, at versions released at least two weeks before this change", () => {
    const pkg = JSON.parse(read("../../package.json")).dependencies;
    assert.equal(pkg["@vercel/analytics"], "2.0.1");
    assert.equal(pkg["@vercel/speed-insights"], "2.0.0");
  });

  test("the web build script turns it on for production builds only, and lets an explicit value win", () => {
    const sh = readFileSync(new URL("../../../backend/scripts/build-webapp.sh", import.meta.url), "utf8");
    assert.match(sh, /if \[ -z "\$\{EXPO_PUBLIC_WEB_ANALYTICS:-\}" \]; then/);
    assert.match(sh, /if \[ "\$\{VERCEL_ENV:-\}" = "production" \]; then EXPO_PUBLIC_WEB_ANALYTICS=on; else EXPO_PUBLIC_WEB_ANALYTICS=off; fi/);
    assert.match(sh, /^export EXPO_PUBLIC_WEB_ANALYTICS$/m);
  });
});
