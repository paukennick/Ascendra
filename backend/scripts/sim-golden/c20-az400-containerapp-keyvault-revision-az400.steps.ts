// REQ-320: golden paths for the AZ400 band of AI200/ai200-containerapp-keyvault-revision
// (AZ400/containerapp-keyvault-revision-az400.band.json): the same case and paths, registered to the
// AZ400 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-aca.steps.ts";

export const ENTRY = { course: "AZ400", slug: "containerapp-keyvault-revision-az400" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
