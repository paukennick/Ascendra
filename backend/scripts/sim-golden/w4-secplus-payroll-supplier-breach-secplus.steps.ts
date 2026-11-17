// REQ-316: golden paths for the Security+ (SY0-701) band of CISM/cism-payroll-supplier-breach
// (SECPLUS/payroll-supplier-breach-secplus.band.json): the same case and paths, registered to the
// SECPLUS objective.
import type { StepsSpec } from "./steps.ts";
import { paths } from "./cism-supplier.steps.ts";

export const ENTRY = { course: "SECPLUS", slug: "payroll-supplier-breach-secplus" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
