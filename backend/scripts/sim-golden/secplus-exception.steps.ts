// REQ-313: golden paths for the SECPLUS band of cism-risk-appetite-exception
// (SECPLUS/risk-exception-appetite-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective (docs/sims.md 22.26).
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cism-exception.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "risk-exception-appetite-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
