import { queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { FEEDBACK_LIMIT, parseFeedbackInput } from "@/lib/reviewers-config";
import { contextTitles, createFeedback, listOwnFeedback, requireReviewer } from "@/lib/reviewers";
import { isUuid } from "@/lib/visibility";

export const dynamic = "force-dynamic";

// REQ-331: the reviewer feedback form. Reviewers (and owners) only; anyone
// else gets 403 with the reviewers-only message.
//
// GET  /api/reviewer/feedback[?trackId=&simId=] -> { feedback (own, newest first),
//      prefill: { name, areas }, context: { trackId, trackTitle, simId, simTitle } }
// POST /api/reviewer/feedback { trackId?, simId?, name?, role?, roleOther?, areas?, tried?,
//                               ratings?, texts?, recommend?, followUp? } -> { feedback }
// The per-item "Report a problem" stays the way to report one lesson or question.
// Nothing here is emailed or sent to the AI model.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const reviewer = await requireReviewer(user.id);
    const me = await queryOne<{ display_name: string | null }>(`select display_name from app_users where id = $1`, [user.id]);
    const areas = reviewer.areas.length
      ? (await queryOne<{ names: string[] }>(
          `select coalesce(array_agg(name order by sort_order), '{}') as names from education_categories where slug = any($1::text[])`,
          [reviewer.areas]
        ))?.names ?? []
      : [];
    const url = new URL(req.url);
    const ctxTrack = url.searchParams.get("trackId");
    const ctxSim = url.searchParams.get("simId");
    const context = await contextTitles(
      user.id,
      isUuid(ctxTrack) ? ctxTrack.toLowerCase() : null,
      isUuid(ctxSim) ? ctxSim.toLowerCase() : null
    );
    return ok({ feedback: await listOwnFeedback(user.id), prefill: { name: me?.display_name?.trim() || null, areas }, context });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req);
    await requireReviewer(user.id);
    const input = parseFeedbackInput(body);
    if (typeof input === "string") return badRequest(input);
    try {
      await consumeRateLimit("reviewer_feedback", user.id, FEEDBACK_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("That's a lot of feedback in an hour. Try again a little later.");
      throw err;
    }
    return ok({ feedback: await createFeedback(user.id, input) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
