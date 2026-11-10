// REQ-207 (FAIL-947): the CSP and HSTS the app sends, as configuration.
// The browser check (zero console violations on the real pages) is
// docs/ops/csp.md, run with Playwright against a local build.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildHeaders, APP_CSP, NEXT_PAGE_CSP, NEXT_RENDERED_PAGES } = require("../security-headers.js");

type Rule = { source: string; headers: { key: string; value: string }[] };
const rules = (env = {}): Rule[] => buildHeaders(env);
const header = (r: Rule, k: string) => r.headers.find((h) => h.key === k)?.value;

describe("security headers", () => {
  test("every response gets HSTS (no includeSubDomains), nosniff, frame denial and a referrer policy", () => {
    const base = rules()[0];
    assert.equal(base.source, "/:path*");
    assert.equal(header(base, "Strict-Transport-Security"), "max-age=31536000");
    assert.equal(header(base, "X-Content-Type-Options"), "nosniff");
    assert.equal(header(base, "X-Frame-Options"), "DENY");
    assert.ok(header(base, "Referrer-Policy"));
  });
  test("the web app CSP: own-origin scripts only, no eval, no inline script, no framing, no plugins", () => {
    const d = Object.fromEntries(APP_CSP.split("; ").map((x: string) => [x.split(" ")[0], x.split(" ").slice(1)]));
    assert.deepEqual(d["script-src"], ["'self'"]);
    assert.ok(!APP_CSP.includes("unsafe-eval"));
    assert.deepEqual(d["connect-src"], ["'self'"]);
    assert.deepEqual(d["frame-ancestors"], ["'none'"]);
    assert.deepEqual(d["object-src"], ["'none'"]);
    assert.deepEqual(d["base-uri"], ["'self'"]);
    assert.ok(!/https?:/.test(APP_CSP), "no third-party origin is allowed");
  });
  test("Next-rendered pages are the only ones allowed inline script, and each is listed by name", () => {
    assert.match(NEXT_PAGE_CSP, /script-src 'self' 'unsafe-inline'/);
    assert.ok(!NEXT_PAGE_CSP.includes("unsafe-eval"));
    for (const p of NEXT_RENDERED_PAGES) {
      const r = rules().find((x) => x.source === `/${p}`);
      assert.ok(r, p);
      assert.equal(header(r!, "Content-Security-Policy"), NEXT_PAGE_CSP);
    }
    const dirs = readdirSyncApp();
    for (const p of dirs) assert.ok(NEXT_RENDERED_PAGES.includes(p), `app/${p}/page.tsx is a Next-rendered page missing from security-headers.js`);
  });
  test("the app rule excludes api, _next and the Next pages; the API rule denies everything", () => {
    const app = rules().find((r) => header(r, "Content-Security-Policy") === APP_CSP)!;
    assert.match(app.source, /\(\?!api/);
    assert.match(app.source, /_next/);
    const api = rules().find((r) => r.source === "/api/:path*")!;
    assert.match(header(api, "Content-Security-Policy")!, /^default-src 'none'/);
  });
  test("CSP_REPORT_ONLY=true switches to the report-only header, same policy", () => {
    const enforced = rules().find((r) => header(r, "Content-Security-Policy") === APP_CSP);
    const ro = rules({ CSP_REPORT_ONLY: "true" }).find((r) => header(r, "Content-Security-Policy-Report-Only") === APP_CSP);
    assert.ok(enforced && ro);
    assert.equal(header(ro!, "Content-Security-Policy"), undefined);
  });
});

function readdirSyncApp(): string[] {
  const { readdirSync, existsSync } = require("node:fs") as typeof import("node:fs");
  const { join } = require("node:path") as typeof import("node:path");
  const app = join(process.cwd(), "app");
  return readdirSync(app, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(app, e.name, "page.tsx")))
    .map((e) => e.name);
}
