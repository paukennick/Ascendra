// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { ACECPT_LABS } from "./fitness-acecpt";
import { ACSMCPT_LABS } from "./fitness-acsmcpt";
import { NSCACPT_LABS } from "./fitness-nscacpt";
import { NSCACSCS_LABS } from "./fitness-nscacscs";
import { NCCPTCPT_LABS } from "./fitness-nccptcpt";
import { NPTEPT_LABS } from "./pt-nptept";
import { NPTEPTA_LABS } from "./pt-nptepta";
import { DPT_LABS } from "./pt-dpt";
// REQ-150: more project-management courses.
import { CAPM_LABS } from "./pm-capm";
import { PMIACP_LABS } from "./pm-acp";
import { PMIRMP_LABS } from "./pm-rmp";
import { PMISP_LABS } from "./pm-sp";
import { PMIPBA_LABS } from "./pm-pba";
import { PROJECTPLUS_LABS } from "./pm-projectplus";
import { NCLEXPN_LABS } from "./nursing-nclexpn";
import { LPNVN_LABS } from "./nursing-lpnvn";
import { CNA_LABS } from "./nursing-cna";
import { ADNRN_LABS } from "./nursing-adnrn";
import { BSNRN_LABS } from "./nursing-bsnrn";
import { withValueSources } from "./value-sources";

// REQ-142: each clinical and fitness lab's own guideline sources are attached
// here (value-sources.ts), apart from the lab content.
export const LAB_SETS: readonly SeedLabSet[] = [
  AWSSAA_LABS,
  PMP_LABS,
  NCLEXRN_LABS,
  NASMCPT_LABS,
  CCRNADULT_LABS,
  CCRNPEDS_LABS,
  CCRNNEO_LABS,
  ACECPT_LABS,
  ACSMCPT_LABS,
  NSCACPT_LABS,
  NSCACSCS_LABS,
  NCCPTCPT_LABS,
  NPTEPT_LABS,
  NPTEPTA_LABS,
  DPT_LABS,
  CAPM_LABS,
  PMIACP_LABS,
  PMIRMP_LABS,
  PMISP_LABS,
  PMIPBA_LABS,
  PROJECTPLUS_LABS,
  NCLEXPN_LABS,
  LPNVN_LABS,
  CNA_LABS,
  ADNRN_LABS,
  BSNRN_LABS,
].map(withValueSources);
