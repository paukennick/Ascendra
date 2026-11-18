import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireOwner } from "@/lib/account-access";
import { parseFeedbackFilter } from "@/lib/reviewers-config";
import { listAllFeedback } from "@/lib/reviewers";

export const dynamic = "force-dynamic";

// GET /api/access/reviewer-feedback?reviewer=<userId>&course=<trackId>
// REQ-331: every reviewer submission, newest first (up to 500), with the
// filter choices. Owner only; the server checks on every request.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    await requireOwner(user.id);
    const filter = parseFeedbackFilter(new URL(req.url));
    if (typeof filter === "string") return badRequest(filter);
    return ok(await listAllFeedback(filter));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
