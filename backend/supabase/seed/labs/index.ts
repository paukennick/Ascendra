// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { ABPTSONC_LABS } from "./pt-abpts-oncology";
import { ABPTSPCS_LABS } from "./pt-abpts-pediatrics";
import { ABPTSPWCS_LABS } from "./pt-abpts-pelvic-health";
import { ABPTSSCS_LABS } from "./pt-abpts-sports";
import { ABPTSWMS_LABS } from "./pt-abpts-wound";

export const LAB_SETS: readonly SeedLabSet[] = [
  AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS,
  // REQ-152: ABPTS specialist courses, wave B.
  ABPTSONC_LABS, ABPTSPCS_LABS, ABPTSPWCS_LABS, ABPTSSCS_LABS, ABPTSWMS_LABS,
];
