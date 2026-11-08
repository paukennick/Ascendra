// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { AZ900_LABS } from "./microsoft-az900";
import { AZ104_LABS } from "./microsoft-az104";
import { AZ305_LABS } from "./microsoft-az305";
import { AZ400_LABS } from "./microsoft-az400";
import { AZ700_LABS } from "./microsoft-az700";

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS, AZ900_LABS, AZ104_LABS, AZ305_LABS, AZ400_LABS, AZ700_LABS];
