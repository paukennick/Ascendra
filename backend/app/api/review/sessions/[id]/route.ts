import { ok, badRequest, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { sessionView } from "@/lib/review-service";
import { finishSession } from "@/lib/review-store";
import { reviewRouteError } from "@/lib/review-routes";

export const dynamic = "force-dynamic";

// GET /api/review/sessions/:id -- REQ-108: the session, for resuming.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!isUuid(id)) return notFound("Review session not found");
    const session = await sessionView(user.id, id);
    if (!session) return notFound("Review session not found");
    return ok({ session });
  } catch (err) {
    return reviewRouteError(err);
  }
}

// PATCH /api/review/sessions/:id { action: "finish" } -- "Stop for today".
// Unanswered objectives stay due; nothing is marked as reviewed.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    if (body?.action !== "finish") return badRequest("action must be 'finish'");
    if (!isUuid(id) || !(await finishSession(user.id, id))) return notFound("Review session not found");
    return ok({ finished: true });
  } catch (err) {
    return reviewRouteError(err);
  }
}
