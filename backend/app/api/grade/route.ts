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

export const dynamic = "force-dynamic";

// POST /api/grade — grades one lesson/quiz/unit-check answer (MC or free-response) and
// records the attempt + mastery update + (if not correct) an error-log entry with the
// first spaced-review date. PBQ grading has its own route (see /api/pbq) since it needs
// a scenario + multiple named sub-parts.
//
// Body for format "mc" (graded locally — no Anthropic call needed, the correct index
// is already known from the cached lesson content):
//   { format: "mc", kind, stage?, objectiveId?, unitId?, question, chosenIndex, correctIndex,
//     chosenText, why?, confidence? }
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
      const { chosenIndex, correctIndex, chosenText, why } = body;
      if (typeof chosenIndex !== "number" || typeof correctIndex !== "number") {
        return badRequest("chosenIndex and correctIndex are required for format 'mc'");
      }
      const correct = chosenIndex === correctIndex;
      const verdict = correct ? "correct" : "incorrect";
      const feedback = `${correct ? "That's right." : "Not quite."} ${why ?? ""}`.trim();
      const attempt = await recordAttemptAndUpdateMastery({
        userId: authUser.id,
        unitId,
        objectiveId,
        kind,
        stage,
        format: "mc",
        question,
        answer: chosenText ?? String(chosenIndex),
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
      const { system, user } = gradeFreeResponsePrompt({ taughtText, question, answer });
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
