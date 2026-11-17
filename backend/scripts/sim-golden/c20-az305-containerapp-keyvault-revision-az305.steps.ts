// REQ-320: golden paths for the AZ305 band of AI200/ai200-containerapp-keyvault-revision
// (AZ305/containerapp-keyvault-revision-az305.band.json): the same case and paths, registered to the
// AZ305 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./ai200-aca.steps.ts";

export const ENTRY = { course: "AZ305", slug: "containerapp-keyvault-revision-az305" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
