// REQ-320: golden paths for the AZ305 band of SC500/sc500-backup-vault-sabotage
// (AZ305/backup-vault-sabotage-az305.band.json): the same case and paths, registered to the
// AZ305 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sc500-backup.steps.ts";

export const ENTRY = { course: "AZ305", slug: "backup-vault-sabotage-az305" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
