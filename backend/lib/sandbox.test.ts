// REQ-196: the sandbox and staging rules that need no database or Docker
// daemon. The real escape tests (network, env, filesystem, fork bomb,
// timeout, memory, output) run against Docker in lib/sandbox-runner
// .sandboxtest.ts (npm run test:sandbox) and before every job.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { dockerArgs, dockerRunner, isDockerInfraFailure, sandboxSelfTest, DEFAULT_SANDBOX } from "./sandbox-runner";
import { verifyByExecution, DEFAULT_RUN_LIMITS, type CodeRunner } from "./verify-execution";
import { privilegeProblem, isLocalDatabase, type RolePrivileges } from "./recheck-guard";
import { RunBudget, BudgetStop, estimateCall } from "./run-budget";
import { NOT_SERVED_MARK, EXEC_QUEUE_FAILED } from "./lesson-generation";
import { EXEC_STAGE_MARK } from "./exec-checks";

const ROOT = resolve(__dirname, "..");

describe("REQ-196: the docker sandbox's restrictions", () => {
  const args = dockerArgs({ language: "python" }, "asc-sbx-test");
  const has = (...pair: string[]) => args.some((a, i) => pair.every((p, j) => args[i + j] === p));

  test("no network, no env from the job, read-only image, ephemeral scratch, nobody, no capabilities", () => {
    assert.ok(has("--network", "none"));
    assert.ok(has("--env-file", "/dev/null"));
    assert.ok(args.includes("--read-only"));
    assert.ok(args.some((a) => a.startsWith("/scratch:rw,nosuid,nodev,size=")));
    assert.ok(has("--user", "65534:65534"));
    assert.ok(has("--cap-drop", "ALL"));
    assert.ok(has("--security-opt", "no-new-privileges"));
    assert.ok(has("--pull", "never"), "never fetches an image at run time");
    assert.ok(args.includes("--rm"));
  });

  test("CPU, memory, process, file and size caps are set", () => {
    assert.ok(has("--memory", `${DEFAULT_SANDBOX.memoryMb}m`));
    assert.ok(has("--memory-swap", `${DEFAULT_SANDBOX.memoryMb}m`), "no swap beyond the memory cap");
    assert.ok(has("--cpus", String(DEFAULT_SANDBOX.cpus)));
    assert.ok(has("--pids-limit", String(DEFAULT_SANDBOX.pids)));
    assert.ok(has("--ulimit", "nofile=64:64"));
  });

  test("nothing from the host is mounted or passed in, and nothing is privileged", () => {
    for (const bad of ["-v", "--volume", "--mount", "--privileged", "--network=host", "--pid", "--userns", "--device", "-p", "--publish"]) {
      assert.ok(!args.includes(bad), `no ${bad}`);
    }
    const envs = args.flatMap((a, i) => (args[i - 1] === "--env" || args[i - 1] === "-e" ? [a] : []));
    assert.deepEqual(envs, ["HOME=/scratch"]);
    assert.ok(!args.some((a) => /\$\{|DATABASE|ANTHROPIC|TOKEN|SECRET/i.test(a)));
  });

  test("the program goes in on stdin; JavaScript runs with a heap cap", () => {
    assert.deepEqual(args.slice(-3), ["python3", "-I", "-"]);
    const js = dockerArgs({ language: "javascript" }, "x");
    assert.equal(js[js.length - 1], "-");
    assert.match(js[js.length - 2], /^--max-old-space-size=\d+$/);
  });

  test("docker's own failures are 'unavailable', a program's failure is not", () => {
    assert.ok(isDockerInfraFailure(125, ""));
    assert.ok(isDockerInfraFailure(1, "failed to connect to the docker API at unix:///var/run/docker.sock"));
    assert.ok(!isDockerInfraFailure(1, "Traceback (most recent call last):"));
    assert.ok(!isDockerInfraFailure(137, ""));
  });
});

describe("REQ-196: fail closed when there is no sandbox", () => {
  test("no docker binary: unavailable; verification reports not run; the self-test fails", async () => {
    const runner = dockerRunner({ ...DEFAULT_SANDBOX, docker: "/nonexistent/docker-xyz" });
    const r = await runner({ language: "python", code: "print(1)", expected: "1" }, DEFAULT_RUN_LIMITS);
    assert.deepEqual(r, { status: "unavailable" });
    assert.deepEqual(await verifyByExecution({ language: "python", code: "print(1)", expected: "1" }, runner), { ran: false, agreed: null, detail: "no sandbox" });
    const st = await sandboxSelfTest(runner, DEFAULT_RUN_LIMITS, "canary");
    assert.equal(st.ok, false);
    assert.equal(st.available, false);
  });

  test("a runner asked for network refuses", async () => {
    const r = await dockerRunner()({ language: "python", code: "print(1)", expected: "1" }, { ...DEFAULT_RUN_LIMITS, network: true as unknown as false });
    assert.deepEqual(r, { status: "unavailable" });
  });

  test("a self-test that sees an escape fails even when every run 'works'", async () => {
    const leaky: CodeRunner = async (s) => ({ status: "ok", stdout: s.expected === "BLOCKED" ? "OPEN\n" : `${s.expected}\n` });
    assert.equal((await sandboxSelfTest(leaky, DEFAULT_RUN_LIMITS, "c")).ok, false);
  });
});

describe("REQ-196: least privilege for the jobs", () => {
  const base: RolePrivileges = { role: "recheck_bot", superuser: false, bypassRls: false, writable: [], canStage: true };
  test("a staging-only member of content_recheck may run", () => {
    assert.equal(privilegeProblem(base, {}), null);
  });
  test("a role that can pull, void or edit content may not -- even with the local override against a remote database", () => {
    assert.match(privilegeProblem({ ...base, writable: ["item_status"] }, {})!, /can write item_status/);
    assert.match(privilegeProblem({ ...base, role: "postgres", superuser: true }, {})!, /superuser/);
    assert.match(privilegeProblem({ ...base, bypassRls: true }, {})!, /bypasses RLS/);
    const remote = { RECHECK_ALLOW_PRIVILEGED: "local", DATABASE_URL: "postgres://u:p@db.example.supabase.co:5432/postgres" };
    assert.notEqual(privilegeProblem({ ...base, superuser: true }, remote), null);
    const local = { RECHECK_ALLOW_PRIVILEGED: "local", DATABASE_URL: "postgres://postgres@localhost:5432/x" };
    assert.equal(privilegeProblem({ ...base, superuser: true }, local), null);
  });
  test("a role that cannot stage is refused too", () => {
    assert.match(privilegeProblem({ ...base, canStage: false }, {})!, /cannot insert into item_holdbacks/);
  });
  test("local means localhost or a Unix socket", () => {
    assert.ok(isLocalDatabase("postgres://p@localhost:55496/x"));
    assert.ok(isLocalDatabase("postgres://p@x/db?host=/tmp/pg"));
    assert.ok(!isLocalDatabase("postgres://p@aws-0-us-west-1.pooler.supabase.com:6543/postgres"));
    assert.ok(!isLocalDatabase(undefined));
  });
});

describe("REQ-196: the per-run budget", () => {
  test("reserve refuses a call that could pass the cap; spending is tallied from usage", () => {
    const b = new RunBudget(0.05);
    b.reserve(0.04);
    b.add({ userId: null, purpose: "item_recheck", model: "claude-sonnet-5-5", inputTokens: 10_000, outputTokens: 1_000, cacheReadTokens: 0, cacheWriteTokens: 0, latencyMs: 1, ok: true, errorCode: null });
    assert.ok(Math.abs(b.spentUsd - 0.03) < 1e-9); // 10k x $2/M + 1k x $10/M
    assert.throws(() => b.reserve(0.03), BudgetStop);
    assert.throws(() => new RunBudget(0), /positive/);
  });
  test("the estimate's upper bound covers the whole max_tokens; thinking costs more than no thinking", () => {
    const off = estimateCall({ model: "claude-sonnet-5-5", promptText: "x".repeat(7000), maxTokens: 600, thinking: "off", items: 1 });
    const on = estimateCall({ model: "claude-sonnet-5-5", promptText: "x".repeat(7000), maxTokens: 600, thinking: "default", items: 1 });
    assert.ok(on.upperUsd > off.upperUsd && on.typicalUsd > off.typicalUsd);
    assert.ok(off.typicalUsd <= off.upperUsd);
    const haiku = estimateCall({ model: "claude-haiku-5-5", promptText: "x".repeat(7000), maxTokens: 600, thinking: "off", items: 1 });
    assert.ok(haiku.upperUsd < off.upperUsd / 10);
  });
});

// ---------------------------------------------------------------------------
// Static boundaries
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|dbtest|sandboxtest)\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

// Every module (and bare package) reachable from anything under app/.
function reachableFromApp(): { files: Set<string>; packages: Set<string> } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = walk(join(ROOT, "app"));
  while (queue.length) {
    const f = queue.pop()!;
    if (files.has(f)) continue;
    files.add(f);
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/g)) {
      const spec = m[1] ?? m[2] ?? m[3];
      const r = resolveImport(f, spec);
      if (r) queue.push(r);
      else if (!spec.startsWith(".") && !spec.startsWith("@/")) packages.add(spec);
    }
  }
  return { files, packages };
}

describe("REQ-196: model-written code never runs in the request path", () => {
  const { files, packages } = reachableFromApp();
  const rel = (f: string) => f.slice(ROOT.length + 1);

  test("nothing under app/ reaches the sandbox runner, the job scripts or the eval harness", () => {
    for (const f of files) {
      assert.ok(!/lib\/sandbox-runner\.ts$|lib\/factcheck-eval\.ts$|scripts\//.test(f), `app/ reaches ${rel(f)}`);
    }
    assert.ok(files.has(join(ROOT, "lib/lesson-generation.ts")), "the walk does follow app/ into lib/");
    assert.ok(files.has(join(ROOT, "lib/exec-checks.ts")), "the request path queues programs");
  });

  test("nothing under app/ can start a process or evaluate code", () => {
    for (const p of ["child_process", "node:child_process", "vm", "node:vm", "worker_threads", "node:worker_threads"]) {
      assert.ok(!packages.has(p), `app/ imports ${p}`);
    }
    for (const f of files) {
      const src = readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "");
      assert.ok(!/\bnew Function\s*\(|\beval\s*\(/.test(src), `${rel(f)} evaluates code`);
    }
  });

  test("the request-path modules that touch verification programs only queue them", () => {
    const src = readFileSync(join(ROOT, "lib/exec-checks.ts"), "utf8");
    assert.ok(!/from\s+["'][^"']*(sandbox-runner|child_process)["']/.test(src));
    const gen = readFileSync(join(ROOT, "lib/lesson-generation.ts"), "utf8");
    assert.ok(!/verifyByExecution|runCode/.test(gen), "lesson generation runs nothing");
  });
});

describe("REQ-196: staging is never served", () => {
  test("no route reads the staging tables; in lib/ only the jobs, the review CLI helpers and the cooldown do", () => {
    for (const f of walk(join(ROOT, "app"))) {
      assert.ok(!/item_holdbacks|exec_check/.test(readFileSync(f, "utf8")), `${f} reads staging`);
    }
    const readers = walk(join(ROOT, "lib"))
      .filter((f) => /(from|join)\s+(item_holdbacks|exec_checks|exec_check_runs)\b/.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(ROOT.length + 1))
      .sort();
    assert.deepEqual(readers, ["lib/exec-checks.ts", "lib/lesson-generation.ts", "lib/recheck-stored.ts", "lib/staging.ts"]);
  });

  test("the one serving-side reader (the held-back cooldown) only counts rows marked not served, which staging never writes", () => {
    const gen = readFileSync(join(ROOT, "lib/lesson-generation.ts"), "utf8");
    const cooldown = gen.slice(gen.indexOf("export async function recentlyHeldBack"), gen.indexOf("export async function checkedIntro"));
    assert.match(cooldown, /claims \? \$2/);
    assert.match(cooldown, /NOT_SERVED_MARK/);
    assert.notEqual(EXEC_STAGE_MARK, NOT_SERVED_MARK);
    const staging = readFileSync(join(ROOT, "lib/staging.ts"), "utf8") + readFileSync(join(ROOT, "lib/recheck-stored.ts"), "utf8") + readFileSync(join(ROOT, "lib/exec-checks.ts"), "utf8");
    assert.ok(!/NOT_SERVED_MARK/.test(staging), "staging never marks a row not-served");
    assert.ok(EXEC_QUEUE_FAILED.length > 0);
  });

  test("the jobs never write item_status (they cannot pull, void or clear)", () => {
    for (const f of ["lib/staging.ts", "lib/recheck-stored.ts", "lib/exec-checks.ts", "scripts/recheck-stored.ts", "scripts/exec-checks.ts", "scripts/factcheck-eval.ts", "lib/factcheck-eval.ts"]) {
      const src = readFileSync(join(ROOT, f), "utf8");
      assert.ok(!/(insert into|update|delete from)\s+item_status/i.test(src), `${f} writes item_status`);
      assert.ok(!/confirmItemWrong|clearItem|clearStaged/.test(src), `${f} decides for a person`);
    }
  });
});
