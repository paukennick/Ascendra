import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { visibleTrack } from "@/lib/visibility";
import { nextQuizTurn } from "@/lib/coach-quiz";
import { requireFeature } from "@/lib/entitlements";

// REQ-202: seconds this route may run (one fast-model question). Never above 300, the Hobby
// plan ceiling with Fluid compute (docs/billing.md, "Function duration").
export const maxDuration = 120;

export const dynamic = "force-dynamic";

// REQ-110: limit on NEW quiz questions written by the model per learner. Reused
// questions and answering are free and not counted.
const QUIZ_GENERATE_EVENT = "coach_quiz_generate";
const QUIZ_GENERATE_LIMIT = { max: 20, windowMinutes: 60 };

// POST /api/coach/quiz  { trackId } -- "Quiz me on my weak spots": the
// learner's open quiz question in this course, or a new one on one of their
// weakest objectives. { turn: null, reason: "no_weak_spots" } when there is no
// graded evidence to pick from yet.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const trackId = body?.trackId;
    if (!trackId || typeof trackId !== "string") return badRequest("trackId is required");
    const user = await requireUser(req);
    const track = await visibleTrack(trackId, user.id);
    if (!track) return notFound("Track not found");
    await requireAcknowledgementForTrack(trackId, user.id);
    await requireFeature(user.id, "quiz_me", track.id); // REQ-122, REQ-170

    const result = await nextQuizTurn(user.id, trackId, {
      beforeGenerate: async () => {
        // REQ-135 / FAIL-230: atomic count-and-record.
        await consumeRateLimit(QUIZ_GENERATE_EVENT, user.id, QUIZ_GENERATE_LIMIT, { userId: user.id });
      },
    });
    if (result.status === "no_weak_spots") return ok({ turn: null, reason: "no_weak_spots" });
    return ok({ turn: result.turn });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    if (err instanceof RateLimitError) return tooManyRequests("That's a lot of new questions for one hour. Take a breather and try again soon.");
    return serverError(err);
  }
}
