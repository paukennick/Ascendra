import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { applyStripeEvent, verifyStripeSignature } from "@/lib/billing-webhooks";

export const dynamic = "force-dynamic";

// POST /api/billing/webhooks/stripe -- REQ-122. Verified against the RAW
// body with STRIPE_WEBHOOK_SECRET by Stripe's documented scheme
// (lib/billing-webhooks.ts verifyStripeSignature: HMAC-SHA256 of
// "<t>.<body>", 5-minute tolerance, constant-time compare). The body is read
// once as text and parsed only after it verifies. 200 for applied, duplicate,
// stale and ignored events; 400 for a bad signature; 503 when not configured.
export async function POST(req: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
    const raw = await req.text();
    const v = verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret);
    if (!v.ok) return NextResponse.json({ error: `Invalid signature: ${v.reason}` }, { status: 400 });
    let event: any;
    try {
      event = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }
    if (!event || typeof event.id !== "string" || typeof event.type !== "string" || !event.data?.object) {
      return NextResponse.json({ error: "Missing event" }, { status: 400 });
    }
    const r = await applyStripeEvent(event);
    return NextResponse.json({ received: true, outcome: r.outcome });
  } catch (err) {
    return serverError(err);
  }
}
