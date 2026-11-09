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
import { AWSCLF_LABS } from "./aws-clf";
import { AWSAIF_LABS } from "./aws-aif";
import { AWSDVA_LABS } from "./aws-dva";
import { AWSSOA_LABS } from "./aws-soa";
import { AWSSAP_LABS } from "./aws-sap";
import { AZ900_LABS } from "./microsoft-az900";
import { AZ104_LABS } from "./microsoft-az104";
import { AZ305_LABS } from "./microsoft-az305";
import { AZ400_LABS } from "./microsoft-az400";
import { AZ700_LABS } from "./microsoft-az700";
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
  AWSCLF_LABS,
  AWSAIF_LABS,
  AWSDVA_LABS,
  AWSSOA_LABS,
  AWSSAP_LABS,
  AZ900_LABS,
  AZ104_LABS,
  AZ305_LABS,
  AZ400_LABS,
  AZ700_LABS,
].map(withValueSources);
