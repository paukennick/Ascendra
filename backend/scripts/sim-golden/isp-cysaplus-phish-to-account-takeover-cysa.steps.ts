// REQ-336: golden paths for the CYSAPLUS band of SECPLUS/phish-to-account-takeover
// (CYSAPLUS/phish-to-account-takeover-cysa.band.json): the same case and paths, registered to the
// CYSAPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./secplus-phish.steps.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "phish-to-account-takeover-cysa" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
