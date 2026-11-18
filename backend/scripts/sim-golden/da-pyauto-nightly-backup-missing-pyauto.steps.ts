// REQ-333: golden paths for the PYAUTO band of LINUXFUND/nightly-backup-missing
// (PYAUTO/nightly-backup-missing-pyauto.band.json): the same case and paths, registered to the
// PYAUTO objective.
import type { StepsSpec } from "./steps.ts";
import { spec as baseSpec } from "./linuxfund-journal.steps.ts";

export const ENTRY = { course: "PYAUTO", slug: "nightly-backup-missing-pyauto" };

export function spec(): StepsSpec {
  return { ...baseSpec(), slug: ENTRY.slug };
}
