import { ok, badRequest, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { callClaudeJSON, getFastModel } from "@/lib/anthropic";
import { gradeFreeResponsePrompt, type GradeResult } from "@/lib/prompts";
import { recordAttemptAndUpdateMastery } from "@/lib/grading-service";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForObjective, coachContextForUnit } from "@/lib/coach-context";
import { queryOne } from "@/lib/db";
import { gradeChoice, type StoredChoices } from "@/lib/lesson-choices";

export const dynamic = "force-dynamic";

// POST /api/grade — grades one lesson/quiz/unit-check answer (MC or free-response) and
// records the attempt + mastery update + (if not correct) an error-log entry with the
// first spaced-review date. PBQ grading has its own route (see /api/pbq) since it needs
// a scenario + multiple named sub-parts.
//
// Body for format "mc" (graded locally — no Anthropic call needed):
//   { format: "mc", kind, stage: "fade" | "solo", objectiveId, unitId?, question, chosenText,
//     confidence? }
// REQ-089: the right answer is looked up in the cached lesson, never taken
// from the request, and the pick is matched by its text because choices are
// shuffled on every serve. Older app builds still send chosenIndex /
// correctIndex / why; those fields are ignored.
//
// Body for format "open" (graded by Claude):
//   { format: "open", kind, stage?, objectiveId?, unitId?, question, answer, taughtText, confidence? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { format, kind, stage, objectiveId, unitId, question, confidence } = body ?? {};

    if (!format || !kind || !question) {
      return badRequest("format, kind, and question are required");
    }

    const authUser = await requireUser(req);
    if (objectiveId) await requireAcknowledgementForObjective(objectiveId, authUser.id);

    if (format === "mc") {
      const { chosenText } = body;
      if (!objectiveId || (stage !== "fade" && stage !== "solo") || typeof chosenText !== "string") {
        return badRequest("objectiveId, stage ('fade' or 'solo') and chosenText are required for format 'mc'");
      }
      const p = stage === "fade" ? "fade" : "solo";
      const row = await queryOne<{ choices: string[]; correct_index: number; why: string; feedback: string[] | null }>(
        `select ${p}_choices as choices, ${p}_correct_index as correct_index, ${p}_why as why,
                ${p}_choice_feedback as feedback
         from lesson_content where objective_id = $1`,
        [objectiveId]
      );
      if (!row) return badRequest("No lesson is cached for this objective");
      const stored: StoredChoices = {
        choices: row.choices,
        correctIndex: row.correct_index,
        why: row.why,
        choiceFeedback: row.feedback,
      };
      const graded = gradeChoice(stored, chosenText);
      // The lesson was regenerated after the learner loaded it: their choices
      // no longer exist, so there is nothing fair to grade.
      if (!graded) return badRequest("This lesson has changed since it was loaded. Reload it and try again.");
      const verdict = graded.correct ? "correct" : "incorrect";
      const feedback = graded.feedback;
      const attempt = await recordAttemptAndUpdateMastery({
        userId: authUser.id,
        unitId,
        objectiveId,
        kind,
        stage,
        format: "mc",
        question,
        answer: chosenText,
        verdict,
        feedback,
        classification: "none",
        confidence,
      });
      return ok({ verdict, feedback, classification: "none", missedParts: [], attempt });
    }

    if (format === "open") {
      const { answer, taughtText } = body;
      if (!answer || !taughtText) {
        return badRequest("answer and taughtText are required for format 'open'");
      }
      try {
        await checkRateLimit("grade_open", authUser.id, { max: 40, windowMinutes: 10 });
      } catch (err) {
        if (err instanceof RateLimitError) return tooManyRequests(err.message);
        throw err;
      }
      await recordAuthEvent("grade_open", authUser.id);
      // REQ-076: grade in the voice of the learner's actual track/exam.
      const ctx = objectiveId
        ? await coachContextForObjective(objectiveId)
        : unitId
          ? await coachContextForUnit(unitId)
          : null;
      const { system, user } = gradeFreeResponsePrompt({
        taughtText,
        question,
        answer,
        ctx: ctx ?? undefined,
      });
      const graded = await callClaudeJSON<GradeResult>({
        system,
        messages: [{ role: "user", content: user }],
        maxTokens: 800,
        model: getFastModel(),
      });
      const attempt = await recordAttemptAndUpdateMastery({
        userId: authUser.id,
        unitId,
        objectiveId,
        kind,
        stage,
        format: "open",
        question,
        answer,
        verdict: graded.verdict,
        feedback: graded.feedback,
        classification: graded.classification,
        missedParts: graded.missedParts ?? [],
        confidence,
      });
      return ok({ ...graded, attempt });
    }

    return badRequest("format must be 'mc' or 'open' (use /api/pbq for PBQ grading)");
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
