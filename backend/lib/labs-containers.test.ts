// REQ-164: the container and Kubernetes certification courses' authored
// labs (CKA first; CKAD, KCNA, CKS, KCSA and the Docker course join this
// list as each lands). The generic content, objective and slug checks run
// over every lab set in labs.test.ts; this file adds the hands-on framing
// (real kubectl and YAML, authored cluster output in cases), the adopted
// density (hybrid, docs/labs.md "Density"), the general safety note, and a
// guard against removed Kubernetes APIs and tools, in its own file so
// parallel lab waves don't edit the same test lines.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { GENERAL_SAFETY } from "../supabase/seed/labs/types";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { KUBERNETES_TRACKS } from "../supabase/seed/tracks/kubernetes";
import { DOCKER_TRACKS } from "../supabase/seed/tracks/docker";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

// Hands-on exams: every lab works at the kubectl prompt.
const HANDS_ON = ["CKA", "CKAD", "CKS", "DCA"] as const;
// Multiple-choice exams: labs apply the concepts (read output, choose, design).
const CONCEPTUAL = ["KCNA", "KCSA"] as const;
// Every container/Kubernetes course with a lab set.
const CODES = [...HANDS_ON, ...CONCEPTUAL] as const;

// APIs and tools removed from Kubernetes (or retired) that must not be
// taught as current anywhere in these courses or their labs.
const REMOVED = [
  /PodSecurityPolic/i,
  /extensions\/v1beta1/i,
  /apps\/v1beta[12]/i,
  /dockershim/i,
  /\bdocker-shim\b/i,
  /kubectl run .*--generator/i,
  /--record\b(?! flag is deprecated)/,
];

describe("container and Kubernetes lab wave (REQ-164)", () => {
  const tracks = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
  const setFor = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;

  test("every Kubernetes track is in the catalog, certification-aligned, and dated to its official curriculum", () => {
    for (const t of KUBERNETES_TRACKS) {
      assert.ok(tracks.has(t.code), `${t.code} in CATALOG_TRACKS`);
      assert.equal(t.trackType, "certification", t.code);
      assert.equal(t.subcategorySlug, "cncf-certifications", t.code);
      assert.ok(t.credential?.officialObjectivesUrl.startsWith("https://github.com/cncf/curriculum/blob/"), `${t.code} cites the CNCF curriculum`);
      assert.equal(t.credential?.lastVendorVerifiedAt, "2026-11-07T00:00:00Z", t.code);
      assert.equal(t.credential?.examCode, t.code, `${t.code}: the Linux Foundation acronym is the exam code`);
      const weights = activeUnits(t).reduce((a, u) => a + (u.weight ?? 0), 0);
      assert.equal(weights, 100, `${t.code} weights`);
      for (const u of activeUnits(t)) assert.ok(u.gate && u.gate.length > 40, `${t.code}/${u.title} has a gate`);
    }
  });

  test("CKA's domains and weights are the official v1.37 curriculum", () => {
    const cka = tracks.get("CKA")!;
    assert.deepEqual(
      activeUnits(cka).map((u) => [u.title, u.weight]),
      [
        ["Cluster Architecture, Installation & Configuration", 25],
        ["Workloads & Scheduling", 15],
        ["Services & Networking", 20],
        ["Storage", 10],
        ["Troubleshooting", 30],
      ]
    );
    assert.equal(cka.credential?.durationMinutes, 120);
    assert.match(cka.credential?.passingScorePolicy ?? "", /66%/);
    assert.match(cka.credential?.questionFormat ?? "", /performance-based/);
  });

  test("CKAD's domains and weights are the official v1.37 curriculum", () => {
    const ckad = tracks.get("CKAD")!;
    assert.deepEqual(
      activeUnits(ckad).map((u) => [u.title, u.weight]),
      [
        ["Application Design and Build", 20],
        ["Application Deployment", 20],
        ["Application Observability and Maintenance", 15],
        ["Application Environment, Configuration and Security", 25],
        ["Services and Networking", 20],
      ]
    );
    assert.equal(ckad.credential?.durationMinutes, 120);
    assert.match(ckad.credential?.passingScorePolicy ?? "", /66%/);
  });

  test("CKS's domains and weights are the official v1.37 curriculum, and it requires the CKA", () => {
    const cks = tracks.get("CKS")!;
    assert.deepEqual(
      activeUnits(cks).map((u) => [u.title, u.weight]),
      [
        ["Cluster Setup", 15],
        ["Cluster Hardening", 15],
        ["System Hardening", 10],
        ["Minimize Microservice Vulnerabilities", 20],
        ["Supply Chain Security", 20],
        ["Monitoring, Logging and Runtime Security", 20],
      ]
    );
    assert.equal(cks.credential?.durationMinutes, 120);
    assert.match(cks.credential?.passingScorePolicy ?? "", /67%/);
    assert.match(cks.credential?.recommendedExperience ?? "", /passed the Certified Kubernetes Administrator/);
  });

  test("KCSA's domains and weights are the official curriculum", () => {
    const kcsa = tracks.get("KCSA")!;
    assert.deepEqual(
      activeUnits(kcsa).map((u) => [u.title, u.weight]),
      [
        ["Overview of Cloud Native Security", 14],
        ["Kubernetes Cluster Component Security", 22],
        ["Kubernetes Security Fundamentals", 22],
        ["Kubernetes Threat Model", 16],
        ["Platform Security", 16],
        ["Compliance and Security Frameworks", 10],
      ]
    );
    assert.equal(kcsa.credential?.durationMinutes, 90);
    assert.match(kcsa.credential?.passingScorePolicy ?? "", /75%/);
  });

  test("KCNA's domains and weights are the official four-domain curriculum", () => {
    const kcna = tracks.get("KCNA")!;
    assert.deepEqual(
      activeUnits(kcna).map((u) => [u.title, u.weight]),
      [
        ["Kubernetes Fundamentals", 44],
        ["Container Orchestration", 28],
        ["Cloud Native Application Delivery", 16],
        ["Cloud Native Architecture", 12],
      ]
    );
    assert.equal(kcna.credential?.durationMinutes, 90);
    assert.match(kcna.credential?.passingScorePolicy ?? "", /75%/);
    assert.match(kcna.credential?.questionFormat ?? "", /multiple-choice/);
  });

  test("conceptual courses: every lab still applies the concept to a concrete scenario", () => {
    for (const code of CONCEPTUAL) {
      const labs = setFor(code).labs;
      for (const lab of labs) {
        const answers = lab.steps.flatMap((s) => s.parts.map((p) => p.modelAnswer)).join("\n");
        assert.match(answers, /kubectl|apiVersion|Deployment|StatefulSet|Service|Prometheus|Argo|Flux|Secret|hostPath|CNCF|nodeSelector|taint|topologySpreadConstraints|NetworkPolicy|RBAC|etcd|cosign|Falco|kube-bench/, `${code}/${lab.slug}: the reference answers name real Kubernetes or CNCF mechanisms`);
      }
      assert.ok(labs.some((l) => l.kind === "case") && labs.some((l) => l.kind === "build"), `${code}: both kinds`);
    }
  });

  test("each course has a lab set citing its curriculum and exam page", () => {
    for (const code of CODES) {
      const set = LAB_SETS.find((s) => s.trackCode === code);
      assert.ok(set, `${code} has labs`);
      if (code === "DCA") {
        assert.ok(set!.sources.some((s) => s.includes("docker-study-guide_v1-5")), `${code} cites the v1.5 study guide`);
        assert.ok(set!.sources.some((s) => s.includes("store.mirantis.com")), `${code} cites Mirantis's listing`);
      } else {
        assert.ok(set!.sources.some((s) => s.includes("github.com/cncf/curriculum")), `${code} cites the CNCF curriculum`);
        assert.ok(set!.sources.some((s) => s.includes("training.linuxfoundation.org")), `${code} cites the exam page`);
      }
      assert.ok(set!.sources.every((s) => s.startsWith("https://")), code);
    }
  });

  test("DCA is Mirantis's current blueprint (Study Guide v1.5, January 2025), still on sale when checked", () => {
    const dca = DOCKER_TRACKS.find((t) => t.code === "DCA")!;
    assert.ok(tracks.has("DCA"));
    assert.equal(dca.subcategorySlug, "container-tooling");
    assert.deepEqual(
      activeUnits(dca).map((u) => [u.title, u.weight]),
      [
        ["Orchestration", 25],
        ["Image Creation, Management, and Registry", 20],
        ["Installation and Configuration", 15],
        ["Networking", 15],
        ["Security", 15],
        ["Storage and Volumes", 10],
      ]
    );
    assert.equal(dca.credential?.durationMinutes, 90);
    assert.match(dca.credential?.questionFormat ?? "", /55 questions/);
    assert.match(dca.credential?.objectivesRevision ?? "", /v1\.5/);
    assert.equal(dca.credential?.providerSlug, "mirantis");
    // The blueprint's own legacy names are explained, not taught as current.
    const text = JSON.stringify(dca);
    assert.match(text, /Mirantis Kubernetes Engine/);
    assert.match(text, /legacy devicemapper/);
  });

  test("every lab carries the general safety note, a fictional organisation, and the right shape for its kind", () => {
    for (const code of CODES) {
      for (const lab of setFor(code).labs) {
        assert.equal(lab.safetyNote, GENERAL_SAFETY, `${code}/${lab.slug}`);
        assert.match(lab.brief, /fictional/i, `${code}/${lab.slug}: the brief says the organisation is fictional`);
        if (lab.kind === "build") {
          assert.equal(lab.steps.length, 1, `${code}/${lab.slug}`);
          assert.equal(lab.steps[0].text, "", `${code}/${lab.slug}: a build lab's step has no text`);
        } else {
          assert.ok(lab.steps.length >= 2 && lab.steps.length <= 4, `${code}/${lab.slug}`);
          for (const s of lab.steps) assert.ok(s.text.length >= 10, `${code}/${lab.slug}: each case step reveals authored information`);
        }
        for (const s of lab.steps) {
          assert.ok(s.parts.length >= 1 && s.parts.length <= 5, `${code}/${lab.slug}: 1-5 parts`);
          for (const p of s.parts) {
            assert.ok(p.criteria.length >= 40, `${code}/${lab.slug}/${p.label}: criteria describe what meets it`);
            assert.ok(p.modelAnswer.length >= 40, `${code}/${lab.slug}/${p.label}: a worked reference answer`);
          }
        }
      }
    }
  });

  test("hands-on courses: every case step shows cluster output and every lab's answers use kubectl or YAML", () => {
    for (const code of HANDS_ON) {
      const labs = setFor(code).labs;
      for (const lab of labs) {
        const answers = lab.steps.flatMap((s) => s.parts.map((p) => p.modelAnswer)).join("\n");
        assert.match(answers, /kubectl|helm |cosign |trivy |docker |apiVersion:|^\s*(FROM|spec|metadata|affinity|tolerations|resources|volumes|containers|rules|egress|ingress|startupProbe|livenessProbe|readinessProbe|securityContext|env|initContainers):/m, `${code}/${lab.slug}: the reference answers are hands-on`);
        if (lab.kind === "case") {
          const shown = lab.steps.map((s) => s.text).join("\n");
          assert.match(shown, /\$ kubectl|\$ sudo|\$ systemctl|\$ etcdctl|\$ crictl|\$ docker|\$ df |\/ # /, `${code}/${lab.slug}: the case shows authored command output`);
        }
      }
      // Admin and developer families lean to build labs with real cases
      // mixed in (docs/labs.md "Kinds"): both kinds, and at least a third
      // of each course unfolds as a case with authored cluster output.
      const cases = labs.filter((l) => l.kind === "case").length;
      assert.ok(cases >= labs.length / 3 && labs.some((l) => l.kind === "build"), `${code}: ${cases} case of ${labs.length}, with builds`);
    }
  });

  test("each course follows the recommended density (hybrid) unit by unit, one lab per objective", () => {
    for (const code of CODES) {
      const units = activeUnits(tracks.get(code)!);
      const plan: PlanTrack = {
        code,
        family: "general",
        units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })),
      };
      const set = setFor(code);
      const got = units.map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length);
      assert.deepEqual(got, unitPlan(plan, "hybrid"), code);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
    }
  });

  test("no removed API or retired tool is taught as current", () => {
    for (const t of [...KUBERNETES_TRACKS, ...DOCKER_TRACKS]) {
      const text = JSON.stringify(t);
      for (const re of REMOVED) assert.doesNotMatch(text, re, `${t.code} track`);
    }
    for (const code of CODES) {
      for (const lab of setFor(code).labs) {
        const text = JSON.stringify(lab);
        for (const re of REMOVED) assert.doesNotMatch(text, re, `${code}/${lab.slug}`);
      }
    }
  });
});
