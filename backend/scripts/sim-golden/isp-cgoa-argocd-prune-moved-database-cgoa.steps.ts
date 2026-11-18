// REQ-336: golden paths for the CGOA band of CAPA/argocd-prune-moved-database
// (CGOA/argocd-prune-moved-database-cgoa.band.json): the same case and paths, registered to the
// CGOA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./isp-capa-argocd-sync.steps.ts";

export const ENTRY = { course: "CGOA", slug: "argocd-prune-moved-database-cgoa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
