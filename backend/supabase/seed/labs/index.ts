// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { AWSANS_LABS } from "./aws-ans";
import { AWSDEA_LABS } from "./aws-dea";
import { AWSDOP_LABS } from "./aws-dop";
import { AWSMLA_LABS } from "./aws-mla";
import { AWSSCS_LABS } from "./aws-scs";

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS, AWSANS_LABS, AWSDEA_LABS, AWSDOP_LABS, AWSMLA_LABS, AWSSCS_LABS];
