import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireOwner } from "@/lib/account-access";
import { holdRateReport } from "@/lib/hold-rates";

export const dynamic = "force-dynamic";

// REQ-235: owner only (OWNER_EMAILS, verified), from Settings > Access.
// GET /api/access/hold-rates -> { asOf, courses: [{ code, title, kinds, topReasons }] }
//   Per catalog course and item kind: generated items stored and drafts held
//   back in the last 7 and 30 days, and the top hold reasons (lib/hold-rates.ts).
//   Counts only: no claims, no content, no learner and no learner's own course.
//   Read-only, two grouped counts, so no rate limit.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    await requireOwner(user.id);
    return ok(await holdRateReport());
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
