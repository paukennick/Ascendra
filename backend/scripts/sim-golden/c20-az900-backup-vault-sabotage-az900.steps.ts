// REQ-320: golden paths for the AZ900 band of SC500/sc500-backup-vault-sabotage
// (AZ900/backup-vault-sabotage-az900.band.json): the same case and paths, registered to the
// AZ900 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sc500-backup.steps.ts";

export const ENTRY = { course: "AZ900", slug: "backup-vault-sabotage-az900" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
