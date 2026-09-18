// Course disclaimers, keyed by the `disclaimer_key` a track carries.
//
// The wording lives here rather than in the database so it can be corrected
// without a data migration across every track that shares a key. The database
// stores which key a track uses and which version the learner accepted.
//
// Bump `version` when the meaning changes, not when a typo is fixed: every
// learner who accepted an older version is asked again, and being asked twice
// for a comma is noise that teaches people to tap through without reading.
// The version here must match `disclaimerVersion` on the seed track.

export interface Disclaimer {
  version: number;
  title: string;
  /** Short line under the title; sets the frame before the detail. */
  summary: string;
  /** Each paragraph is rendered as its own block. */
  body: string[];
  /** Label on the button that records acceptance. */
  acceptLabel: string;
}

export const DISCLAIMERS: Record<string, Disclaimer> = {
  "nursing-clinical-content": {
    version: 1,
    title: "Before you start this course",
    summary:
      "This is exam preparation. It is not clinical guidance, and it must not be used to make decisions about a real patient.",
    body: [
      "Ascendra's lessons are generated from published examination blueprints and are written to prepare you for a test. They are not reviewed by a licensed clinician, they are not a care protocol, and they can be wrong.",
      "Nursing practice is governed by your licence, your employer's policies, and the scope of practice in your jurisdiction. Where anything here differs from those, those win -- every time, without exception.",
      "Never act on something you read here at the bedside. If a lesson conflicts with your instructor, your facility's policy, a current drug reference, or a provider's order, treat this course as the thing that is wrong and raise it with them.",
      "Drug dosages, laboratory values, and emergency procedures change. Verify anything you intend to rely on against a current authoritative source before you use it.",
      "If you are facing a real clinical emergency, stop and follow your facility's emergency procedure.",
    ],
    acceptLabel: "I understand -- start the course",
  },
};

export function getDisclaimer(key: string | null | undefined): Disclaimer | null {
  if (!key) return null;
  return DISCLAIMERS[key] ?? null;
}
