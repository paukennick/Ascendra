// FAIL-1167 (M8): Android only offers a password saved for the website inside
// the app when the app declares the website too (Digital Asset Links:
// asset_statements in the manifest). plugins/withAssetStatements.js writes it.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, rel), "utf8");
const plugin = createRequire(import.meta.url)("../../plugins/withAssetStatements.js");
const SITE = "https://www.ascendra-learn.com";

describe("withAssetStatements", () => {
  test("the statement says: this app shares login credentials with the website", () => {
    assert.deepEqual(plugin.statementList(SITE), [
      { relation: ["delegate_permission/common.get_login_creds"], target: { namespace: "web", site: SITE } },
    ]);
  });

  test("strings.xml value is the JSON with backslash-escaped quotes, as in Google's example", () => {
    const v: string = plugin.stringsValue(SITE);
    assert.ok(v.startsWith('[{\\"relation\\":[\\"delegate_permission/common.get_login_creds\\"]'));
    assert.deepEqual(JSON.parse(v.replace(/\\"/g, '"')), plugin.statementList(SITE));
    assert.doesNotMatch(v, /(^|[^\\])"/, "no bare double quote");
  });

  test("the manifest gets one asset_statements meta-data pointing at the string, even if run twice", () => {
    const manifest = { manifest: { application: [{ "meta-data": [{ $: { "android:name": "other", "android:value": "1" } }] }] } };
    plugin.addMetaData(manifest);
    plugin.addMetaData(manifest);
    const md = manifest.manifest.application[0]["meta-data"];
    assert.equal(md.length, 2);
    assert.deepEqual(md.filter((m: any) => m.$["android:name"] === "asset_statements").map((m: any) => m.$), [
      { "android:name": "asset_statements", "android:resource": "@string/asset_statements" },
    ]);
    assert.throws(() => plugin.addMetaData({ manifest: {} }), /no <application>/);
  });

  test("strings.xml gets one non-translatable asset_statements string, other strings kept", () => {
    const strings = { resources: { string: [{ $: { name: "app_name" }, _: "Ascendra" }] } };
    plugin.addString(strings, SITE);
    plugin.addString(strings, SITE);
    assert.equal(strings.resources.string.length, 2);
    const s = strings.resources.string.find((x: any) => x.$.name === "asset_statements");
    assert.equal(s.$.translatable, "false");
    assert.equal(s._, plugin.stringsValue(SITE));
    plugin.addString({ resources: {} }, SITE);
  });

  test("only an https origin is accepted", () => {
    assert.equal(plugin.normalizeSite("https://www.ascendra-learn.com/"), SITE);
    for (const bad of ["http://www.ascendra-learn.com", "https://www.ascendra-learn.com/login", "https://u:p@x.com", "https://x.com/?a=1", "ascendra-learn.com", "", undefined, 5]) {
      assert.throws(() => plugin.normalizeSite(bad), /withAssetStatements/, String(bad));
    }
    assert.throws(() => plugin(({}) as any, {}), /pass \{ site/);
  });
});

describe("app.json and assetlinks.json", () => {
  const app = JSON.parse(read("../../app.json")).expo;
  test("app.json runs the plugin for the production website", () => {
    const entry = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "./plugins/withAssetStatements");
    assert.ok(entry, "plugin is listed");
    assert.equal(entry[1].site, SITE);
    assert.equal(plugin.normalizeSite(entry[1].site), SITE);
  });
  test("the website still lists this app with get_login_creds, and the existing fingerprint was kept", () => {
    const links = JSON.parse(read("../../../backend/public/.well-known/assetlinks.json"));
    const mine = links.find((s: any) => s.target.namespace === "android_app" && s.target.package_name === app.android.package);
    assert.ok(mine);
    assert.ok(mine.relation.includes("delegate_permission/common.get_login_creds"));
    assert.ok(mine.target.sha256_cert_fingerprints.includes("2B:56:F8:D1:4C:86:2B:24:37:FD:D7:6D:A2:87:4A:2F:42:C6:1D:3F:EC:1B:96:8A:2F:55:D3:89:78:82:D5:C8"));
    for (const f of mine.target.sha256_cert_fingerprints) assert.match(f, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  });
});
