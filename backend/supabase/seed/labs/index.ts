// REQ-123: every authored lab set, in seed order (after all tracks).
import type { SeedLabSet } from "./types";
import { AWSSAA_LABS } from "./awssaa";
import { PMP_LABS } from "./pmp";
import { NCLEXRN_LABS } from "./nclexrn";
import { NASMCPT_LABS } from "./nasmcpt";
import { CCRNADULT_LABS, CCRNNEO_LABS, CCRNPEDS_LABS } from "./ccrn";
import { NETWORKPLUS_LABS } from "./comptia-networkplus";
import { LINUXPLUS_LABS } from "./comptia-linuxplus";
import { SERVERPLUS_LABS } from "./comptia-serverplus";
import { AUTOOPSPLUS_LABS } from "./comptia-autoopsplus";
import { DATAPLUS_LABS } from "./comptia-dataplus";
import { DATAAI_LABS } from "./comptia-dataai";

export const LAB_SETS: readonly SeedLabSet[] = [
  AWSSAA_LABS,
  PMP_LABS,
  NCLEXRN_LABS,
  NASMCPT_LABS,
  CCRNADULT_LABS,
  CCRNPEDS_LABS,
  CCRNNEO_LABS,
  // REQ-160: CompTIA infrastructure and data courses.
  NETWORKPLUS_LABS,
  LINUXPLUS_LABS,
  SERVERPLUS_LABS,
  AUTOOPSPLUS_LABS,
  DATAPLUS_LABS,
  DATAAI_LABS,
];
