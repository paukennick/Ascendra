import { hasUnstorableText } from "@/lib/text-input";
import { ok, badRequest, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { requireAcknowledgementForUnit } from "@/lib/auth/requireAcknowledgement";
import { isUuid } from "@/lib/visibility";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { getOrWriteUnitCheck, gradeUnitCheck, unitCheckStatus } from "@/lib/unit-check";
import { reviewRouteError } from "@/lib/review-routes";
import { featureLock, requireFeature } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

const MAX_ANSWER = 8000;

// GET /api/units/:id/check -- REQ-108 (research item #1): the unit's gate
// check. Before every objective of the unit has been studied it returns only
// the status ({ status, check: null }); after, one scenario written from the
// gate that this learner has not answered: { status, check: { id, title,
// scenario, sub_parts } }.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!isUuid(id)) return notFound("Unit not found");
    const status = await unitCheckStatus(user.id, id);
    if (!status) return notFound("Unit not found");
    await requireAcknowledgementForUnit(id, user.id);
    // REQ-122: not in this learner's plan -- the status, no check written.
    const locked = await featureLock(user.id, "unit_check");
    if (locked) return ok({ status, check: null, locked });
    if (!status.eligible) return ok({ status, check: null });
    return ok({ status, check: await getOrWriteUnitCheck(user.id, status) });
  } catch (err) {
    return reviewRouteError(err);
  }
}

// POST /api/units/:id/check { checkId, answer, clientAttemptId? } -- graded
// per sub-part by the PBQ grader; recorded as kind 'unitcheck'.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!isUuid(id)) return notFound("Unit not found");
    const body = await req.json().catch(() => null);
    if (!isUuid(body?.checkId)) return badRequest("checkId is required");
    if (typeof body.answer !== "string" || !body.answer.trim()) return badRequest("answer is required");
    if (body.answer.length > MAX_ANSWER) return badRequest(`answer must be at most ${MAX_ANSWER} characters`);
    // REQ-116's rule, as on review answers and explain-back: refused before the
    // billed grader call, not after it.
    if (hasUnstorableText(body.answer)) return badRequest("answer contains characters that can't be stored");
    const status = await unitCheckStatus(user.id, id);
    if (!status) return notFound("Unit not found");
    await requireAcknowledgementForUnit(id, user.id);
    await requireFeature(user.id, "unit_check"); // REQ-122
    // REQ-121: eligibility is checked inside gradeUnitCheck, after a resend of
    // an already-graded id has been answered from the stored result.
    return ok(await gradeUnitCheck(user.id, status, body.checkId, body.answer, validClientAttemptId(body.clientAttemptId)));
  } catch (err) {
    return reviewRouteError(err);
  }
}
