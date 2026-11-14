// REQ-275..278: the nursing specialty and advanced practice courses built on
// 2026-11-14, gathered in one list so catalog.ts takes a single additive line.
import type { SeedTrack } from "../data";
import { PCCN_TRACKS } from "./pccn";
import { CEN_TRACKS } from "./cen";
import { CMSRN_TRACKS } from "./cmsrn";

export const NURSING_SPECIALTY_TRACKS: SeedTrack[] = [...CMSRN_TRACKS, ...CEN_TRACKS, ...PCCN_TRACKS];
