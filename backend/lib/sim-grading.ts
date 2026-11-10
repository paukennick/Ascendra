import { gradeLabStep, claudeLabStepModel, type LabRubricPart, type LabSafetyFamily, type LabStepGraded, type LabStepModel } from "@/lib/lab-grading";
import type { CoachContext } from "@/lib/coach-context";

// REQ-190 (docs/sims.md 10): grading one written-reasoning moment of a sim.
// It reuses the lab per-part grader unchanged: the moment's parts are the
// rubric (server-only), the learner's one answer is fenced and escaped, the
// trivial-answer rule skips the model, and the consistency rule applies.
// The grader judges against what the learner could see: the brief and a
// deterministic situation summary built by the engine at the moment's tick
// (lib/sim/server-run.ts situationSummary), never by the model.
//
// The learner writes one answer per moment (the app never receives the part
// labels), so the same text is graded against every part.

export interface SimReasoningInput {
  simTitle: string;
  brief: string;
  situation: string;
  question: string;
  parts: LabRubricPart[];
  answer: string;
  family: LabSafetyFamily;
  ctx?: CoachContext;
  userId?: string;
}

// The model is called at most this many times for one submission; after
// that the moment is recorded as a grader failure, which is left out of the
// process score and named in the debrief (9.1, 10).
export const SIM_GRADE_TRIES = 3;

export async function gradeSimReasoning(
  input: SimReasoningInput,
  model: LabStepModel = claudeLabStepModel
): Promise<{ graded: LabStepGraded | null; failed: boolean }> {
  const params = {
    labTitle: input.simTitle,
    brief: input.brief,
    priorSteps: [],
    step: { text: input.situation, ask: input.question },
    stepIndex: 0,
    stepCount: 1,
    parts: input.parts,
    answers: input.parts.map(() => input.answer),
    family: input.family,
    ctx: input.ctx,
    userId: input.userId,
  };
  let lastErr: unknown = null;
  for (let i = 0; i < SIM_GRADE_TRIES; i++) {
    try {
      return { graded: await gradeLabStep(params, model), failed: false };
    } catch (err) {
      lastErr = err;
    }
  }
  void lastErr;
  return { graded: null, failed: true };
}

export function modelAnswerOf(parts: LabRubricPart[]): string {
  return parts.map((p) => `${p.label}: ${p.modelAnswer}`).join("\n");
}
