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
import { CNCF_ECOSYSTEM_TRACKS } from "../supabase/seed/tracks/cncf-ecosystem";
import { REDHAT_TRACKS } from "../supabase/seed/tracks/redhat-openshift";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";

// Hands-on exams: every lab works at the kubectl prompt.
const HANDS_ON = ["CKA", "CKAD", "CKS", "DCA", "EX188", "EX280"] as const;
// Multiple-choice exams: labs apply the concepts (read output, choose, design).
const CONCEPTUAL = ["KCNA", "KCSA"] as const;
// CNCF project exams: labs write that project's configuration and queries.
const TOOLING: Record<string, { answers: RegExp; shown: RegExp }> = {
  PCA: { answers: /rate\(|sum by|histogram_quantile|scrape_configs|- alert:|amtool|promtool|Counter\(|Histogram\(|Gauge\(|remote_write/, shown: /\$ curl|\$ kubectl|groups:|expr:|^\s*[a-z_]+:\s/m },
  OTCA: { answers: /OTEL_|processors:|exporters:|receivers:|tracer|span\.|propagation|sending_queue/, shown: /\$ curl|\$ kubectl|Span from|traceparent|x-b3|attributes:|OTEL_/ },
  CGOA: { answers: /argocd|Argo CD|Flux|Kustomization|GitRepository|selfHeal|prune|overlays\/|reconcil|Rollout|AnalysisTemplate|canary/, shown: /\$ |Timeline:|proposals|Proposal|Current push model|Facts from the review|Requirements gathered|delivery design/ },
  CAPA: { answers: /argoproj\.io|argo |argocd|kubectl argo rollouts|workflowTemplateRef|AnalysisTemplate|EventSource|Sensor/, shown: /\$ argo|\$ kubectl|\$ argocd/ },
  CCA: { answers: /cilium|hubble|CiliumNetworkPolicy|eBPF|helm (install|upgrade) cilium/, shown: /\$ cilium|\$ hubble|\$ kubectl|\$ helm/ },
  ICA: { answers: /istioctl|istio\.io|PeerAuthentication|AuthorizationPolicy|VirtualService|DestinationRule|Gateway/, shown: /\$ istioctl|\$ kubectl/ },
  KCA: { answers: /kyverno|ClusterPolicy|PolicyException|CleanupPolicy|validate:|mutate:|generate:/, shown: /\$ kubectl|\$ kyverno|\$ helm|kind: ClusterPolicy|failureAction/ },
  CBA: { answers: /yarn |backstage|app-config|catalog-info|createPlugin|EntityLayout|Dockerfile|FROM /, shown: /\$ yarn|\$ kubectl|\$ git|catalog-info|apiVersion: backstage|Pull request|\/\/ plugins\// },
  // CNPA is multiple-choice about platform engineering as a practice; its labs apply the practice to a fictional platform.
  CNPA: { answers: /Argo CD|Flux|Kyverno|Crossplane|Backstage|OpenTelemetry|Prometheus|ResourceQuota|NetworkPolicy|CustomResourceDefinition|CRD|PolicyReport|DORA|SLO|golden path/, shown: /\$ |Timeline from|Inventory gathered|Proposals:|Catalog audit:|^#!\/bin\/bash/m },
  // CNPE is performance-based: labs write real manifests and read real cluster output.
  CNPE: { answers: /kubectl|apiVersion:|kind: (Application|AppProject|Pipeline|Task|PipelineRun|Rollout|AnalysisTemplate|CustomResourceDefinition|Composition|CompositeResourceDefinition|ServiceMonitor|PrometheusRule|AlertmanagerConfig|PeerAuthentication|AuthorizationPolicy|NetworkPolicy|ClusterPolicy|ResourceQuota|LimitRange|PriorityClass|HorizontalPodAutoscaler)/, shown: /\$ kubectl|\$ curl|\$ tkn|\$ crossplane|\$ istioctl|ALERT  / },
};
// Every container/Kubernetes course with a lab set.
const CODES = [...HANDS_ON, ...CONCEPTUAL, ...Object.keys(TOOLING)] as const;

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
  // Audit 2026-11-09: etcd 3.6 removed snapshot status/restore from etcdctl
  // (etcdutl only); Kyverno 1.13 moved failureAction onto each rule; Cilium's
  // BGP and LB IPAM APIs are cilium.io/v2; Crossplane v2's CLI is
  // `crossplane resource trace`.
  /etcdctl snapshot (status|restore)(?! was removed)/,
  /validationFailureAction:/,
  /cilium\.io\/v2alpha1/,
  /crossplane beta trace(?! was)/,
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
        assert.ok(set!.sources.some((s) => s.url.includes("docker-study-guide_v1-5")), `${code} cites the v1.5 study guide`);
        assert.ok(set!.sources.some((s) => s.url.includes("store.mirantis.com")), `${code} cites Mirantis's listing`);
      } else if (code === "EX188" || code === "EX280") {
        assert.ok(set!.sources.some((s) => s.url.startsWith("https://www.redhat.com/en/services/training/")), `${code} cites the Red Hat exam page`);
        assert.ok(set!.sources.length >= 3, `${code} cites product documentation`);
      } else if (code in TOOLING) {
        assert.ok(set!.sources.some((s) => s.url.includes("github.com/cncf/curriculum")), `${code} cites the CNCF curriculum`);
        assert.ok(set!.sources.some((s) => s.url.includes("training.linuxfoundation.org")), `${code} cites the exam page`);
        assert.ok(set!.sources.length >= 3, `${code} cites the project's documentation`);
      } else {
        assert.ok(set!.sources.some((s) => s.url.includes("github.com/cncf/curriculum")), `${code} cites the CNCF curriculum`);
        assert.ok(set!.sources.some((s) => s.url.includes("training.linuxfoundation.org")), `${code} cites the exam page`);
      }
      assert.ok(set!.sources.every((s) => s.url.startsWith("https://") && /^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt)), `${code}: dated https sources`);
    }
  });

  test("CNCF project tracks: official domains and weights, multiple-choice facts", () => {
    for (const t of CNCF_ECOSYSTEM_TRACKS) {
      assert.ok(tracks.has(t.code), `${t.code} in CATALOG_TRACKS`);
      assert.equal(t.subcategorySlug, "cncf-certifications", t.code);
      assert.ok(t.credential?.officialObjectivesUrl.startsWith("https://github.com/cncf/curriculum/blob/"), `${t.code} cites the CNCF curriculum`);
      assert.equal(t.credential?.examCode, t.code);
      assert.equal(activeUnits(t).reduce((a, u) => a + (u.weight ?? 0), 0), 100, `${t.code} weights`);
      for (const u of activeUnits(t)) assert.ok(u.gate && u.gate.length > 40, `${t.code}/${u.title} has a gate`);
    }
    assert.deepEqual(
      activeUnits(tracks.get("PCA")!).map((u) => [u.title, u.weight]),
      [["PromQL", 28], ["Prometheus Fundamentals", 20], ["Observability Concepts", 18], ["Alerting & Dashboarding", 18], ["Instrumentation and Exporters", 16]]
    );
    assert.deepEqual(
      activeUnits(tracks.get("OTCA")!).map((u) => [u.title, u.weight]),
      [["Fundamentals of Observability", 18], ["The OpenTelemetry API and SDK", 46], ["The OpenTelemetry Collector", 26], ["Maintaining and Debugging Observability Pipelines", 10]]
    );
    assert.deepEqual(
      activeUnits(tracks.get("CGOA")!).map((u) => [u.title, u.weight]),
      [["GitOps Terminology", 20], ["GitOps Principles", 30], ["Related Practices", 16], ["GitOps Patterns", 20], ["Tooling", 14]]
    );
    assert.deepEqual(
      activeUnits(tracks.get("CAPA")!).map((u) => [u.title, u.weight]),
      [["Argo Workflows", 36], ["Argo CD", 34], ["Argo Rollouts", 18], ["Argo Events", 12]]
    );
    assert.deepEqual(
      activeUnits(tracks.get("KCA")!).map((u) => [u.title, u.weight]),
      [["Fundamentals of Kyverno", 18], ["Installation, Configuration, and Upgrades", 18], ["Kyverno CLI", 12], ["Applying Policies", 10], ["Writing Policies", 32], ["Policy Management", 10]]
    );
    assert.deepEqual(
      activeUnits(tracks.get("CBA")!).map((u) => [u.title, u.weight]),
      [["Backstage Development Workflow", 24], ["Backstage Infrastructure", 22], ["Backstage Catalog", 22], ["Customizing Backstage", 32]]
    );
    assert.deepEqual(
      activeUnits(tracks.get("CNPA")!).map((u) => [u.title, u.weight]),
      [
        ["Platform Engineering Core Fundamentals", 36],
        ["Platform Observability, Security, and Conformance", 20],
        ["Continuous Delivery & Platform Engineering", 16],
        ["Platform APIs and Provisioning Infrastructure", 12],
        ["IDPs and Developer Experience", 8],
        ["Measuring your Platform", 8],
      ]
    );
    const cnpa = tracks.get("CNPA")!.credential!;
    assert.equal(cnpa.durationMinutes, 120);
    assert.match(cnpa.passingScorePolicy ?? "", /75%/);
    assert.deepEqual(
      activeUnits(tracks.get("CNPE")!).map((u) => [u.title, u.weight]),
      [
        ["Platform Architecture and Infrastructure", 15],
        ["GitOps and Continuous Delivery", 25],
        ["Platform APIs and Self-Service Capabilities", 25],
        ["Observability and Operations", 20],
        ["Security and Policy Enforcement", 15],
      ]
    );
    const cnpe = tracks.get("CNPE")!.credential!;
    assert.equal(cnpe.durationMinutes, 120);
    assert.match(cnpe.passingScorePolicy ?? "", /64%/);
    assert.match(cnpe.questionFormat ?? "", /performance-based/);
    for (const code of ["PCA", "OTCA", "CGOA", "CAPA", "CCA", "KCA", "CBA"]) {
      const c = tracks.get(code)!.credential!;
      assert.equal(c.durationMinutes, 90, code);
      assert.match(c.passingScorePolicy ?? "", /75%/, code);
    }
    assert.deepEqual(
      activeUnits(tracks.get("CCA")!).map((u) => [u.title, u.weight]),
      [["Architecture", 20], ["Network Policy", 18], ["Service Mesh", 16], ["Network Observability", 10], ["Installation and Configuration", 10], ["Cluster Mesh", 10], ["eBPF", 10], ["BGP and External Networking", 6]]
    );
    assert.deepEqual(
      activeUnits(tracks.get("ICA")!).map((u) => [u.title, u.weight]),
      [["Installation, Upgrades, and Configuration", 20], ["Traffic Management", 35], ["Securing Workloads", 25], ["Troubleshooting", 20]]
    );
    const ica = tracks.get("ICA")!.credential!;
    assert.equal(ica.durationMinutes, 120);
    assert.match(ica.passingScorePolicy ?? "", /68%/);
    assert.match(ica.questionFormat ?? "", /performance-based and multiple-choice/);
  });

  test("project courses: reference answers use the project's own configuration or query language, and cases show its output", () => {
    for (const [code, sig] of Object.entries(TOOLING)) {
      const labs = setFor(code).labs;
      for (const lab of labs) {
        const answers = lab.steps.flatMap((s) => s.parts.map((p) => p.modelAnswer)).join("\n");
        assert.match(answers, sig.answers, `${code}/${lab.slug}: the reference answers are hands-on`);
        if (lab.kind === "case") assert.match(lab.steps.map((s) => s.text).join("\n"), sig.shown, `${code}/${lab.slug}: the case shows authored output`);
      }
      const cases = labs.filter((l) => l.kind === "case").length;
      assert.ok(cases >= labs.length / 3 && labs.some((l) => l.kind === "build"), `${code}: ${cases} case of ${labs.length}, with builds`);
    }
  });

  test("Red Hat EX188 and EX280: current names, durations and objective groups from redhat.com (2026-11-09)", () => {
    for (const t of REDHAT_TRACKS) {
      assert.ok(tracks.has(t.code), `${t.code} in CATALOG_TRACKS`);
      assert.equal(t.subcategorySlug, "red-hat-openshift", t.code);
      assert.equal(t.credential?.providerSlug, "red-hat", t.code);
      assert.ok(t.credential?.officialObjectivesUrl.startsWith("https://www.redhat.com/en/services/training/"), `${t.code} cites redhat.com`);
      assert.equal(activeUnits(t).reduce((a, u) => a + (u.weight ?? 0), 0), 100, `${t.code} weights`);
      // Red Hat publishes no weights or pass mark: the course must say so rather than invent them.
      assert.match(t.credential?.passingScorePolicy ?? "", /does not publish a pass mark or per-domain weights/, t.code);
      assert.match(t.credential?.questionFormat ?? "", /performance-based/, t.code);
    }
    const ex188 = tracks.get("EX188")!;
    assert.equal(ex188.credential?.credentialName, "Red Hat Certified Developer in Cloud-native Applications");
    assert.equal(ex188.credential?.durationMinutes, 150);
    assert.deepEqual(
      activeUnits(ex188).map((u) => u.title),
      ["Implement images using Podman and Containerfile", "Manage images", "Run containers locally using Podman", "Run multi-container applications with Podman", "Troubleshoot containerized applications"]
    );
    const ex280 = tracks.get("EX280")!;
    assert.equal(ex280.credential?.credentialName, "Red Hat Certified System Administrator in OpenShift");
    assert.equal(ex280.credential?.durationMinutes, 180);
    assert.deepEqual(
      activeUnits(ex280).map((u) => u.title),
      ["Manage OpenShift Container Platform", "Declarative Resource Management", "Deploy applications", "Manage authentication and authorization", "Configure network security", "Enable developer self-service", "Manage OpenShift operators", "Configure application security"]
    );
    // Hands-on with the vendor's own tools.
    for (const lab of setFor("EX188").labs) {
      assert.match(lab.steps.flatMap((s) => s.parts.map((p) => p.modelAnswer)).join("\n"), /podman |FROM |HEALTHCHECK|ENTRYPOINT/, `EX188/${lab.slug} uses Podman`);
    }
    for (const lab of setFor("EX280").labs) {
      assert.match(lab.steps.flatMap((s) => s.parts.map((p) => p.modelAnswer)).join("\n"), /\boc |apiVersion:|helm /, `EX280/${lab.slug} uses oc or manifests`);
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

  test("every lab carries the general safety note, a fictional organization, and the right shape for its kind", () => {
    for (const code of CODES) {
      for (const lab of setFor(code).labs) {
        assert.equal(lab.safetyNote, GENERAL_SAFETY, `${code}/${lab.slug}`);
        assert.match(lab.brief, /fictional/i, `${code}/${lab.slug}: the brief says the organization is fictional`);
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
        assert.match(answers, /kubectl|\boc |podman |helm |cosign |trivy |docker |apiVersion:|^\s*(FROM|spec|metadata|affinity|tolerations|resources|volumes|containers|rules|egress|ingress|startupProbe|livenessProbe|readinessProbe|securityContext|env|initContainers):/m, `${code}/${lab.slug}: the reference answers are hands-on`);
        if (lab.kind === "case") {
          const shown = lab.steps.map((s) => s.text).join("\n");
          assert.match(shown, /\$ kubectl|\$ oc |\$ podman|\$ sudo|\$ systemctl|\$ etcdctl|\$ crictl|\$ docker|\$ df |\/ # /, `${code}/${lab.slug}: the case shows authored command output`);
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
    for (const t of [...KUBERNETES_TRACKS, ...DOCKER_TRACKS, ...CNCF_ECOSYSTEM_TRACKS]) {
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
