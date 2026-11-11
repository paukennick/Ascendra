import { NextResponse } from "next/server";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import {
  INBOUND_RATE_LIMIT,
  MAX_WEBHOOK_BYTES,
  forwardReceivedEmail,
  validDeliveryId,
  claimInboundDelivery,
  releaseInboundDelivery,
  completeInboundDelivery,
  inboundConfig,
  receivedEvent,
  verifyResendWebhook,
} from "@/lib/inbound-email";

export const dynamic = "force-dynamic";

// POST /api/inbound/email -- Resend's `email.received` webhook (REQ-205,
// lib/inbound-email.ts). Order matters:
//   1. fail closed: no signing secret, API key or forward address -> 503;
//   2. the raw body is read once (size-capped) and its Svix signature checked
//      before anything is parsed -> 401 when wrong;
//   3. only a verified event reaches the rate limit (a stranger cannot use up
//      the budget) and the mailbox;
//   4. other event types are acknowledged and ignored (200);
//   5. REQ-219 (FAIL-1116): a delivery id (svix-id) already forwarded, or in
//      flight, is a replay or a retry that already succeeded: answered 200,
//      forwarded once only (lib/inbound-email.ts claimInboundDelivery).
// A failed fetch or send answers 502 so Resend retries. Nothing from the
// message is ever logged.
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  const cfg = inboundConfig();
  if (!secret || !cfg) return NextResponse.json({ error: "Inbound email is not configured." }, { status: 503 });

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Too large." }, { status: 413 });
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Too large." }, { status: 413 });

  if (!verifyResendWebhook(raw, req.headers, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  const event = receivedEvent(raw);
  if (!event) return NextResponse.json({ ignored: true });

  const svixId = req.headers.get("svix-id");
  if (!validDeliveryId(svixId)) return NextResponse.json({ error: "Invalid delivery id." }, { status: 400 });
  try {
    if (!(await claimInboundDelivery(svixId))) return NextResponse.json({ duplicate: true });
  } catch {
    console.error("inbound email: delivery claim failed");
    return NextResponse.json({ error: "Try again." }, { status: 503 });
  }

  // From here a delivery that does not finish gives its claim back, so
  // Resend's retry is processed instead of being taken for a replay.
  try {
    try {
      await consumeRateLimit("inbound_email", "resend", INBOUND_RATE_LIMIT);
    } catch (err) {
      await releaseInboundDelivery(svixId).catch(() => undefined);
      if (err instanceof RateLimitError) return NextResponse.json({ error: "Too many." }, { status: 429 });
      console.error("inbound email: rate limit failed");
      return NextResponse.json({ error: "Try again." }, { status: 503 });
    }

    const out = await forwardReceivedEmail(event.emailId, cfg);
    if (out.ok) {
      await completeInboundDelivery(svixId).catch(() => undefined);
      return NextResponse.json({ forwarded: true });
    }
    console.error(`inbound email ${event.emailId}: ${out.stage} failed (${out.status ?? "no response"})`);
    // A message that is itself one of our forwards is dropped, not retried.
    if (out.stage === "loop") {
      await completeInboundDelivery(svixId).catch(() => undefined);
      return NextResponse.json({ ignored: true });
    }
    await releaseInboundDelivery(svixId).catch(() => undefined);
    return NextResponse.json({ error: "Could not forward." }, { status: 502 });
  } catch (err) {
    await releaseInboundDelivery(svixId).catch(() => undefined);
    throw err;
  }
}
