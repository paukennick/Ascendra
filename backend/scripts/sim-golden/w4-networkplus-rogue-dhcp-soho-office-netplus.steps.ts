// REQ-316: golden paths for the Network+ (N10-009) band of APLUS_CORE1/rogue-dhcp-soho-office
// (NETWORKPLUS/rogue-dhcp-soho-office-netplus.band.json): the same case and paths, registered to the
// NETWORKPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aplus1-rogue.steps.ts";

export const ENTRY = { course: "NETWORKPLUS", slug: "rogue-dhcp-soho-office-netplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
