// REQ-123: authored lab content for the seed (migration 050 `labs`).
import type { SourceRef } from "../sources";
//
// A lab names its objective by the objective's exact title in the track, so
// re-ordering objectives cannot silently move a lab; the seed test fails if a
// title no longer matches. Every authored lab is stored with source
// 'authored' and review_status 'needs_expert_review' and is not served in
// production until a subject expert approves it (docs/labs.md).

export interface SeedLabPart {
  label: string;
  criteria: string;
  modelAnswer: string;
}

export interface SeedLabStep {
  // A case: the new information this step reveals (authored; it never
  // depends on what the learner wrote). A build lab: "" (the brief says it all).
  text: string;
  ask: string;
  parts: SeedLabPart[];
}

export interface SeedLab {
  slug: string;
  objective: string;
  kind: "build" | "case";
  title: string;
  brief: string;
  safetyNote?: string;
  steps: SeedLabStep[];
}

export interface SeedLabSet {
  trackCode: string;
  // Exam outline(s) the labs are aligned to, with checked / re-check dates
  // (REQ-142, seed/sources.ts). The database keeps the URLs only.
  sources: SourceRef[];
  labs: SeedLab[];
}

export const part = (label: string, criteria: string, modelAnswer: string): SeedLabPart => ({ label, criteria, modelAnswer });

export const CLINICAL_SAFETY =
  "Fictional practice case for the exam, not clinical guidance. In real care follow your facility's protocols and your licensed scope, and never enter real patient details here.";
export const FITNESS_SAFETY =
  "Fictional client for exam practice, not exercise, nutrition or medical advice. Don't use it to program for a real person; screen and refer as your certification requires.";
export const GENERAL_SAFETY = "Fictional organisation for exam practice. Never paste real credentials, keys or company data.";
