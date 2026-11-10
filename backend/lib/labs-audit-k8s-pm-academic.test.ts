// REQ-186: regression tests for the 2026-11-09 content audit fixes in the
// Kubernetes, project-management and academic/dev lab families. Each test
// pins a corrected value or behaviour so the old mistake cannot come back.
// In its own file so parallel fix branches don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LAB_SETS } from "../supabase/seed/labs";
import { PMP_TRACK } from "../supabase/seed/tracks/pm";
import { CMPCBS_TRACK } from "../supabase/seed/data";

const lab = (code: string, slug: string) => {
  const set = LAB_SETS.find((s) => s.trackCode === code);
  assert.ok(set, `${code} lab set`);
  const found = set!.labs.find((l) => l.slug === slug);
  assert.ok(found, `${code}/${slug}`);
  return found!;
};
const text = (code: string, slug: string) => JSON.stringify(lab(code, slug));
const answer = (code: string, slug: string, label: string) => {
  for (const step of lab(code, slug).steps) for (const p of step.parts) if (p.label === label) return p.modelAnswer;
  assert.fail(`${code}/${slug}: no part "${label}"`);
};

describe("JS validating endpoint (FAIL-594)", () => {
  test("the model-answer server answers a null body with 422 and keeps serving", async () => {
    const full = answer("JAVASCRIPT", "validating-json-endpoint", "Server code");
    const code = full.slice(0, full.indexOf("\n\nThe body arrives"));
    assert.match(code, /body === null \|\| typeof body !== "object" \|\| Array\.isArray\(body\)/);
    const dir = mkdtempSync(join(tmpdir(), "lab-js-"));
    const file = join(dir, "server.mjs");
    writeFileSync(file, code);
    const port = 20000 + Math.floor(Math.random() * 20000);
    const child = spawn(process.execPath, [file], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout.on("data", (d) => String(d).includes("listening") && resolve());
        child.on("exit", (c) => reject(new Error(`server exited ${c}`)));
        setTimeout(() => reject(new Error("server did not start")), 5000);
      });
      const post = (body: string) =>
        fetch(`http://127.0.0.1:${port}/bookings`, { method: "POST", headers: { "content-type": "application/json" }, body });
      for (const bad of ["null", "7", "[1]"]) assert.equal((await post(bad)).status, 422, bad);
      // 9,000 two-byte characters: under 16 KB of characters, over 16 KB of bytes.
      assert.equal((await post(JSON.stringify({ room: "é".repeat(9000), guests: 2 }))).status, 413);
      const ok = await post(JSON.stringify({ room: "Rainier", guests: 2 }));
      assert.equal(ok.status, 201, "still serving after the bad bodies");
      assert.deepEqual(await ok.json(), { id: 42, room: "Rainier", guests: 2 });
    } finally {
      child.kill();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("CKA, CKS answer keys (FAIL-595, FAIL-596)", () => {
  test("etcd backup accepts only etcdutl for snapshot status and restore", () => {
    const t = text("CKA", "etcd-backup-restore");
    assert.doesNotMatch(t, /etcdctl snapshot (status|restore)(?! was removed)/);
    assert.match(t, /etcdutl snapshot status/);
    assert.match(t, /etcdutl snapshot restore/);
  });
  test("the stuck rollout's Pod counts match 25% maxUnavailable on 6 replicas", () => {
    const t = text("CKA", "stuck-rollout");
    assert.match(t, /6 -> 5 running/);
    assert.doesNotMatch(t, /6 -> 4 running|down to 4 of 6/);
  });
  test("the no-provisioner class shows the controller's real event", () => {
    assert.match(text("CKA", "pvc-pending"), /no volume plugin matched name: kubernetes\.io\/no-provisioner/);
  });
  test("ConfigMap env is re-read on every container start", () => {
    const t = text("CKA", "crashloop-oomkilled");
    assert.doesNotMatch(t, /only read at container start/);
    assert.match(t, /including every restart/);
  });
  test("CKS keeps anonymous access for the health endpoints through --authentication-config", () => {
    const t = text("CKS", "kube-bench-findings");
    assert.match(t, /--authentication-config/);
    assert.match(t, /conditions:\\n    - path: \/livez/);
    assert.doesNotMatch(t, /exempted via RBAC/);
  });
});

describe("CNCF project labs (FAIL-597, FAIL-598)", () => {
  test("Kyverno failureAction is per rule, and scale is not blocked by a Deployment rule", () => {
    const t = text("KCA", "read-a-policy");
    assert.doesNotMatch(t, /validationFailureAction:/);
    assert.match(t, /Deployment\/scale/);
  });
  test("the CNPE scan gate reads the Trivy report Trivy writes", () => {
    const t = text("CNPE", "kyverno-verify-images-pipeline-gate");
    assert.doesNotMatch(t, /key: \\"\{\{ scanner\.result\.summary/);
    assert.match(t, /scanner\.result\.Results\[\]\.Vulnerabilities\[\?Severity == 'CRITICAL'\]/);
  });
  test("the Tekton pipeline declares and binds every Task workspace", () => {
    const t = text("CNPE", "tekton-build-and-promote");
    assert.match(t, /- \{name: git-credentials\}\\n  tasks:/);
    assert.match(t, /\{name: git-credentials, workspace: git-credentials\}/);
  });
  test("Crossplane is v2: namespaced XRs, no claims, crossplane resource trace", () => {
    const t = text("CNPE", "crossplane-claim-composition");
    assert.match(t, /apiextensions\.crossplane\.io\/v2/);
    assert.match(t, /crossplane resource trace/);
    assert.doesNotMatch(t, /claimNames: \{/);
  });
  test("Cilium BGP and LB IPAM are cilium.io/v2 and ENI mode sets eni.enabled", () => {
    const t = JSON.stringify(LAB_SETS.find((s) => s.trackCode === "CCA"));
    assert.doesNotMatch(t, /cilium\.io\/v2alpha1/);
    assert.match(t, /--set eni\.enabled=true/);
  });
});

describe("Project management (FAIL-599)", () => {
  test("PMP eligibility lists the four 2026 tiers", () => {
    const e = PMP_TRACK.credential!.recommendedExperience!;
    for (const tier of ["60 months", "48 months", "36 months", "24 months"]) assert.ok(e.includes(tier), tier);
    assert.match(e, /GAC/);
  });
  test("CPMAI segmentation is patterns and anomalies, not recognition", () => {
    const a = answer("PMICPMAI", "cpmai-problem-to-ai-pattern", "Patterns");
    assert.match(a, /4 patterns and anomalies/);
    assert.doesNotMatch(a, /pattern recognition/);
  });
  test("the PfMP roadmap never runs three streams with two teams", () => {
    const a = answer("PFMP", "pfmp-portfolio-roadmap", "Sequence");
    assert.match(a, /pricing analytics months 15-20/);
    assert.match(a, /claims portal months 13-21/);
  });
});

describe("Academic (FAIL-600)", () => {
  test("password storage meets the OWASP minimums", () => {
    const a = answer("MSCS", "fix-password-storage", "The right design");
    assert.match(a, /memory_cost=19456/);
    assert.match(a, /N, R, P = 2\*\*17, 8, 1/);
    assert.doesNotMatch(a, /n=2\*\*14/);
    assert.match(a, /bcrypt is now a legacy option/);
  });
  test("the top-10 heap states that scores only increase", () => {
    assert.match(lab("MSCS", "choose-structures-for-three-problems").brief, /score only ever goes up/);
  });
  test("CMPCBS C-minimum gates match the catalog rule", () => {
    const gates = CMPCBS_TRACK.units.map((u) => u.gate ?? "");
    assert.ok(!gates.some((g) => g.includes("requires it for every major course")));
  });
});
