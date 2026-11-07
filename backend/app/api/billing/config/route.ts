import { ok, serverError } from "@/lib/http";
import { publicConfig } from "@/lib/billing-config";

export const dynamic = "force-dynamic";

// GET /api/billing/config -- REQ-122. Public (no sign-in): whether paid
// plans are on, the tiers and what each includes, the allowances, the plans
// with their store product ids and US list prices. The app reads this at
// run time, so turning BILLING_ENABLED on needs no app update once a build
// with the plans screen is installed. REQ-124: while the switch is off the
// answer is only { enabled: false } -- no tiers, prices or product ids before
// launch; operators use `npm run billing:config` -- and the app shows no
// plan, price or upgrade prompt anywhere.
export async function GET() {
  try {
    return ok(publicConfig());
  } catch (err) {
    return serverError(err);
  }
}
