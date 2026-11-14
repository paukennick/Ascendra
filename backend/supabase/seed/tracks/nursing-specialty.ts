// REQ-275..278: the nursing specialty and advanced practice courses built on
// 2026-11-14, gathered in one list so catalog.ts takes a single additive line.
import type { SeedTrack } from "../data";
import { PCCN_TRACKS } from "./pccn";
import { CEN_TRACKS } from "./cen";

export const NURSING_SPECIALTY_TRACKS: SeedTrack[] = [...PCCN_TRACKS, ...CEN_TRACKS];
