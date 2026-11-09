import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { tooManyRequests } from "@/lib/http";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { createCheckoutSession } from "@/lib/stripe-checkout";
import { stripeCouponForUser } from "@/lib/verified-discounts";
import { requirePlanPrerequisite } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// POST /api/billing/checkout { planId: "it_cloud_plus_monthly" | ..., requestId? } --
// REQ-122: a Stripe Checkout session for the web app. Returns { url } to
// open. 404 while paid plans are off; 503 with a plain message when
// STRIPE_SECRET_KEY or the plan's STRIPE_PRICE_* is not set. Access is given
// by the webhook (customer.subscription.created), never by this route.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req);
    if (typeof body?.planId !== "string") return badRequest("planId is required");
    try {
      await consumeRateLimit("billing_checkout", user.id, { max: 10, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    const requestId = validClientAttemptId(body.requestId);
    // REQ-170: the clinical add-on is sold only beside all-access.
    await requirePlanPrerequisite(user.id, body.planId);
    const { url } = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      planId: body.planId,
      // REQ-166: the learner's verified group discount, if any (null while
      // verified discounts are off -- no table is read then).
      coupon: await stripeCouponForUser(user.id),
      idempotencyKey: requestId ? `checkout:${user.id}:${requestId}` : undefined,
    });
    return ok({ url });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
