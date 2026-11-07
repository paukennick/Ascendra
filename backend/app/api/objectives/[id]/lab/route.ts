import { ok, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleObjective } from "@/lib/visibility";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { labObjective, latestLabReport, reportShape } from "@/lib/lesson-experience";
import { featureLock } from "@/lib/entitlements";
import { LABS_FEATURE } from "@/lib/labs";
import { coachContextForObjective } from "@/lib/coach-context";
import { labSafetyFamily } from "@/lib/lab-grading";
import { labDisclaimerFor } from "@/lib/lab-disclaimer";

export const dynamic = "force-dynamic";

// GET /api/objectives/:id/lab -- REQ-106: the objective's optional hands-on
// lab for the lesson's Done card, and this learner's latest lab report on it.
// No model call. Returns { lab: { prompt, disclaimer } | null, report: {...} | null }.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);
    // REQ-122: not in this learner's plan -- no lab card, said gently.
    const locked = await featureLock(user.id, LABS_FEATURE);
    if (locked) return ok({ lab: null, report: null, locked });
    const obj = await labObjective(id);
    const prompt = obj?.lab_prompt?.trim();
    if (!prompt) return ok({ lab: null, report: null });
    // REQ-125: every lab carries the lab disclaimer, this kind too (it has
    // no expert-review state, so no "not reviewed" line).
    const disclaimer = await labDisclaimerFor(user.id, labSafetyFamily(await coachContextForObjective(id)), null);
    return ok({ lab: { prompt, disclaimer }, report: reportShape(await latestLabReport(user.id, id)) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
