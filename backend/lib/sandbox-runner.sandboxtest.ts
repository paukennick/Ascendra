// REQ-196: escape attempts against the REAL sandbox (Docker), plus the eval
// set's verification programs. `npm run test:sandbox`; needs a Docker daemon
// and the images (ascendra-sandbox-python:1 from sandbox/python.Dockerfile,
// node:22-slim). The workflows run it before any job uses the sandbox.
//
// Each probe tries to get out -- network (TCP, DNS, fetch), the job's
// environment (a canary secret set here), the filesystem outside the
// scratch area, root, a fork bomb, an endless loop, 1 GB of memory, an
// output flood -- and must fail. Then the host must still be fine: a normal
// program runs, and no container is left behind.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dockerRunner, escapeProbes, sandboxSelfTest } from "./sandbox-runner";
import { verifyByExecution, DEFAULT_RUN_LIMITS } from "./verify-execution";
import { parseEvalSet } from "./factcheck-eval";

const CANARY = `canary-${Date.now()}-do-not-leak`;
process.env.SANDBOX_TEST_SECRET = CANARY;
process.env.DATABASE_URL ??= `postgres://leak:${CANARY}@db.invalid/x`;
const runner = dockerRunner();

describe("REQ-196: sandbox escape attempts fail (real Docker)", () => {
  for (const p of escapeProbes(CANARY)) {
    test(p.name, async () => {
      const started = Date.now();
      const r = await runner(p.snippet, DEFAULT_RUN_LIMITS);
      assert.notEqual(r.status, "unavailable", "Docker and the sandbox images must be present for this suite");
      assert.ok(p.held(r), `escaped: ${JSON.stringify(r).slice(0, 300)}`);
      assert.ok(Date.now() - started < DEFAULT_RUN_LIMITS.timeoutMs + 15_000, "bounded by the timeout");
    });
  }

  test("the self-test the jobs run passes", async () => {
    const st = await sandboxSelfTest(runner, DEFAULT_RUN_LIMITS, CANARY);
    assert.ok(st.ok, JSON.stringify(st.probes.filter((p) => !p.held)));
  });

  test("afterwards the host is fine: a normal program runs and no container is left", async () => {
    const r = await runner({ language: "python", code: "import sympy\nprint(sympy.Integer(6) * 7)\n", expected: "42" }, DEFAULT_RUN_LIMITS);
    assert.deepEqual(r, { status: "ok", stdout: "42\n" });
    const left = execFileSync("docker", ["ps", "-a", "--filter", "name=asc-sbx-", "--format", "{{.Names}}"], { encoding: "utf8" }).trim();
    assert.equal(left, "");
  });
});

describe("REQ-196: the eval set's programs, run in the sandbox", () => {
  const set = parseEvalSet(JSON.parse(readFileSync(join(__dirname, "fixtures/factcheck-eval-set.json"), "utf8")));
  for (const it of set.filter((i) => i.snippet)) {
    test(`${it.id}: ${it.label === "bad" ? "disagrees with the wrong key" : "agrees with the right key"}`, async () => {
      const v = await verifyByExecution(it.snippet, runner, DEFAULT_RUN_LIMITS);
      assert.equal(v.ran, true, v.detail);
      assert.equal(v.agreed, it.label === "good", v.detail);
    });
  }
});
