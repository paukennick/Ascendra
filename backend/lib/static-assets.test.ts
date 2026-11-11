// REQ-207 (FAIL-948): static-file containment and caching in the web-app route.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { cacheControlFor, resolveInside } from "./static-assets";

const DIR = path.join("/srv/app", "public");

describe("resolveInside", () => {
  test("a file inside the directory resolves", () => {
    assert.equal(resolveInside(DIR, "/assets/a.png"), path.join(DIR, "assets", "a.png"));
    assert.equal(resolveInside(DIR, "/"), DIR);
  });
  test("a sibling that merely starts with the directory's name is refused (the old startsWith bug)", () => {
    assert.equal(resolveInside(DIR, "/../public-secrets/key.pem"), null);
    assert.equal(resolveInside(DIR, "/../publicity/x"), null);
    assert.equal("/srv/app/public-secrets/key.pem".startsWith(DIR), true, "the old check let it through");
  });
  test("traversal, encoded traversal and NUL bytes are refused", () => {
    assert.equal(resolveInside(DIR, "/../../etc/passwd"), null);
    assert.equal(resolveInside(DIR, "/%2e%2e/%2e%2e/etc/passwd"), null);
    assert.equal(resolveInside(DIR, "/a%00b"), null);
    assert.equal(resolveInside(DIR, "/%E0%A4%A"), null, "malformed escape");
  });
});

describe("cacheControlFor", () => {
  const IMMUTABLE = "public, max-age=31536000, immutable";
  test("Expo's content-hashed files are immutable", () => {
    for (const f of [
      "_expo/static/js/web/entry-79968fd85cfe48a4f55ba44b4343e18f.js",
      "assets/assets/brand-mark.e20a0dc53d70c1e3307c10fc62225e5e.png",
      "assets/vendor/x/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf",
      "assets/x/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png",
    ]) assert.equal(cacheControlFor(path.join(DIR, f)), IMMUTABLE, f);
  });
  test("everything else revalidates within the hour", () => {
    for (const f of ["favicon.ico", "metadata.json", "robots.txt", "assets/logo.png", "assets/a.1234.png"]) {
      assert.doesNotMatch(cacheControlFor(path.join(DIR, f)), /immutable/, f);
    }
  });
});
