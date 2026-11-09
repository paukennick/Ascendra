import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { discountStatus } from "@/lib/verified-discounts";

export const dynamic = "force-dynamic";

// GET /api/discounts -- REQ-166: the verified group discounts on offer, what
// is checked and stored, this learner's verifications and the discount they
// get. While the feature is off (billing off, VERIFIED_DISCOUNTS_ENABLED
// off, no provider configured, or no group with a published percentage):
// { available: false } and no database read.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return ok(await discountStatus(user.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
