// REQ-316: golden paths for the Security+ (SY0-701) band of CEH/ceh-blind-sqli-search
// (SECPLUS/blind-sqli-search-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./ceh-sqli.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "blind-sqli-search-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
