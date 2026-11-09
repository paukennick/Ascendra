import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { removeVerifications } from "@/lib/verified-discounts";

export const dynamic = "force-dynamic";

// DELETE /api/discounts/verifications -- REQ-166: the learner removes their
// verification results. Always allowed (it is their data), feature on or
// off. A discount already applied to a subscription stays for the period
// the store or Stripe already granted it.
export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    return ok({ removed: await removeVerifications(user.id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
