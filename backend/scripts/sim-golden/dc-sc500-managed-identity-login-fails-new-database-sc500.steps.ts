// REQ-335: golden paths for the SC500 band of DP300/managed-identity-login-fails-new-database
// (SC500/managed-identity-login-fails-new-database-sc500.band.json): the same case and paths, registered to the
// SC500 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./dp300-entra.steps.ts";

export const ENTRY = { course: "SC500", slug: "managed-identity-login-fails-new-database-sc500" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
