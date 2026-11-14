import { ok, badRequest, unauthorized, serverError, readJson, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { chooseTeachOrder, getTeachOrder, isTeachOrder, TEACH_ORDERS } from "@/lib/teach-order";

export const dynamic = "force-dynamic";

// REQ-262 (migration 082): the learner's lesson order, "Explain first" or
// "Example first". Signed-in only; always the caller's own row (no id in the
// request). No model call. Unauthenticated: 401 and nothing else.

// GET /api/account/teach-order -> { order, source, testOn }
//   order   what the lessons use now
//   source  "assigned" (the random assignment), "chosen" (the learner picked
//           it in Settings) or "default" (the test is off and nothing chosen)
//   testOn  whether new learners are being randomly assigned
// A learner asked for the first time is assigned an order here (stored once).
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return ok(await getTeachOrder(user.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PUT /api/account/teach-order { order } -> { order, source: "chosen", testOn }
// The learner's own choice from Settings; recorded as a choice even when it
// is the order they were assigned.
export async function PUT(req: Request) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req);
    try {
      await consumeRateLimit("teach_order_save", user.id, { max: 30, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    const order = body && typeof body === "object" ? (body as Record<string, unknown>).order : undefined;
    if (!isTeachOrder(order)) return badRequest(`order must be one of ${TEACH_ORDERS.join(", ")}`);
    return ok(await chooseTeachOrder(user.id, order));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
