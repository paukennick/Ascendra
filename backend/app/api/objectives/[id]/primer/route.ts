import { requireSharedLessonRoom } from "@/lib/ai-access";
import { ok, notFound, unauthorized, forbidden, tooManyRequests, serverError, UserFacingError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { taughtObjective } from "@/lib/visibility";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { requireCourseAccessForObjective } from "@/lib/entitlements";
import { getModel } from "@/lib/anthropic";
import { modelFactChecker } from "@/lib/fact-check";
import { loadObjective, pendingGeneration, pendingKey } from "@/lib/lesson-generation";
import { getOverrideLesson, getServableSharedLesson, SHARED } from "@/lib/lesson-store";
import { ensurePrimer, fromStoredTerms, LESSON_NOT_READY, PRIMER_LIMIT, PRIMER_RATE_EVENT, PRIMER_RATE_MESSAGE, modelPrimerWriter, overrideMismatch, primerForClient, primerSourceOf } from "@/lib/primers";

// REQ-253: one write of a primer is two model calls at most (writer + fact-check)
// and one steered retry of both: about 40 s at worst. Never above 300 (Hobby).
export const maxDuration = 120;

export const dynamic = "force-dynamic";

// GET /api/objectives/:id/primer -- the lesson's Key terms, shared by every
// learner. Written on first use from the shared lesson (and again when that
// lesson has changed since: its hash differs), checked (lib/primers.ts), stored
// and returned. Access is the lesson route's: signed in, the objective visible
// to the caller and still taught (404 otherwise), the study notice and the 18+
// confirmation where the course needs them (403 with a code), and the Free
// one-course rule. A primer is shared content, so writing one does not use the
// learner's plan allowance; its model calls are charged to the learner's daily
// AI budget (REQ-202), it waits at the global AI ceiling (429 "being
// prepared") and starting one is rate limited.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    // FAIL-889 / REQ-204: visible AND still taught; the canonical id from here on.
    const objective = await taughtObjective(id, user.id);
    if (!objective) return notFound("Objective not found");
    const objectiveId = objective.id;
    await requireAcknowledgementForObjective(objectiveId, user.id);
    await requireCourseAccessForObjective(user.id, objectiveId);

    // The shared lesson the primer is written from. A first generation still
    // running in this process (the learner opened Key terms during Teach)
    // is waited for.
    let lesson = await getServableSharedLesson(objectiveId);
    if (!lesson) {
      const inFlight = pendingGeneration.get(pendingKey(objectiveId, SHARED));
      if (inFlight) lesson = await inFlight.fullPromise.catch(() => null);
    }
    if (!lesson) throw new UserFacingError(LESSON_NOT_READY, 409, { code: "lesson_not_ready", retryable: true });

    const obj = await loadObjective(objectiveId);
    if (!obj) return notFound("Objective not found");

    const { row, cached } = await ensurePrimer(objectiveId, obj, lesson, {
      userId: user.id,
      deps: {
        write: modelPrimerWriter({ userId: user.id, purpose: "primer" }),
        factCheck: modelFactChecker,
        model: getModel(),
        userId: user.id,
      },
      currentLesson: () => getServableSharedLesson(objectiveId),
      beforeGenerate: async () => {
        // REQ-201: at the global daily AI ceiling a new primer waits for the next day.
        await requireSharedLessonRoom(user.id);
        try {
          await consumeRateLimit(PRIMER_RATE_EVENT, user.id, PRIMER_LIMIT, { userId: user.id });
        } catch (err) {
          if (err instanceof RateLimitError) {
            throw new UserFacingError(PRIMER_RATE_MESSAGE, 429);
          }
          throw err;
        }
      },
    });

    // A learner's own regenerated lesson keeps the shared primer; the terms it
    // does not use are logged as a count, never blocking.
    const override = await getOverrideLesson(user.id, objectiveId).catch(() => null);
    if (override) {
      const missing = overrideMismatch(fromStoredTerms(row.terms), primerSourceOf(override));
      // eslint-disable-next-line no-console
      if (missing) console.warn(`[primers] ${objectiveId}: ${missing} key term(s) not in this learner's regenerated lesson`);
    }

    return ok({ primer: primerForClient(row), cached });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
    if (err instanceof RateLimitError) return tooManyRequests(err.message);
    return serverError(err);
  }
}
