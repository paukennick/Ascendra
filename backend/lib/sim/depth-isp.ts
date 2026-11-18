// REQ-336 (docs/sims.md 22.40): the depth round for the CNCF ecosystem, CompTIA,
// security and project-management courses (depth-infra-sec-pm, 2026-11-17), by
// slug, for lib/sim/depth-isp.test.ts. Tests select their documents from this
// list, never by course code (FAIL-2002). Scenarios are new cases; bands register
// a case on another course's objective that it teaches (docs/sims.md 4.7).
export interface DepthIspEntry { course: string; slug: string; screen: string; profile: string; kind: "scenario" | "band"; steps: string; base?: string }
export const DEPTH_ISP: readonly DepthIspEntry[] = [
  { course: "CAPA", slug: "argocd-prune-moved-database", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-capa-argocd-sync" },
  { course: "CAPA", slug: "argo-events-upload-storm", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-capa-events" },
  { course: "CAPA", slug: "rollouts-analysis-gate-passes-bad-canary", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-capa-rollouts-analysis" },
  { course: "CBA", slug: "backstage-upgrade-mismatched-packages", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-cba-devflow" },
  { course: "CBA", slug: "backstage-production-catalog-wiped", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-cba-infra" },
  { course: "CBA", slug: "backstage-catalog-ingestion-gaps", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-cba-catalog" },
  { course: "CCA", slug: "cilium-default-deny-breaks-dns", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-cca-policy" },
  { course: "CCA", slug: "cilium-wireguard-cross-node-plaintext", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-cca-mesh" },
  { course: "CCA", slug: "cluster-mesh-failover-overlapping-cidr", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-cca-clustermesh" },
  { course: "CGOA", slug: "gitops-claim-review-push-pipeline", screen: "governance-board", profile: "governance", kind: "scenario", steps: "isp-cgoa-principles" },
  { course: "CGOA", slug: "gitops-store-fleet-patterns", screen: "governance-board", profile: "governance", kind: "scenario", steps: "isp-cgoa-patterns" },
  { course: "CGOA", slug: "argocd-prune-moved-database-cgoa", screen: "terminal", profile: "infrastructure", kind: "band", steps: "isp-cgoa-argocd-prune-moved-database-cgoa", base: "CAPA/argocd-prune-moved-database" },
];
