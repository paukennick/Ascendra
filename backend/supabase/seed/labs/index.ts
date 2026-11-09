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
import { AWSANS_LABS } from "./aws-ans";
import { AWSDEA_LABS } from "./aws-dea";
import { AWSDOP_LABS } from "./aws-dop";
import { AWSMLA_LABS } from "./aws-mla";
import { AWSSCS_LABS } from "./aws-scs";
import { AZ900_LABS } from "./microsoft-az900";
import { AZ104_LABS } from "./microsoft-az104";
import { AZ305_LABS } from "./microsoft-az305";
import { AZ400_LABS } from "./microsoft-az400";
import { AZ700_LABS } from "./microsoft-az700";
import { AZ120_LABS } from "./microsoft-az120";
import { AZ140_LABS } from "./microsoft-az140";
import { DP900_LABS } from "./microsoft-dp900";
import { DP300_LABS } from "./microsoft-dp300";
import { GCPCDL_LABS } from "./gcp-cdl";
import { GCPACE_LABS } from "./gcp-ace";
import { GCPPCA_LABS } from "./gcp-pca";
import { GCPDEV_LABS } from "./gcp-dev";
import { GCPDEVOPS_LABS } from "./gcp-devops";
import { GCPDBE_LABS } from "./gcp-dbe";
import { GCPGAIL_LABS } from "./gcp-gail";
import { GCPMLE_LABS } from "./gcp-mle";
import { GCPPDE_LABS } from "./gcp-pde";
import { GCPSEC_LABS } from "./gcp-sec";
import { CLOUDPLUS_LABS } from "./comptia-cloudplus";
import { CLOUDNETX_LABS } from "./comptia-cloudnetx";
import { SECPLUS_LABS } from "./security-secplus";
import { SECPLUSV8_LABS } from "./security-secplusv8";
import { CYSAPLUS_LABS } from "./security-cysaplus";
import { PENTESTPLUS_LABS } from "./security-pentestplus";
import { SECURITYX_LABS } from "./security-securityx";
import { SECAIPLUS_LABS } from "./security-secaiplus";
import { NETWORKPLUS_LABS } from "./comptia-networkplus";
import { LINUXPLUS_LABS } from "./comptia-linuxplus";
import { SERVERPLUS_LABS } from "./comptia-serverplus";
import { AUTOOPSPLUS_LABS } from "./comptia-autoopsplus";
import { DATAPLUS_LABS } from "./comptia-dataplus";
import { DATAAI_LABS } from "./comptia-dataai";
import { ABPTSOCS_LABS } from "./pt-abpts-ocs";
import { ABPTSGCS_LABS } from "./pt-abpts-gcs";
import { ABPTSNCS_LABS } from "./pt-abpts-ncs";
import { ABPTSCCS_LABS } from "./pt-abpts-ccs";
import { ABPTSONC_LABS } from "./pt-abpts-oncology";
import { ABPTSPCS_LABS } from "./pt-abpts-pediatrics";
import { ABPTSPWCS_LABS } from "./pt-abpts-pelvic-health";
import { ABPTSSCS_LABS } from "./pt-abpts-sports";
import { ABPTSWMS_LABS } from "./pt-abpts-wound";
import { PYTHON_LABS } from "./dev-python";
import { JAVASCRIPT_LABS } from "./dev-javascript";
import { MSHI_LABS } from "./informatics-mshi";
import { MSCS_LABS } from "./academic-mscs";
import { CMPCBS_LABS } from "./academic-cmpcbs";
import { CKA_LABS } from "./k8s-cka";
import { CKAD_LABS } from "./k8s-ckad";
import { KCNA_LABS } from "./k8s-kcna";
import { CKS_LABS } from "./k8s-cks";
import { KCSA_LABS } from "./k8s-kcsa";
import { DCA_LABS } from "./k8s-dca";
import { PCA_LABS } from "./k8s-pca";
import { OTCA_LABS } from "./k8s-otca";
import { CGOA_LABS } from "./k8s-cgoa";
import { CAPA_LABS } from "./k8s-capa";
import { CCA_LABS } from "./k8s-cca";
import { ICA_LABS } from "./k8s-ica";
import { KCA_LABS } from "./k8s-kca";
import { CBA_LABS } from "./k8s-cba";
import { CNPA_LABS } from "./k8s-cnpa";
import { CNPE_LABS } from "./k8s-cnpe";
import { EX188_LABS } from "./k8s-ex188";
import { EX280_LABS } from "./k8s-ex280";
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
  AWSANS_LABS,
  AWSDEA_LABS,
  AWSDOP_LABS,
  AWSMLA_LABS,
  AWSSCS_LABS,
  AZ900_LABS,
  AZ104_LABS,
  AZ305_LABS,
  AZ400_LABS,
  AZ700_LABS,
  AZ120_LABS,
  AZ140_LABS,
  DP900_LABS,
  DP300_LABS,
  GCPCDL_LABS,
  GCPACE_LABS,
  GCPPCA_LABS,
  GCPDEV_LABS,
  GCPDEVOPS_LABS,
  GCPDBE_LABS,
  GCPGAIL_LABS,
  GCPMLE_LABS,
  GCPPDE_LABS,
  GCPSEC_LABS,
  CLOUDPLUS_LABS,
  CLOUDNETX_LABS,
  SECPLUS_LABS,
  SECPLUSV8_LABS,
  CYSAPLUS_LABS,
  PENTESTPLUS_LABS,
  SECURITYX_LABS,
  SECAIPLUS_LABS,
  NETWORKPLUS_LABS,
  LINUXPLUS_LABS,
  SERVERPLUS_LABS,
  AUTOOPSPLUS_LABS,
  DATAPLUS_LABS,
  DATAAI_LABS,
  ABPTSOCS_LABS,
  ABPTSGCS_LABS,
  ABPTSNCS_LABS,
  ABPTSCCS_LABS,
  ABPTSONC_LABS,
  ABPTSPCS_LABS,
  ABPTSPWCS_LABS,
  ABPTSSCS_LABS,
  ABPTSWMS_LABS,
  PYTHON_LABS,
  JAVASCRIPT_LABS,
  MSHI_LABS,
  MSCS_LABS,
  CMPCBS_LABS,
  CKA_LABS,
  CKAD_LABS,
  KCNA_LABS,
  CKS_LABS,
  KCSA_LABS,
  DCA_LABS,
  PCA_LABS,
  OTCA_LABS,
  CGOA_LABS,
  CAPA_LABS,
  CCA_LABS,
  ICA_LABS,
  KCA_LABS,
  CBA_LABS,
  CNPA_LABS,
  CNPE_LABS,
  EX188_LABS,
  EX280_LABS,
].map(withValueSources);
