// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { SECPLUS_LABS } from "./security-secplus";
import { SECPLUSV8_LABS } from "./security-secplusv8";
import { CYSAPLUS_LABS } from "./security-cysaplus";
import { PENTESTPLUS_LABS } from "./security-pentestplus";
import { SECURITYX_LABS } from "./security-securityx";
import { SECAIPLUS_LABS } from "./security-secaiplus";

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS, SECPLUS_LABS, SECPLUSV8_LABS, CYSAPLUS_LABS, PENTESTPLUS_LABS, SECURITYX_LABS, SECAIPLUS_LABS];
