import { ok, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { sessionView } from "@/lib/exam-sessions";
import { examError } from "@/lib/exam-route-errors";

export const dynamic = "force-dynamic";

// REQ-109: GET /api/exam/sessions/:id -- the session as the app shows it.
// Keys, verdicts and explanations are included only once it is submitted.
// A timed session read after its deadline is submitted first.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!isUuid(id)) return notFound("Session not found");
    return ok(await sessionView(id, user.id));
  } catch (err) {
    return examError(err);
  }
}
