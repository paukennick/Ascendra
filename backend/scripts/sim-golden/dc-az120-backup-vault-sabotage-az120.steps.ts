// REQ-335: golden paths for the AZ120 band of SC500/sc500-backup-vault-sabotage
// (AZ120/backup-vault-sabotage-az120.band.json): the same case and paths, registered to the
// AZ120 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sc500-backup.steps.ts";

export const ENTRY = { course: "AZ120", slug: "backup-vault-sabotage-az120" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
