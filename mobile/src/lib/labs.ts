// REQ-123: the pure half of the lab screens -- the shapes the server sends,
// how a list is grouped and labelled, per-part result rows, the "not yet"
// wording for a miss, and the on-device draft (one answer per rubric part,
// kept until graded, with the client attempt id of what was already sent so
// a resend after the app was killed is replayed, not graded twice).
// src/lib/labs.test.ts covers it.
import type { InteractiveInput, InteractiveKey } from "./labInteractive.ts";

export type LabKind = "build" | "case";
export type Verdict = "correct" | "partial" | "incorrect";
export type PartScoreValue = "met" | "partial" | "missed";

export interface LabListItem {
  id: string;
  kind: LabKind;
  title: string;
  objectiveId: string;
  objectiveTitle: string;
  unitId: string;
  unitTitle: string;
  stepCount: number;
  reviewStatus: "needs_expert_review" | "approved" | "rejected";
  state: "new" | "in_progress" | "done";
  stepsDone: number;
  runsFinished: number;
  lastVerdict: Verdict | null;
  // REQ-124: "full" (Pro, or plans off), "sample" (the course's one sample
  // lab on Free and Plus) or "locked" (part of Pro). Older servers omit it.
  access?: LabAccess;
}

export type LabAccess = "full" | "sample" | "locked";

export interface LabStepView {
  index: number;
  text: string;
  ask: string;
  parts: string[];
  // REQ-189: lines up with `parts`; null for a written part, else the
  // control to show. Older servers omit it (every part is written).
  inputs?: (InteractiveInput | null)[];
}

export interface LabStepResult {
  index: number;
  verdict: Verdict;
  feedback: string;
  partScores: { part: string; score: PartScoreValue | string; comment: string }[];
  missedParts: string[];
  fixNext: string | null;
  // The answers in words (an interactive part's choices written out).
  answers: string[];
  // REQ-189: the answers exactly as sent, to mark the controls.
  responses?: string[];
  reference: { label: string; criteria: string; modelAnswer: string; key?: InteractiveKey }[];
}

export interface LabFinal {
  verdict: Verdict;
  summary: string;
  assisted: boolean;
  assistReason: string | null;
  attemptId: string | null;
}

export interface LabView {
  lab: {
    id: string;
    kind: LabKind;
    title: string;
    brief: string;
    safetyNote: string | null;
    objectiveId: string;
    objectiveTitle: string;
    unitId: string;
    trackId: string;
    stepCount: number;
    reviewStatus: LabListItem["reviewStatus"];
    access?: LabAccess;
    steps: LabStepView[];
  };
  run: { id: string; status: "open" | "finished"; stepsDone: number; results: LabStepResult[]; final: LabFinal | null } | null;
  runsFinished: number;
}

// REQ-165: the lab disclaimer (REQ-125), its per-family acknowledgement and
// the "Awaiting expert review" line are gone; the study notice
// (src/lib/studyNotice.ts) covers labs. reviewStatus is still sent and kept
// in the types, but never shown.

export interface LabSubmitResult {
  step: LabStepResult;
  nextStep: LabStepView | null;
  final: LabFinal | null;
  replayed: boolean;
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export function groupByUnit(items: LabListItem[]): { unitId: string; unitTitle: string; labs: LabListItem[] }[] {
  const out: { unitId: string; unitTitle: string; labs: LabListItem[] }[] = [];
  for (const it of items) {
    let g = out.find((x) => x.unitId === it.unitId);
    if (!g) {
      g = { unitId: it.unitId, unitTitle: it.unitTitle, labs: [] };
      out.push(g);
    }
    g.labs.push(it);
  }
  return out;
}

export function labCountsByUnit(items: LabListItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[it.unitId] = (out[it.unitId] ?? 0) + 1;
  return out;
}

export const KIND_LABEL: Record<LabKind, string> = {
  build: "Build",
  case: "Case",
};

// The status line under a lab in the list. Never "failed": a miss reads
// as something to come back to.
export function labStateLabel(it: Pick<LabListItem, "state" | "stepsDone" | "stepCount" | "lastVerdict">): string {
  if (it.state === "in_progress") return `In progress: step ${Math.min(it.stepsDone + 1, it.stepCount)} of ${it.stepCount}`;
  if (it.state === "done") {
    if (it.lastVerdict === "correct") return "Done: every part met";
    if (it.lastVerdict === "partial") return "Done: some parts to revisit";
    return "Done: worth another look later";
  }
  return it.stepCount > 1 ? `Not started: ${it.stepCount} steps` : "Not started";
}

// REQ-124: the plan badge on a lab -- the sample is labelled as a sample,
// a lab outside the plan says which plan has it; nothing when every lab is
// open (Pro, or paid plans off).
export function labAccessBadge(access: LabAccess | undefined): string | null {
  if (access === "sample") return "Sample lab";
  if (access === "locked") return "Part of Pro";
  return null;
}

export function labA11yLabel(it: LabListItem): string {
  const plan = it.access === "sample" ? " Your plan's sample lab for this course." : it.access === "locked" ? " Part of the Pro plan." : "";
  return `${KIND_LABEL[it.kind]} lab: ${it.title}. Objective: ${it.objectiveTitle}. ${labStateLabel(it)}.${plan}`;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type PartRowState = "met" | "partial" | "missed" | "unscored";

export interface PartRow {
  label: string;
  state: PartRowState;
  comment: string;
  answer: string;
  modelAnswer: string;
}

// One row per rubric part of a graded step, in the rubric's order. A part
// the server sent no valid score for is "unscored", never shown as met.
export function partRows(result: LabStepResult, labels: string[]): PartRow[] {
  const norm = (s: string) => s.trim().toLowerCase();
  return labels.map((label, i) => {
    const s = result.partScores.find((p) => norm(p.part) === norm(label)) ?? result.partScores[i];
    const valid = !!s && (s.score === "met" || s.score === "partial" || s.score === "missed") && norm(s.part) === norm(label);
    return {
      label,
      state: valid ? (s!.score as PartRowState) : "unscored",
      comment: valid ? s!.comment ?? "" : "",
      answer: result.answers[i] ?? "",
      modelAnswer: result.reference[i]?.modelAnswer ?? "",
    };
  });
}

export const PART_STATE_LABEL: Record<PartRowState, string> = {
  met: "Met",
  partial: "Partly there",
  missed: "Not yet",
  unscored: "Not scored separately",
};

export function partA11yLabel(row: PartRow, index: number): string {
  return `Part ${index + 1}: ${row.label}. ${PART_STATE_LABEL[row.state]}.${row.comment ? ` ${row.comment}` : ""}`;
}

// The headline after a step or a whole lab: mistakes are information.
export function verdictMessage(verdict: Verdict, isFinal: boolean): string {
  if (verdict === "correct") return isFinal ? "Every part met. That is the skill the exam tests." : "Every part met on this step.";
  if (verdict === "partial") return "Some parts are there. The ones marked \"Not yet\" show exactly what to look at next.";
  return "Not yet -- and that's useful to know. Compare with the model answer below; the next attempt will go further.";
}

export function assistNote(final: Pick<LabFinal, "assisted" | "assistReason"> | null): string | null {
  if (!final?.assisted) return null;
  if (final.assistReason === "repeat") {
    return "You've seen this lab's model answers before, so this run is practice: it counts lightly toward mastery. A new lab on this objective counts in full.";
  }
  return "This run counts lightly toward mastery because help was used.";
}

// ---------------------------------------------------------------------------
// Drafts (on device, per user, lab, run and step)
// ---------------------------------------------------------------------------

// Same envelope and key shape as the other typed answers (src/lib/drafts.ts
// answerDraftKey), so the logout sweep removes it (src/lib/localData.ts).
export function labDraftKey(userId: string, labId: string, runId: string, step: number): string {
  return `ascendra.draft.lab.${userId}.${`${labId}_${runId}_${step}`.replace(/\./g, "_")}`;
}

export interface LabDraft {
  parts: string[];
  sentId: string | null;
  sentSig: string | null;
}

export const LAB_PART_MAX = 4000;
// REQ-197: a restored draft part may run over the send limit (dictation) and
// is kept whole for the learner to shorten; canSubmit holds the send back.
export const LAB_PART_KEEP_MAX = 4 * LAB_PART_MAX;

export function labDraftPayload(d: LabDraft): string | null {
  if (!d.parts.some((p) => p.trim()) && !d.sentId) return null;
  return JSON.stringify(d);
}

export function parseLabDraft(payload: string | null, partCount: number): LabDraft | null {
  if (!payload) return null;
  let o: unknown;
  try {
    o = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const stored = r.parts;
  if (!Array.isArray(stored)) return null;
  const parts = Array.from({ length: partCount }, (_, i) => (typeof stored[i] === "string" ? (stored[i] as string).slice(0, LAB_PART_KEEP_MAX) : ""));
  return {
    parts,
    sentId: typeof r.sentId === "string" ? r.sentId : null,
    sentSig: typeof r.sentSig === "string" ? r.sentSig : null,
  };
}

// What identifies one submission: the step and every part, trimmed (the
// server treats surrounding whitespace as the same answer).
export function answersSignature(step: number, parts: string[]): string {
  return JSON.stringify([step, ...parts.map((p) => p.trim())]);
}

export function canSubmit(parts: string[]): boolean {
  return parts.some((p) => p.trim().length > 0) && parts.every((p) => p.length <= LAB_PART_MAX);
}
