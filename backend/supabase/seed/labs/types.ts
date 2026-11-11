// REQ-123: authored lab content for the seed (migration 050 `labs`).
import type { SourceRef } from "../sources";
import type { CommandSpec, InteractiveSpec, MatchSpec, NumericSpec, SelectSpec } from "../../../lib/lab-interactive";
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
  // REQ-189: answered with a control and graded by rule, no model call
  // (lib/lab-interactive.ts; docs/labs.md "Interactive parts").
  interactive?: InteractiveSpec;
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
  // REQ-142: what the lab's own clinical or fitness values rest on (a
  // guideline, a consensus statement, the certifying body's own material),
  // on top of the set's exam outline. Stored with the set's URLs in
  // labs.sources; the dates stay here for npm run currency:report.
  sources?: SourceRef[];
  // REQ-142: for a clinical or fitness lab that cites no such source, why
  // (it quotes no threshold or dose, or the source could not be verified).
  // lib/labs.test.ts requires one or the other on every NCLEX, CCRN and NASM
  // lab, so a new lab cannot quote a value without deciding where it comes from.
  noValueSource?: string;
}

export interface SeedLabSet {
  trackCode: string;
  // Exam outline(s) the labs are aligned to, with checked / re-check dates
  // (REQ-142, seed/sources.ts). The database keeps the URLs only.
  sources: SourceRef[];
  labs: SeedLab[];
}

export const part = (label: string, criteria: string, modelAnswer: string): SeedLabPart => ({ label, criteria, modelAnswer });

// REQ-189: interactive parts. `criteria` says what earns met and partly
// there (the rule in lib/lab-interactive.ts); `modelAnswer` explains the key
// and is shown after grading.
export const orderPart = (label: string, criteria: string, modelAnswer: string, items: string[]): SeedLabPart => ({
  label,
  criteria,
  modelAnswer,
  interactive: { type: "order", items },
});
export const matchPart = (label: string, criteria: string, modelAnswer: string, m: Omit<MatchSpec, "type">): SeedLabPart => ({
  label,
  criteria,
  modelAnswer,
  interactive: { type: "match", ...m },
});
export const selectPart = (label: string, criteria: string, modelAnswer: string, s: Omit<SelectSpec, "type">): SeedLabPart => ({
  label,
  criteria,
  modelAnswer,
  interactive: { type: "select", ...s },
});
export const commandPart = (label: string, criteria: string, modelAnswer: string, c: Omit<CommandSpec, "type">): SeedLabPart => ({
  label,
  criteria,
  modelAnswer,
  interactive: { type: "command", ...c },
});
export const numericPart = (label: string, criteria: string, modelAnswer: string, n: Omit<NumericSpec, "type">): SeedLabPart => ({
  label,
  criteria,
  modelAnswer,
  interactive: { type: "numeric", ...n },
});

export const CLINICAL_SAFETY =
  "Fictional practice case for the exam, not clinical guidance. In real care follow your facility's protocols and your licensed scope, and never enter real patient details here.";
export const FITNESS_SAFETY =
  "Fictional client for exam practice, not exercise, nutrition or medical advice. Don't use it to program for a real person; screen and refer as your certification requires.";
export const GENERAL_SAFETY = "Fictional organization for exam practice. Never paste real credentials, keys or company data.";
