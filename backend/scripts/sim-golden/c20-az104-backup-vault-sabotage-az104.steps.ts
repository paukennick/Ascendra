// REQ-320: golden paths for the AZ104 band of SC500/sc500-backup-vault-sabotage
// (AZ104/backup-vault-sabotage-az104.band.json): the same case and paths, registered to the
// AZ104 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./sc500-backup.steps.ts";

export const ENTRY = { course: "AZ104", slug: "backup-vault-sabotage-az104" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
