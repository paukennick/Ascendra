import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { billingSummary } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// GET /api/billing/me -- REQ-122: this learner's plan, free course and
// allowances (counts and when each refills, never dollars). With the switch
// off: { enabled: false, tier: "pro" } and no database read.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return ok(await billingSummary(user.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
