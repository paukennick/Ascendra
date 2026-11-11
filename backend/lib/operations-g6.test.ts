// REQ-221 (audit of 2026-11-11, batch G6): operations and docs, checked as
// text so a later edit that undoes one fails `npm test` instead of review.
// Reads files relative to the repository root (backend/ is where it runs).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("FAIL-1160: a restore into a cluster without app_runtime and content_recheck", () => {
  const GRANT_BLOCK = /grant usage on schema public to content_recheck;[\s\S]*?grant insert on item_holdbacks, exec_check_runs to content_recheck;/;

  test("01 creates both roles NOLOGIN, only when missing", () => {
    const sql = read("backend/scripts/restore/01-roles-before-restore.sql");
    for (const role of ["app_runtime", "content_recheck"]) {
      assert.match(sql, new RegExp(`not exists \\(select 1 from pg_roles where rolname = '${role}'\\)`));
      assert.match(sql, new RegExp(`create role ${role} nologin nocreatedb nocreaterole;`));
    }
    assert.doesNotMatch(sql, /\blogin\s+password|superuser|bypassrls/i);
  });

  test("02 is migration 064's grant block, verbatim, and does not re-issue its policies", () => {
    const m064 = GRANT_BLOCK.exec(read("backend/supabase/migrations/064_recheck_role.sql"));
    const f02 = read("backend/scripts/restore/02-recheck-grants-after-restore.sql");
    assert.ok(m064, "064 grant block not found");
    assert.ok(f02.includes(m064[0]), "02 must contain 064's grant block exactly; update both together");
    assert.doesNotMatch(f02, /create policy|drop policy|create table|create role/i);
  });

  test("the drill creates the roles before pg_restore, then re-applies 071, then the grants", () => {
    const d = read("backend/scripts/restore-drill.sh");
    const at = (needle: string) => {
      const i = d.indexOf(needle);
      assert.ok(i > 0, needle);
      return i;
    };
    const roles = at("scripts/restore/01-roles-before-restore.sql");
    const restore = at("pg_restore --no-owner --no-privileges");
    const m071 = at("071_app_runtime_role.sql\" >/dev/null");
    const grants = at("scripts/restore/02-recheck-grants-after-restore.sql\" >/dev/null");
    assert.ok(roles < restore && restore < m071 && m071 < grants, "order: roles, pg_restore, 071, content_recheck grants");
  });

  test("CI restores into a second Postgres service that has never seen the roles", () => {
    const ci = read(".github/workflows/ci.yml");
    const job = ci.slice(ci.indexOf("  backup-drill:"), ci.indexOf("  mobile:"));
    assert.match(job, /postgres-restore:\n\s+image: postgres:17/);
    assert.match(job, /ports: \["5433:5432"\]/);
    assert.match(job, /RESTORE_ADMIN_URL: postgres:\/\/postgres:postgres@localhost:5433\/postgres/);
    const t = read("backend/scripts/ci/backup-drill-test.sh");
    assert.match(t, /RESTORE_ADMIN_URL is the same server as ADMIN_URL/);
    assert.match(t, /already has role\(s\)/);
    assert.match(t, /role "app_runtime" does not exist/, "the canary: a plain restore must fail on the missing role");
    assert.match(t, /same columns, tables, sequences, functions, policies and settings as the source/);
  });

  test("the runbook and the drill doc give the same order and name both files", () => {
    for (const p of ["docs/operations-runbook.md", "docs/restore-drill.md"]) {
      const t = read(p);
      assert.ok(t.includes("scripts/restore/01-roles-before-restore.sql"), p);
      assert.ok(t.includes("scripts/restore/02-recheck-grants-after-restore.sql"), p);
      const restoreStep = p.endsWith("runbook.md") ? "--dbname=\"$TARGET_DIRECT_URL\"" : "time pg_restore";
      assert.ok(t.indexOf("01-roles-before-restore.sql") < t.indexOf(restoreStep), `${p}: the roles come before the pg_restore step`);
    }
  });
});

describe("FAIL-1162: hand-applied SQL", () => {
  test("the runner's header no longer says a re-run is safe and names the follow-up", () => {
    const src = read("backend/supabase/apply-migration.ts");
    const header = src.slice(0, src.indexOf("import "));
    assert.doesNotMatch(header, /re-running one by hand remains safe/i);
    assert.match(header, /select app_runtime_sync\(\);/);
    assert.match(header, /npm run migrate -- --status/);
  });

  test("the runbook says to run app_runtime_sync() and then --status after hand-applied SQL", () => {
    const t = read("docs/operations-runbook.md");
    const section = t.slice(t.indexOf("## After SQL applied by hand"));
    assert.ok(section.indexOf("select app_runtime_sync();") > 0);
    assert.ok(section.indexOf("select app_runtime_sync();") < section.indexOf("npm run migrate -- --status"));
  });
});

describe("FAIL-1163: .env.example lists every setting the code reads", () => {
  const NAMES = [
    "AI_ACCESS_MODE", "AI_GLOBAL_DAILY_CEILING_USD", "ERROR_TRACKER_DSN", "MIN_APP_VERSION", "IOS_APP_STORE_URL",
    "DATABASE_CA_CERT", "PGSSLROOTCERT", "DB_STATEMENT_TIMEOUT_MS", "MIGRATION_LOCK_TIMEOUT", "PGSSLMODE",
    "SIMS_ENABLED", "SIMS_RENDERERS", "SIMS_SERVE_UNREVIEWED", "LABS_SERVE_UNREVIEWED", "ITEM_FACT_CHECK",
    "CSP_REPORT_ONLY", "APP_URL",
  ];
  test("each name is there as an assignment (commented or not), with a comment line above it", () => {
    const lines = read("backend/.env.example").split("\n");
    for (const n of NAMES) {
      const i = lines.findIndex((l) => new RegExp(`^#? ?${n}=`).test(l));
      assert.ok(i > 0, `${n} is missing from backend/.env.example`);
      assert.match(lines[i - 1], /^#/, `${n} has no comment line above it`);
    }
  });
  test("each is read by the code (a name that nothing reads does not belong here)", () => {
    const code = [
      "backend/lib/ai-access-config.ts", "backend/lib/error-tracker.ts", "backend/lib/client-version.ts",
      "backend/lib/db-connection.ts", "backend/lib/sim/server-run.ts", "backend/lib/labs.ts",
      "backend/lib/fact-check.ts", "backend/security-headers.js", "backend/lib/stripe-checkout.ts",
    ].map(read).join("\n");
    for (const n of NAMES) assert.match(code, new RegExp(`\\b${n}\\b`), n);
  });
  test("the operational ones are in the runbook", () => {
    const t = read("docs/operations-runbook.md");
    const section = t.slice(t.indexOf("## Optional settings"), t.indexOf("## Email sender"));
    for (const n of NAMES) assert.ok(section.includes(n), `${n} is not in the runbook's optional settings`);
  });
  test("no new example line sets a value that changes behaviour when uncommented as written", () => {
    const tail = read("backend/.env.example").split("# --- Operations and feature switches")[1];
    for (const l of tail.split("\n")) assert.doesNotMatch(l, /^[A-Z_]+=/, `${l}: must stay commented`);
  });
});

describe("FAIL-1161 / FAIL-1164 / FAIL-1165: stale documentation", () => {
  test("the data inventory names the cron path and time vercel.json schedules", () => {
    const crons = JSON.parse(read("backend/vercel.json")).crons as { path: string; schedule: string }[];
    const purge = crons.find((c) => c.path === "/api/cron/purge-auth-data");
    assert.ok(purge, "vercel.json schedules /api/cron/purge-auth-data");
    const [min, hour] = purge.schedule.split(" ");
    const hhmm = `${hour.padStart(2, "0")}:${min.padStart(2, "0")} UTC`;
    const section = read("docs/legal/data-inventory.md").split("## Retention jobs")[1].split("\n\n")[1];
    assert.ok(section.includes("/api/cron/purge-auth-data"), "names the scheduled route");
    assert.ok(section.includes(hhmm), `says ${hhmm}`);
    assert.doesNotMatch(section, /\/api\/cron\/retention\` \(Vercel Cron, daily 08:15/);
    assert.ok(!crons.some((c) => c.path === "/api/cron/retention"), "if retention is scheduled, update the inventory");
  });

  test("backup workflow comments name the environment the job uses", () => {
    for (const f of ["db-backup.yml", "backup-housekeeping.yml"]) {
      const t = read(`.github/workflows/${f}`);
      assert.match(t, /^ {4}environment: production-backup$/m, f);
      const header = t.slice(0, t.indexOf("\nname:"));
      assert.doesNotMatch(header, /in the production-database environment/, `${f}: the comment names the wrong environment`);
      assert.match(header, /production-backup/, f);
    }
  });
});

describe("FAIL-1166: the Android preview build workflow is on master, hardened", () => {
  const p = ".github/workflows/build-android-preview.yml";
  test("it exists and runs only on a push to ops/build-android-preview", () => {
    assert.ok(existsSync(join(ROOT, p)));
    const t = read(p);
    assert.match(t, /^on:\n {2}push:\n {4}branches: \[ops\/build-android-preview\]\n(?! )/m);
    assert.doesNotMatch(t, /workflow_dispatch|pull_request|schedule:|workflow_run/);
  });
  const code = (t: string) => t.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  test("least privilege and the repo's pins: permissions, Node 24, SHA-pinned actions, token only on the steps that need it", () => {
    const t = read(p);
    assert.match(t, /^permissions:\n {2}contents: read\n(?! )/m);
    assert.match(t, /node-version: 24/);
    for (const m of t.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)\s+# (\S+)/gm)) assert.match(m[1], /@[0-9a-f]{40}$/, m[1]);
    assert.equal([...t.matchAll(/^\s*(?:-\s+)?uses:/gm)].length, [...t.matchAll(/^\s*(?:-\s+)?uses:\s*\S+@[0-9a-f]{40}\s+# v/gm)].length, "every action is pinned with a version comment");
    assert.doesNotMatch(t, /^ {6}EXPO_TOKEN:/m, "job-level env");
    assert.doesNotMatch(t, /\$\{\{ secrets\.EXPO_TOKEN \}\}"/, "the secret is never interpolated into a script");
    for (const step of t.split(/\n {6}- /).slice(1)) {
      if (/\beas build\b/.test(step)) assert.match(step, /EXPO_TOKEN: \$\{\{ secrets\.EXPO_TOKEN \}\}/);
    }
    assert.doesNotMatch(code(t), /eas submit/);
  });
  test("the summary comes from the tested script, not inline code that reads project.ownerAccount", () => {
    const t = read(p);
    assert.doesNotMatch(code(t), /ownerAccount/);
    assert.match(t, /eas-build-summary\.mjs build\.json/);
    assert.ok(existsSync(join(ROOT, ".github/scripts/eas-build-summary.test.mjs")));
    assert.match(read(".github/workflows/ci.yml"), /eas-build-summary\.test\.mjs/);
  });
});
