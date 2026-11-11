import { NextResponse } from "next/server";
import { readUnsubscribeToken } from "@/lib/service-email-copy";
import { unsubscribe } from "@/lib/service-emails";
import { serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/email/unsubscribe?token=... -- REQ-197: the RFC 8058 one-click
// unsubscribe a mail client sends from the List-Unsubscribe-Post header
// (body "List-Unsubscribe=One-Click"). It turns off the one kind of email
// the signed token names. GET is not handled here: a person following the
// link in the email lands on /unsubscribe, which asks for a button press so
// a mail scanner opening links changes nothing (as REQ-191's links do).
export async function POST(req: Request) {
  try {
    const found = readUnsubscribeToken(new URL(req.url).searchParams.get("token"));
    if (!found) return NextResponse.json({ error: "This unsubscribe link isn't valid." }, { status: 400 });
    await unsubscribe(found.userId, found.kind);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
