// REQ-306: this device's random id and where the API client sends it.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEVICE_ID_HEADER, isDeviceId, newDeviceId } from "./deviceId.ts";

describe("device id (REQ-306)", () => {
  test("a new id is 32 hex characters and passes the server's rule", () => {
    const id = newDeviceId((n) => Uint8Array.from({ length: n }, (_, i) => (i * 37) % 256));
    assert.match(id, /^[0-9a-f]{32}$/);
    assert.ok(isDeviceId(id));
  });
  test("junk is not an id", () => {
    for (const v of [null, undefined, "", "short", "x".repeat(65), "has spaces in it 1234", 42]) assert.equal(isDeviceId(v), false);
  });
  test("the API client sends it on every request, and the server allows the header", () => {
    assert.match(readFileSync("src/api/client.ts", "utf8"), /\.\.\.deviceIdHeader,/);
    assert.match(readFileSync("app/_layout.tsx", "utf8"), /import "@\/updates\/deviceIdentity";/);
    assert.ok(readFileSync("../backend/proxy.ts", "utf8").includes(DEVICE_ID_HEADER));
  });
  test("the web keeps it in localStorage (one per browser, not per tab)", () => {
    assert.match(readFileSync("src/updates/deviceIdentity.ts", "utf8"), /window\.localStorage\.setItem\(DEVICE_ID_KEY/);
  });
});
