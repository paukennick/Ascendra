import { ok, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { billingEnabled } from "@/lib/billing-config";
import { stripeCustomerFor } from "@/lib/billing-webhooks";
import { createPortalSession } from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";

// POST /api/billing/portal -- REQ-122: Stripe's billing portal for a learner
// who subscribed on the web (cancel, change card, invoices). Store
// subscriptions are managed in the App Store / Google Play instead (the app
// links there).
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!billingEnabled()) return notFound("Paid plans aren't available yet.");
    const customer = await stripeCustomerFor(user.id);
    if (!customer) return notFound("There's no web subscription on this account.");
    return ok(await createPortalSession(customer));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
