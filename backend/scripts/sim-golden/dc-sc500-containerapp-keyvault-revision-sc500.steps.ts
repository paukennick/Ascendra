// REQ-335: golden paths for the SC500 band of AI200/ai200-containerapp-keyvault-revision
// (SC500/containerapp-keyvault-revision-sc500.band.json): the same case and paths, registered to the
// SC500 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-aca.steps.ts";

export const ENTRY = { course: "SC500", slug: "containerapp-keyvault-revision-sc500" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
