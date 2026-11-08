// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { NCLEXPN_LABS } from "./nursing-nclexpn";
import { LPNVN_LABS } from "./nursing-lpnvn";
import { CNA_LABS } from "./nursing-cna";
import { ADNRN_LABS } from "./nursing-adnrn";
import { BSNRN_LABS } from "./nursing-bsnrn";

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS, NCLEXPN_LABS, LPNVN_LABS, CNA_LABS, ADNRN_LABS, BSNRN_LABS];
