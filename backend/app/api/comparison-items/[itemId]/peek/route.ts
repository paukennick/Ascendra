import { ok, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { isUuid } from "@/lib/visibility";
import { discriminationItem, visibleConceptSet } from "@/lib/understanding-store";
import { recordHintReveal } from "@/lib/grading-service";
import { requireFeature } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// POST /api/comparison-items/:itemId/peek -- REQ-111: the learner reopened the
// comparison card while this question was on screen. Recorded before the app
// shows the card again (lesson_hint_reveals, item key of stage
// "discriminate" + scenario), so the answer that follows is graded as
// hint-assisted, as a Solo answer is after "Show choices". Idempotent.
export async function POST(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const user = await requireUser(req);
    const item = isUuid(itemId) ? await discriminationItem(itemId) : null;
    if (!item || !(await visibleConceptSet(item.set_id, user.id))) return notFound("Question not found");
    await requireAcknowledgementForTrack(item.track_id, user.id);
    await requireFeature(user.id, "comparison", item.track_id); // REQ-122, REQ-170
    if (item.objective_id) await recordHintReveal(user.id, item.objective_id, "discriminate", item.scenario);
    return ok({ recorded: !!item.objective_id });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
