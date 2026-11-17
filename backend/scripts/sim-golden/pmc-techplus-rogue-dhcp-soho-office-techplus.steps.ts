// REQ-321: golden paths for the Tech+ (FC0-U71) band of APLUS_CORE1/rogue-dhcp-soho-office
// (TECHPLUS/rogue-dhcp-soho-office-techplus.band.json): the same case and paths, registered to the
// TECHPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./aplus1-rogue.steps.ts";

export const ENTRY = { course: "TECHPLUS", slug: "rogue-dhcp-soho-office-techplus" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
