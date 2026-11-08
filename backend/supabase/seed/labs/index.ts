// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { PYTHON_LABS } from "./dev-python";
import { JAVASCRIPT_LABS } from "./dev-javascript";
import { MSHI_LABS } from "./informatics-mshi";
import { MSCS_LABS } from "./academic-mscs";
import { CMPCBS_LABS } from "./academic-cmpcbs";

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS, PYTHON_LABS, JAVASCRIPT_LABS, MSHI_LABS, MSCS_LABS, CMPCBS_LABS];
