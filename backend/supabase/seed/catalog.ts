// REQ-102: the whole seeded catalog, in seed order, in one place -- so the
// seed script and the blueprint tests (lib/catalog-blueprints.test.ts) walk
// exactly the same list and a track added to the seed cannot skip the
// "every certification track has a credential block" check.
import {
  MSCS_TRACK,
  SECPLUS_TRACK,
  PYTHON_TRACK,
  JAVASCRIPT_TRACK,
  LINUXPLUS_TRACK,
  CYSAPLUS_TRACK,
  PENTESTPLUS_TRACK,
  SECURITYX_TRACK,
  CMPCBS_TRACK,
  type SeedTrack,
} from "./data";
import { AWS_TRACKS } from "./tracks/aws";
import { AZURE_TRACKS } from "./tracks/azure";
import { GCP_TRACKS } from "./tracks/gcp";
import { NURSING_TRACKS } from "./tracks/nursing";
import { COMPTIA_TRACKS } from "./tracks/comptia";
import { PM_TRACKS } from "./tracks/pm";
import { PT_TRACKS } from "./tracks/pt";
import { FITNESS_TRACKS } from "./tracks/fitness";
import { CCRN_TRACKS } from "./tracks/ccrn";
import { CCRN_PEDS_NEO_TRACKS } from "./tracks/ccrn-peds-neo";
import { MS_HEALTH_INFORMATICS_TRACK } from "./tracks/informatics";

export const CATALOG_TRACKS: readonly SeedTrack[] = [
  MSCS_TRACK,
  SECPLUS_TRACK,
  PYTHON_TRACK,
  JAVASCRIPT_TRACK,
  LINUXPLUS_TRACK,
  CYSAPLUS_TRACK,
  PENTESTPLUS_TRACK,
  SECURITYX_TRACK,
  CMPCBS_TRACK,
  ...AWS_TRACKS,
  ...AZURE_TRACKS,
  ...GCP_TRACKS,
  ...NURSING_TRACKS,
  ...COMPTIA_TRACKS,
  ...PM_TRACKS,
  ...PT_TRACKS,
  ...FITNESS_TRACKS,
  // REQ-086: AACN CCRN (Adult, Pediatric, Neonatal) and the MS Health
  // Informatics degree pathway.
  ...CCRN_TRACKS,
  ...CCRN_PEDS_NEO_TRACKS,
  MS_HEALTH_INFORMATICS_TRACK,
];

// Units the learner is still taught: everything not marked retired in the
// seed. Exam domains and weight checks are computed from these only -- a
// retired unit stays in the seed (and the database) so learner history on
// it survives, but it is no longer part of the exam blueprint.
export function activeUnits(track: SeedTrack): SeedTrack["units"] {
  return track.units.filter((u) => !u.retiredAt);
}
