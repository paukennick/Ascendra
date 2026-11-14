// REQ-275..278: lab sets for the nursing specialty and advanced practice
// courses, gathered so labs/index.ts takes a single additive line.
import type { SeedLabSet } from "./types";
import { PCCN_LABS } from "./pccn";

export const NURSING_SPECIALTY_LAB_SETS: readonly SeedLabSet[] = [PCCN_LABS];
