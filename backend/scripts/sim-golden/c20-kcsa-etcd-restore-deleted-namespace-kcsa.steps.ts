// REQ-320: golden paths for the KCSA band of CKA/etcd-restore-deleted-namespace
// (KCSA/etcd-restore-deleted-namespace-kcsa.band.json): the same case and paths, registered to the
// KCSA objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./cka-etcd.steps.ts";

export const ENTRY = { course: "KCSA", slug: "etcd-restore-deleted-namespace-kcsa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
