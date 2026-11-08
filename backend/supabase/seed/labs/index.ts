// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { ABPTSOCS_LABS } from "./pt-abpts-ocs";
import { ABPTSGCS_LABS } from "./pt-abpts-gcs";
import { ABPTSNCS_LABS } from "./pt-abpts-ncs";
import { ABPTSCCS_LABS } from "./pt-abpts-ccs";

export const LAB_SETS: readonly SeedLabSet[] = [
  AWSSAA_LABS,
  PMP_LABS,
  NCLEXRN_LABS,
  NASMCPT_LABS,
  CCRNADULT_LABS,
  CCRNPEDS_LABS,
  CCRNNEO_LABS,
  // REQ-151: ABPTS specialist courses (ECS still to come).
  ABPTSOCS_LABS,
  ABPTSGCS_LABS,
  ABPTSNCS_LABS,
  ABPTSCCS_LABS,
];
