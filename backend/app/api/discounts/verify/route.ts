import { ok, badRequest, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { startVerification } from "@/lib/verified-discounts";

export const dynamic = "force-dynamic";

// POST /api/discounts/verify { group, client: "app" | "web" } -- REQ-166:
// the verification provider's sign-in URL for the group. The provider's
// callback route records the result and returns the learner to the app or
// web discount page. 404 while the feature is off.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req);
    if (typeof body?.group !== "string") return badRequest("group is required");
    try {
      await consumeRateLimit("discount_verify", user.id, { max: 10, windowMinutes: 60 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("That's a lot of tries. Please wait an hour and try again.");
      throw err;
    }
    return ok(startVerification(user.id, body.group, body.client));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
