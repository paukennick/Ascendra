// REQ-316: golden paths for the Security+ (SY0-701) band of CEH/ceh-arp-poisoning-finance-vlan
// (SECPLUS/arp-poisoning-finance-vlan-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./ceh-arp.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "arp-poisoning-finance-vlan-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
