// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { GCPDBE_LABS } from "./gcp-dbe";
import { GCPGAIL_LABS } from "./gcp-gail";
import { GCPMLE_LABS } from "./gcp-mle";
import { GCPPDE_LABS } from "./gcp-pde";
import { GCPSEC_LABS } from "./gcp-sec";
import { CLOUDPLUS_LABS } from "./comptia-cloudplus";
import { CLOUDNETX_LABS } from "./comptia-cloudnetx";

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS,
  // REQ-158
  GCPDBE_LABS, GCPGAIL_LABS, GCPMLE_LABS, GCPPDE_LABS, GCPSEC_LABS, CLOUDPLUS_LABS, CLOUDNETX_LABS,
];
