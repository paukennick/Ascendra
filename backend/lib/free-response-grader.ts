import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { gradeFreeResponsePrompt, gradeResultSchema, type GradeResult } from "@/lib/prompts";
import type { CoachContext } from "@/lib/coach-context";
import type { AiPurpose } from "@/lib/ai-calls";

// The one place a free-response answer is sent to the model for grading.
// Used by POST /api/grade and by the offline grading eval
// (scripts/eval/grading.ts), so the eval measures exactly what production runs.
//
// Fast model, effort "high" (grading is where a wrong verdict costs the
// learner most), thinking off. Structured output: the API guarantees verdict
// is one of correct|partial|incorrect and that missedParts exists.
export async function gradeFreeResponse(params: {
  taughtText: string;
  question: string;
  answer: string;
  answerKey?: string;
  ctx?: CoachContext;
  userId?: string;
  // Only the eval overrides these.
  model?: string;
  purpose?: AiPurpose;
}): Promise<GradeResult> {
  const { system, user } = gradeFreeResponsePrompt({
    taughtText: params.taughtText,
    question: params.question,
    answer: params.answer,
    answerKey: params.answerKey,
    ctx: params.ctx,
  });
  return callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: gradeResultSchema,
    maxTokens: 800,
    model: params.model ?? getFastModel(),
    effort: "high",
    thinking: "off",
    purpose: params.purpose ?? "grade_open",
    userId: params.userId,
  });
}
