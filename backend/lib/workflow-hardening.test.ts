// REQ-207 (FAIL-944, 949, 950, 951, 952, 955): the repository's CI and
// configuration hardening, checked as text so a later edit that loosens it
// fails `npm test` instead of review. Reads ../.github, ../.mcp.json and the
// sandbox files relative to backend/ (where `npm test` runs).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "..");
const WF = join(ROOT, ".github", "workflows");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const workflows = readdirSync(WF).filter((f) => f.endsWith(".yml")).map((f) => ({ name: f, text: readFileSync(join(WF, f), "utf8") }));
const wf = (name: string) => workflows.find((w) => w.name === name)!.text;

// Actions that cannot be pinned yet: resolving a tag to a commit needs GitHub
// API access that the session this was written in did not have. Run
// `node .github/scripts/pin-actions.mjs`, commit the result, then empty this
// list. A NEW unpinned action fails the test either way.
const PENDING_PINS = new Set([
  "actions/cache@v4",
  "actions/checkout@v4",
  "actions/setup-node@v4",
  "actions/setup-python@v5",
  "actions/upload-artifact@v4",
  "expo/expo-github-action@v8",
]);

describe("FAIL-951: workflow permissions, pins, tokens", () => {
  test("every workflow declares top-level permissions; ci, migrate and keepalive are read-only", () => {
    for (const w of workflows) assert.match(w.text, /^permissions:/m, `${w.name} has no top-level permissions`);
    for (const n of ["ci.yml", "migrate-production.yml", "keepalive.yml"]) {
      assert.match(wf(n), /^permissions:\n  contents: read\n(?!  )/m, `${n} must be exactly contents: read`);
    }
  });

  test("third-party actions are pinned to a commit SHA with the version in a comment (or listed as pending)", () => {
    const seen = new Set<string>();
    for (const w of workflows) {
      for (const m of w.text.matchAll(/^\s*(?:-\s+)?uses:\s*([^\s#]+)(\s*#\s*(\S+))?/gm)) {
        const ref = m[1];
        if (ref.startsWith("./")) continue;
        const [, sha] = ref.split("@");
        if (/^[0-9a-f]{40}$/.test(sha)) {
          assert.ok(m[3], `${w.name}: ${ref} is pinned but has no version comment`);
        } else {
          assert.ok(PENDING_PINS.has(ref), `${w.name}: ${ref} is neither pinned nor in PENDING_PINS`);
          seen.add(ref);
        }
      }
    }
    for (const p of PENDING_PINS) assert.ok(seen.has(p), `${p} is in PENDING_PINS but no longer used unpinned: remove it`);
  });

  test("the sandbox's base images are pinned by digest, and every place names the same node digest", () => {
    assert.match(read("backend/sandbox/python.Dockerfile"), /^FROM python:3\.13-slim@sha256:[0-9a-f]{64}$/m);
    const runner = read("backend/lib/sandbox-runner.ts");
    const digest = /"node:22-slim@(sha256:[0-9a-f]{64})"/.exec(runner)?.[1];
    assert.ok(digest, "sandbox-runner default node image has a digest");
    for (const n of ["ci.yml", "content-sandbox.yml", "factcheck-eval.yml"]) {
      assert.match(wf(n), new RegExp(`docker pull node:22-slim@${digest}\\b`), n);
      assert.doesNotMatch(wf(n), /docker pull node:22-slim\s*$/m, n);
    }
  });

  test("EXPO_TOKEN is given to steps, never to the whole job", () => {
    const t = wf("eas-update.yml");
    assert.doesNotMatch(t, /^ {6}EXPO_TOKEN:/m, "job-level env");
    const lines = t.split("\n").filter((l) => l.includes("EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}"));
    assert.ok(lines.length >= 4);
    for (const l of lines) assert.match(l, /^ {10}EXPO_TOKEN:|^ {10}token:/, l);
    // every step that runs eas has the token in its env
    for (const step of t.split(/\n {6}- /).slice(1)) {
      if (/^\s*(?:run:|.*\n\s*run:)/.test(step) && /\beas (whoami|build|update|fingerprint)/.test(step)) {
        assert.match(step, /EXPO_TOKEN: \$\{\{ secrets\.EXPO_TOKEN \}\}/, step.split("\n")[0]);
      }
    }
  });

  test("dependabot covers npm (both packages), actions and the sandbox image", () => {
    const d = read(".github/dependabot.yml");
    for (const needle of ["directory: /backend\n", "directory: /mobile\n", "package-ecosystem: github-actions", "directory: /backend/sandbox"]) {
      assert.ok(d.includes(needle), needle);
    }
  });

  test("Node is one major everywhere, inside package.json engines", () => {
    const versions = new Set(workflows.flatMap((w) => [...w.text.matchAll(/node-version:\s*(\d+)/g)].map((m) => m[1])));
    assert.deepEqual([...versions], ["24"]);
    for (const p of ["backend/package.json", "mobile/package.json"]) {
      assert.equal(JSON.parse(read(p)).engines.node, ">=22 <25");
    }
  });

  test("the mobile audit blocks (known advisories listed with reasons) and its gate has tests", () => {
    const ci = wf("ci.yml");
    assert.match(ci, /audit-gate\.mjs/);
    assert.doesNotMatch(ci, /npm audit[^\n]*\|\| true\n\s+working-directory: mobile/);
    const known = JSON.parse(read("mobile/audit-known.json")) as Record<string, string>;
    for (const [k, why] of Object.entries(known)) assert.ok(why.length > 20, `${k} needs a reason`);
    assert.ok(existsSync(join(ROOT, ".github/scripts/audit-gate.test.mjs")));
  });
});

describe("FAIL-944: the production migration job", () => {
  const m = wf("migrate-production.yml");
  test("has a job timeout, and 'status before' no longer swallows failures", () => {
    assert.match(m, /timeout-minutes: 30/);
    const before = m.slice(m.indexOf("- name: Status before"), m.indexOf("- name: Apply pending migrations"));
    assert.doesNotMatch(before, /\|\|\s*true/);
    assert.match(before, /-ne 2/, "exit 2 (objects missing) is the only tolerated code");
  });
  test("the runner sets a session lock_timeout before each migration's transaction", () => {
    const src = read("backend/supabase/apply-migration.ts");
    assert.match(src, /lockTimeoutSql/);
    assert.ok(src.indexOf("lockTimeoutSql") < src.indexOf('client.query("begin")'));
  });
  test("backup workflows use the reviewer-free environment so a required reviewer cannot stall them", () => {
    assert.match(wf("db-backup.yml"), /environment: production-backup/);
    assert.match(wf("backup-housekeeping.yml"), /environment: production-backup/);
    assert.match(m, /environment: production-database/);
  });
});

describe("FAIL-940: CI runs the integration suite as app_runtime", () => {
  test("the database job runs db-tests-as-runtime.sh and the script exists", () => {
    assert.match(wf("ci.yml"), /bash scripts\/ci\/db-tests-as-runtime\.sh/);
    assert.ok(existsSync(join(ROOT, "backend", "scripts", "ci", "db-tests-as-runtime.sh")));
  });
});

describe("FAIL-949/950: keepalive does not print the health body", () => {
  test("body discarded; only the status code is logged", () => {
    const k = wf("keepalive.yml");
    assert.match(k, /-o \/dev\/null/);
    assert.doesNotMatch(k, /\bcat\b/);
  });
});

describe("FAIL-952: .mcp.json", () => {
  test("Supabase MCP is read-only and has no account feature", () => {
    const url = new URL(JSON.parse(read(".mcp.json")).mcpServers.supabase.url);
    assert.equal(url.searchParams.get("read_only"), "true");
    const features = (url.searchParams.get("features") ?? "").split(",");
    assert.ok(features.length > 0);
    assert.ok(!features.includes("account"));
  });
});

describe("FAIL-955: the hourly sandbox job raises an alert", () => {
  test("a failure() job with issues: write only, deduplicated, and nothing sensitive in the body", () => {
    const s = wf("content-sandbox.yml");
    const alert = s.slice(s.indexOf("\n  alert:"));
    assert.match(alert, /needs: exec/);
    assert.match(alert, /if: failure\(\)/);
    assert.match(alert, /permissions:\n\s+issues: write/);
    assert.match(alert, /--state open/);
    assert.doesNotMatch(alert, /RECHECK_DATABASE_URL|secrets\./);
    assert.match(s, /^permissions:\n  contents: read\n/m);
  });
});
