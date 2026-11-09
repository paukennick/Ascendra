import { ok, notFound, unauthorized, serverError, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { foundingConfig } from "@/lib/billing-config";
import { holdSeat } from "@/lib/founding";

export const dynamic = "force-dynamic";

// POST /api/billing/founding -- REQ-170: hold a founding-member seat just
// before the app buys the founding Google Play offer (the web holds it in
// /api/billing/checkout). { percent } when held, { percent: null } when the
// seats are gone. 404 while the offer (or paid plans) is off. The first paid
// subscription event confirms the seat; an unpaid hold lapses after
// FOUNDING_MEMBERS_HOLD_HOURS.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!foundingConfig().enabled) return notFound("The founding-member offer isn't available.");
    try {
      await consumeRateLimit("founding_hold", user.id, { max: 10, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    return ok({ percent: await holdSeat(user.id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
