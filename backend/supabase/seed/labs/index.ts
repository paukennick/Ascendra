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
  // REQ-164: containers and Kubernetes.
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
