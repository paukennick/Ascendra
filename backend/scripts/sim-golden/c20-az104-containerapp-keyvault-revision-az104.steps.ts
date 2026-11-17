// REQ-320: golden paths for the AZ104 band of AI200/ai200-containerapp-keyvault-revision
// (AZ104/containerapp-keyvault-revision-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-aca.steps.ts";

export const ENTRY = { course: "AZ104", slug: "containerapp-keyvault-revision-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
