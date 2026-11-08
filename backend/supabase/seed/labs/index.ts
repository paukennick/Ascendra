// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { GCPCDL_LABS } from "./gcp-cdl";
import { GCPACE_LABS } from "./gcp-ace";
import { GCPPCA_LABS } from "./gcp-pca";
import { GCPDEV_LABS } from "./gcp-dev";
import { GCPDEVOPS_LABS } from "./gcp-devops";

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS, GCPCDL_LABS, GCPACE_LABS, GCPPCA_LABS, GCPDEV_LABS, GCPDEVOPS_LABS];
