import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { gradeFreeResponsePrompt } from "@/lib/prompts";
import {
  gradeWithMisconceptionSchema,
  MISCONCEPTION_INSTRUCTION,
  type GradeWithMisconception,
} from "@/lib/understanding-prompts";
import type { CoachContext } from "@/lib/coach-context";
import type { AiPurpose } from "@/lib/ai-calls";
import { reconciled, trivialAnswer, trivialGrade } from "@/lib/grade-consistency";

// The one place a free-response answer is sent to the model for grading.
// Used by POST /api/grade and by the offline grading eval
// (scripts/eval/grading.ts), so the eval measures exactly what production runs.
//
// Fast model, effort "high" (grading is where a wrong verdict costs the
// learner most), thinking off. Structured output: the API guarantees verdict
// is one of correct|partial|incorrect and that missedParts exists.
//
// REQ-111: the same call also names a misconception, if any, and the concept
// it was mixed up with (misconception / confusedWith; empty strings when
// none). No extra model call: two short fields on the one grading answer.
export async function gradeFreeResponse(params: {
  taughtText: string;
  question: string;
  answer: string;
  answerKey?: string;
  ctx?: CoachContext;
  userId: string | null;
  // Only the eval overrides these.
  model?: string;
  purpose?: AiPurpose;
}): Promise<GradeWithMisconception> {
  // Audit 3 M1: a trivial answer ("." / one word that isn't the key / "idk" /
  // the question restated) is incorrect without a model call; a verdict the
  // grader's own missedParts contradict is downgraded.
  const trivial = trivialAnswer(params.answer, { question: params.question, answerKey: params.answerKey });
  if (trivial) {
    const { trivial: _reason, ...g } = trivialGrade(trivial);
    return { ...g, modelAnswer: g.modelAnswer ?? "", fixNext: g.fixNext ?? "", misconception: "", confusedWith: "" };
  }
  const { system, user } = gradeFreeResponsePrompt({
    taughtText: params.taughtText,
    question: params.question,
    answer: params.answer,
    answerKey: params.answerKey,
    ctx: params.ctx,
  });
  const graded = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: `${user}\n${MISCONCEPTION_INSTRUCTION}` }],
    schema: gradeWithMisconceptionSchema,
    // REQ-105: +200 headroom for modelAnswer and fixNext; REQ-111: +200 for
    // misconception / confusedWith. max_tokens is a ceiling, not a cost.
    maxTokens: 1200,
    model: params.model ?? getFastModel(),
    effort: "high",
    thinking: "off",
    purpose: params.purpose ?? "grade_open",
    userId: params.userId,
  });
  return reconciled(graded, { missedParts: graded.missedParts });
}
