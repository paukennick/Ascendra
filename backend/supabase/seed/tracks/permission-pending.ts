// REQ-318 (Nick, 2026-11-16): courses whose exam body allows no use of its
// marks without written permission (ISC2, EC-Council, NBCC, BCEN; policies
// read 2026-11-16, CHANGELOG REQ-309) are hidden from the catalog with the
// REQ-194 mechanism until that permission, or legal advice, arrives. Hidden,
// not deleted: units, objectives, labs and sims stay seeded, and learners who
// already studied a course keep it. Remove hiddenAt from a track and re-seed
// to bring it back.
export const PERMISSION_PENDING_HIDDEN_AT = "2026-11-16T00:00:00Z";
export const PERMISSION_PENDING_REASON =
  "Hidden pending the exam body's permission to name its exam (REQ-309/REQ-318)";
