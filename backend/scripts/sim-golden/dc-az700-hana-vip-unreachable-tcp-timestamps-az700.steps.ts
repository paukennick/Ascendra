// REQ-335: golden paths for the AZ700 band of AZ120/hana-vip-unreachable-tcp-timestamps
// (AZ700/hana-vip-unreachable-tcp-timestamps-az700.band.json): the same case and paths, registered to the
// AZ700 objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./az120-lbprobe.steps.ts";

export const ENTRY = { course: "AZ700", slug: "hana-vip-unreachable-tcp-timestamps-az700" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
