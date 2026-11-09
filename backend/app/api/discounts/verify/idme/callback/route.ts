import { NextResponse } from "next/server";
import { finishVerification } from "@/lib/verified-discounts";

export const dynamic = "force-dynamic";

// GET /api/discounts/verify/idme/callback?code&state -- REQ-167: where ID.me
// sends the learner back (IDME_REDIRECT_URI). No sign-in header arrives here
// (it is a browser redirect); the signed state names the account, the group
// and where to return. Records only the result (lib/verified-discounts.ts)
// and redirects to the fixed app or web discount page with ?verify=<result>.
// Never errors to the learner: every failure becomes a result on that page.
export async function GET(req: Request) {
  const { redirect } = await finishVerification("idme", new URL(req.url).searchParams);
  return NextResponse.redirect(redirect, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
