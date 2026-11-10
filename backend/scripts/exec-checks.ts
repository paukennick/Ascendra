// REQ-196: run the verification programs of served items in the sandbox
// (lib/exec-checks.ts, lib/sandbox-runner.ts). GitHub Actions only: the
// "Sandbox: verify by execution" workflow runs it every hour.
//
//   npm run items:exec                    run up to 200 queued programs
//   npm run items:exec -- --limit 50
//   npm run items:exec -- --max-minutes 10  time budget (default 20, max 25)
//   npm run items:exec -- --self-test     only the sandbox escape self-test
//
// Makes no model call. Connects as a LOGIN member of content_recheck
// (RECHECK_DATABASE_URL) and refuses a role that could pull, void or edit
// content (lib/recheck-guard.ts). Before running anything it runs the escape
// self-test with a canary secret in its own environment; if any probe gets
// out -- or Docker is not there -- it runs nothing and exits non-zero, and
// every queued item stays exec_unverified (fail closed).
import "../supabase/seed/env-local";
import { randomBytes } from "node:crypto";
import { closePool } from "../lib/db";
import { assertStagingOnlyRole } from "../lib/recheck-guard";
import { runExecChecks } from "../lib/exec-checks";
import { dockerRunner, sandboxSelfTest } from "../lib/sandbox-runner";
import { DEFAULT_RUN_LIMITS } from "../lib/verify-execution";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function selfTest(): Promise<boolean> {
  const canary = `canary-${randomBytes(12).toString("hex")}`;
  process.env.SANDBOX_CANARY = canary; // in OUR environment; the probe fails if a program can see it
  const st = await sandboxSelfTest(dockerRunner(), DEFAULT_RUN_LIMITS, canary);
  for (const p of st.probes) console.log(`${p.held ? "held   " : "ESCAPED"}  ${p.name}  (${p.result})`);
  console.log(st.ok ? "Sandbox self-test: every probe held." : `Sandbox self-test FAILED${st.available ? "" : " (Docker unavailable)"}: running nothing.`);
  return st.ok;
}

async function main() {
  if (process.argv.includes("--self-test")) {
    if (!(await selfTest())) process.exitCode = 1;
    return;
  }
  const limit = Number(arg("--limit") ?? "200");
  if (!(Number.isInteger(limit) && limit > 0 && limit <= 1000)) throw new Error("--limit must be an integer from 1 to 1000");
  const minutes = Number(arg("--max-minutes") ?? "20");
  if (!(Number.isFinite(minutes) && minutes > 0 && minutes <= 25)) throw new Error("--max-minutes must be above 0 and at most 25");
  const deadline = Date.now() + minutes * 60_000;
  const role = await assertStagingOnlyRole();
  console.log(`Connected as ${role.role} (staging only).`);
  if (!(await selfTest())) {
    process.exitCode = 1;
    return;
  }
  const r = await runExecChecks({ runner: dockerRunner(), runnerName: `docker:${process.env.GITHUB_RUN_ID ?? "local"}`, limit, deadline, log: (m) => console.log(m) });
  console.log(`Ran ${r.ran}: ${r.passed} passed, ${r.failed} staged for review, ${r.errors} could not be judged.`);
  if (r.failed) console.log("Review them: npm run items -- staged");
  if (r.stoppedAtDeadline) console.log(`Stopped at the ${minutes}-minute budget; the next run continues.`);
  if (r.unavailable) {
    console.log("The sandbox became unavailable mid-run; the rest stay exec_unverified.");
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
