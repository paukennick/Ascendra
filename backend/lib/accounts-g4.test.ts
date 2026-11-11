// REQ-219 (FAIL-1106): unit tests, no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { errorEvent, routeOnly } from "./error-tracker";

test("FAIL-1106: error reports carry the path, never the query string or fragment where one-time tokens ride", () => {
  assert.equal(routeOnly("/verify-email?token=abc123SECRET&x=1"), "/verify-email");
  assert.equal(routeOnly("/reset-password?token=SECRET#frag"), "/reset-password");
  assert.equal(routeOnly("/api/units/123/check"), "/api/units/123/check");
  assert.equal(routeOnly(undefined), undefined);
  const ev = errorEvent(new Error("x"), { route: "/confirm-email-change?token=SECRET", requestId: "r1" });
  assert.equal(ev.tags.route, "/confirm-email-change");
  assert.equal(JSON.stringify(ev).includes("SECRET"), false);
});

test("FAIL-1106: instrumentation.ts passes the path through routeOnly", async () => {
  const src = (await import("node:fs")).readFileSync("instrumentation.ts", "utf8");
  assert.match(src, /routeOnly\(request\.path\)/);
  assert.equal(/route:\s*request\.path/.test(src), false);
});
