import { ok, badRequest, notFound, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isUuid } from "@/lib/visibility";
import { FEEDBACK_LIMIT, parseFeedbackInput } from "@/lib/reviewers-config";
import { getOwnFeedback, requireReviewer, updateFeedback } from "@/lib/reviewers";

export const dynamic = "force-dynamic";

// REQ-331: one of the reviewer's own submissions. Someone else's id answers
// 404, exactly as an id that doesn't exist.
// GET /api/reviewer/feedback/:id -> { feedback }
// PUT /api/reviewer/feedback/:id { the whole form } -> { feedback }
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    await requireReviewer(user.id);
    if (!isUuid(id)) return notFound("Feedback not found");
    const feedback = await getOwnFeedback(user.id, id.toLowerCase());
    if (!feedback) return notFound("Feedback not found");
    return ok({ feedback });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    await requireReviewer(user.id);
    if (!isUuid(id)) return notFound("Feedback not found");
    const input = parseFeedbackInput(body);
    if (typeof input === "string") return badRequest(input);
    try {
      await consumeRateLimit("reviewer_feedback", user.id, FEEDBACK_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("That's a lot of feedback in an hour. Try again a little later.");
      throw err;
    }
    const feedback = await updateFeedback(user.id, id.toLowerCase(), input);
    if (!feedback) return notFound("Feedback not found");
    return ok({ feedback });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
