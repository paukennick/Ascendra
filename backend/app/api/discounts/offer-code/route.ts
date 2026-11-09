import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { issueAppStoreCode } from "@/lib/verified-discounts";

export const dynamic = "force-dynamic";

// POST /api/discounts/offer-code { planId } -- REQ-166: an App Store one-time
// offer code for the plan, for a learner with a live verification. Asking
// again answers the same unexpired code. 404 while the feature is off, 403
// without a verification, 409 when the pool for that plan is empty.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req);
    if (typeof body?.planId !== "string") return badRequest("planId is required");
    try {
      await consumeRateLimit("discount_offer_code", user.id, { max: 20, windowMinutes: 60 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("Please wait a little and try again.");
      throw err;
    }
    return ok(await issueAppStoreCode(user.id, body.planId));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
