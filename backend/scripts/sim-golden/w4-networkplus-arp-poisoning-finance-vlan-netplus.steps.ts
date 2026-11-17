// REQ-316: golden paths for the Network+ (N10-009) band of CEH/ceh-arp-poisoning-finance-vlan
// (NETWORKPLUS/arp-poisoning-finance-vlan-netplus.band.json): the same case and paths, registered to the
// NETWORKPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./ceh-arp.steps.ts";

export const ENTRY = { course: "NETWORKPLUS", slug: "arp-poisoning-finance-vlan-netplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
