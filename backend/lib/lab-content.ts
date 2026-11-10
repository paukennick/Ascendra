import { createHash } from "node:crypto";
import { hasUnstorableText } from "./text-input";
import { interactiveProblems, type InteractiveSpec } from "./lab-interactive";

// REQ-123: the content rules for a lab, with no database or model imports,
// so the seed (supabase/seed/seed-lib.ts), the seed test and the generator
// share exactly one definition. lib/labs.ts re-exports them.

export interface LabRubricPartContent {
  label: string;
  criteria: string;
  modelAnswer: string;
  // REQ-189: answered with a control and graded by rule (lib/lab-interactive.ts).
  // The criteria say what earns met / partly there; the model answer is
  // shown after grading, as for a written part.
  interactive?: InteractiveSpec;
}

export type LabKind = "build" | "case";
export type ReviewStatus = "needs_expert_review" | "approved" | "rejected";

export interface LabContent {
  kind: LabKind;
  title: string;
  brief: string;
  steps: { text: string; ask: string }[];
  rubric: { parts: LabRubricPartContent[] }[];
  safetyNote?: string | null;
}

// ---------------------------------------------------------------------------
// Content rules (pure): used by the seed test, the seed and the generator.
// ---------------------------------------------------------------------------

export const LAB_LIMITS = {
  title: 200,
  brief: 6000,
  stepText: 3000,
  ask: 600,
  label: 120,
  criteria: 1200,
  modelAnswer: 2500,
  partsPerStep: { min: 1, max: 5 },
} as const;

export function labContentProblems(lab: LabContent): string[] {
  const p: string[] = [];
  const str = (v: unknown, name: string, max: number, min = 1) => {
    if (typeof v !== "string" || v.trim().length < min) p.push(`${name} is missing`);
    else if (v.length > max) p.push(`${name} is longer than ${max}`);
    else if (hasUnstorableText(v)) p.push(`${name} has characters that can't be stored`);
  };
  if (lab.kind !== "build" && lab.kind !== "case") p.push("kind must be build or case");
  str(lab.title, "title", LAB_LIMITS.title, 4);
  str(lab.brief, "brief", LAB_LIMITS.brief, 20);
  if (!Array.isArray(lab.steps) || !Array.isArray(lab.rubric)) return [...p, "steps and rubric must be lists"];
  if (lab.kind === "build" && lab.steps.length !== 1) p.push("a build lab has exactly one step");
  if (lab.kind === "case" && (lab.steps.length < 2 || lab.steps.length > 4)) p.push("a case lab has 2-4 steps");
  if (lab.rubric.length !== lab.steps.length) p.push("the rubric needs one entry per step");
  lab.steps.forEach((s, i) => {
    str(s?.text, `step ${i + 1} text`, LAB_LIMITS.stepText, lab.kind === "build" ? 0 : 10);
    str(s?.ask, `step ${i + 1} ask`, LAB_LIMITS.ask, 8);
    const parts = lab.rubric[i]?.parts;
    if (!Array.isArray(parts) || parts.length < LAB_LIMITS.partsPerStep.min || parts.length > LAB_LIMITS.partsPerStep.max) {
      p.push(`step ${i + 1} needs ${LAB_LIMITS.partsPerStep.min}-${LAB_LIMITS.partsPerStep.max} rubric parts`);
      return;
    }
    const labels = new Set<string>();
    parts.forEach((part, j) => {
      str(part?.label, `step ${i + 1} part ${j + 1} label`, LAB_LIMITS.label, 2);
      str(part?.criteria, `step ${i + 1} part ${j + 1} criteria`, LAB_LIMITS.criteria, 10);
      str(part?.modelAnswer, `step ${i + 1} part ${j + 1} model answer`, LAB_LIMITS.modelAnswer, 10);
      if (part?.interactive !== undefined) {
        p.push(...interactiveProblems(part.interactive, typeof part.modelAnswer === "string" ? part.modelAnswer : "", `step ${i + 1} part ${j + 1}`));
      }
      const key = (part?.label ?? "").trim().toLowerCase();
      if (labels.has(key)) p.push(`step ${i + 1} has two parts labelled "${part.label}"`);
      labels.add(key);
    });
  });
  if (lab.safetyNote != null) str(lab.safetyNote, "safety note", 600);
  return p;
}

// Hash of everything a learner sees or is graded against. A change sends an
// approved lab back for review.
export function labContentHash(lab: LabContent): string {
  const canon = JSON.stringify([lab.kind, lab.title, lab.brief, lab.steps, lab.rubric, lab.safetyNote ?? null]);
  return createHash("md5").update(canon, "utf8").digest("hex");
}

