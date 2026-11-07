import { ok, badRequest, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleObjective } from "@/lib/visibility";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { lessonCheckFor, recordHintReveal } from "@/lib/grading-service";
import { presentationOrder, presentationSeed, shuffleForPresentation } from "@/lib/choice-order";
import { requireCourseAccessForObjective } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// POST /api/objectives/:id/hint -- the Solo check's answer choices, shown as
// a hint (REQ-134). The lesson payload no longer carries them, so asking here
// is the only way to see them, and the reveal is recorded first
// (lesson_hint_reveals): a later Solo answer to this item, in any format,
// is graded as assisted and can't lift mastery above Guided. Repeat calls
// return the same choices in the same order and record nothing new.
// Body: { stage: "solo" }. Returns { choices }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const user = await requireUser(req);
    // REQ-135: the canonical (lowercase) id from the visibility check, so the
    // shuffle seed and the recorded reveal match however the app spelled it.
    const objective = await visibleObjective(rawId, user.id);
    if (!objective) return notFound("Objective not found");
    const id = objective.id;
    await requireAcknowledgementForObjective(id, user.id);
    await requireCourseAccessForObjective(user.id, id); // REQ-122: Free studies one course

    const body = await req.json().catch(() => ({}));
    const stage = body?.stage ?? "solo";
    if (stage !== "solo") return badRequest("stage must be 'solo'");

    const found = await lessonCheckFor(user.id, id, stage);
    if (found.status === "no-lesson") return notFound("No lesson for this objective yet");
    if (found.status !== "ok") return badRequest("This lesson's practice questions are still being generated -- try again in a moment.");
    const { check } = found;

    await recordHintReveal(user.id, id, stage, check.question);
    const order = presentationOrder(presentationSeed(user.id, id, stage, check.question), check.choices.length);
    return ok({ choices: shuffleForPresentation(check.choices, order) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
