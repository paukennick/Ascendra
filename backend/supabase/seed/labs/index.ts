// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
// REQ-150: more project-management courses.
import { CAPM_LABS } from "./pm-capm";
import { PMIACP_LABS } from "./pm-acp";
import { PMIRMP_LABS } from "./pm-rmp";
import { PMISP_LABS } from "./pm-sp";
import { PMIPBA_LABS } from "./pm-pba";
import { PROJECTPLUS_LABS } from "./pm-projectplus";

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS,
  CAPM_LABS, PMIACP_LABS, PMIRMP_LABS, PMISP_LABS, PMIPBA_LABS, PROJECTPLUS_LABS];
