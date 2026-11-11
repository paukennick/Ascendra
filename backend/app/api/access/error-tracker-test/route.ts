import { ok, unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { requireOwner } from "@/lib/account-access";
import { sendTestErrorReport } from "@/lib/error-tracker";

export const dynamic = "force-dynamic";

// REQ-211: owner only (OWNER_EMAILS, verified), from Settings > Access.
// POST /api/access/error-tracker-test -> { configured, delivered, status }
//   configured: ERROR_TRACKER_DSN is set and parses as a Sentry DSN.
//   delivered:  Sentry answered 2xx to one labelled test event.
// Five a day, so the button can't be used to flood the error tracker.
const ERROR_TEST_LIMIT = { max: 5, windowMinutes: 24 * 60 };

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await requireOwner(user.id);
    try {
      await consumeRateLimit("error_tracker_test", user.id, ERROR_TEST_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("That's five test errors today. Try again tomorrow.");
      throw err;
    }
    return ok(await sendTestErrorReport({ route: "/api/access/error-tracker-test" }));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
