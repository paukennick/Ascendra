import { ok, badRequest, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { callClaudeJSON, getFastModel } from "@/lib/anthropic";
import { gradeFreeResponsePrompt, type GradeResult } from "@/lib/prompts";
import {
  findClientAttempt,
  isDuplicateClientAttempt,
  recordAttemptAndUpdateMastery,
} from "@/lib/grading-service";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForObjective, coachContextForUnit } from "@/lib/coach-context";

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

    // REQ-089: an id the app already submitted is a retry (dropped
    // connection, double tap, resumed lesson) -- hand back the stored result
    // rather than grading again, recording a second attempt and moving
    // mastery twice. Checked before the rate limit and the Anthropic call.
    const clientAttemptId = validClientAttemptId(body.clientAttemptId);
    if (clientAttemptId) {
      const prior = await findClientAttempt(authUser.id, clientAttemptId);
      if (prior) return ok(prior);
    }
    // Two requests with the same id can still race past that check; the
    // unique index makes the slower one fail, and it returns the winner's.
    const record = async (input: Parameters<typeof recordAttemptAndUpdateMastery>[0]) => {
      try {
        return { attempt: await recordAttemptAndUpdateMastery({ ...input, clientAttemptId }), prior: null };
      } catch (err) {
        if (clientAttemptId && isDuplicateClientAttempt(err)) {
          const prior = await findClientAttempt(authUser.id, clientAttemptId);
          if (prior) return { attempt: null, prior };
        }
        throw err;
      }
    };

    if (format === "mc") {
      const { chosenIndex, correctIndex, chosenText, why } = body;
      if (typeof chosenIndex !== "number" || typeof correctIndex !== "number") {
        return badRequest("chosenIndex and correctIndex are required for format 'mc'");
      }
      const correct = chosenIndex === correctIndex;
      const verdict = correct ? "correct" : "incorrect";
      const feedback = `${correct ? "That's right." : "Not quite."} ${why ?? ""}`.trim();
      const { attempt, prior } = await record({
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
      if (prior) return ok(prior);
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
      const { attempt, prior } = await record({
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
      if (prior) return ok(prior);
      return ok({ ...graded, attempt });
    }

    return badRequest("format must be 'mc' or 'open' (use /api/pbq for PBQ grading)");
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
