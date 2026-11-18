// REQ-336 (docs/sims.md 22.40): the depth round for the CNCF ecosystem, CompTIA,
// security and project-management courses (depth-infra-sec-pm, 2026-11-17), by
// slug, for lib/sim/depth-isp.test.ts. Tests select their documents from this
// list, never by course code (FAIL-2002). Scenarios are new cases; bands register
// a case on another course's objective that it teaches (docs/sims.md 4.7).
export interface DepthIspEntry { course: string; slug: string; screen: string; profile: string; kind: "scenario" | "band"; steps: string; base?: string }
export const DEPTH_ISP: readonly DepthIspEntry[] = [
  { course: "CAPA", slug: "argocd-prune-moved-database", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "isp-capa-argocd-sync" },
];
