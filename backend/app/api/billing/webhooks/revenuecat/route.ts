import { NextResponse } from "next/server";
import { serverError } from "@/lib/http";
import { applyRevenueCatEvent, revenueCatAuthorized } from "@/lib/billing-webhooks";

export const dynamic = "force-dynamic";

// POST /api/billing/webhooks/revenuecat -- REQ-122. RevenueCat sends every
// App Store / Google Play subscription event here with the Authorization
// header value set in its dashboard, which must equal REVENUECAT_WEBHOOK_AUTH
// (compared in constant time). Accepted while BILLING_ENABLED is off too, so
// entitlements are already right on the day the switch is turned on.
// 200 for applied, duplicate, stale and ignored events (RevenueCat retries
// anything else); 401 for a bad header; 503 when not configured.
export async function POST(req: Request) {
  try {
    const secret = process.env.REVENUECAT_WEBHOOK_AUTH?.trim();
    if (!secret) return NextResponse.json({ error: "RevenueCat webhook not configured" }, { status: 503 });
    if (!revenueCatAuthorized(req.headers.get("authorization"), secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: any;
    try {
      body = JSON.parse(await req.text());
    } catch {
      return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }
    const event = body?.event;
    if (!event || typeof event.id !== "string" || typeof event.type !== "string") {
      return NextResponse.json({ error: "Missing event" }, { status: 400 });
    }
    const r = await applyRevenueCatEvent(event);
    return NextResponse.json({ received: true, outcome: r.outcome });
  } catch (err) {
    return serverError(err);
  }
}
