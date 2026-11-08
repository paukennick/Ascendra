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

export const LAB_SETS: readonly SeedLabSet[] = [AWSSAA_LABS, PMP_LABS, NCLEXRN_LABS, NASMCPT_LABS, CCRNADULT_LABS, CCRNPEDS_LABS, CCRNNEO_LABS, ACECPT_LABS, ACSMCPT_LABS, NSCACPT_LABS, NSCACSCS_LABS, NCCPTCPT_LABS, NPTEPT_LABS, NPTEPTA_LABS, DPT_LABS, CKA_LABS, CKAD_LABS, KCNA_LABS, CKS_LABS, KCSA_LABS, DCA_LABS];
