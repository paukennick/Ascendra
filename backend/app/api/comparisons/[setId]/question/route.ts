import { ok, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { nextDiscriminationItem, visibleConceptSet } from "@/lib/understanding-store";
import { presentationOrder, presentationSeed, shuffleForPresentation } from "@/lib/choice-order";
import { requireFeature } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// GET /api/comparisons/:setId/question -- REQ-111: the next "which one fits
// this scenario?" question of a comparison card for this learner: one they
// have not answered yet, otherwise the one answered longest ago (seen: true;
// answering it again is graded as a repeat, so it cannot lift mastery).
// Options are the card's concepts in this learner's fixed shuffled order
// (lib/choice-order.ts); the answer is graded server-side by
// POST /api/comparison-items/:itemId/answer and never sent before.
//
// Returns { item: { id, scenario, options }, seen } or 404 if the card has no
// questions.
export async function GET(req: Request, { params }: { params: Promise<{ setId: string }> }) {
  try {
    const { setId } = await params;
    const user = await requireUser(req);
    const set = await visibleConceptSet(setId, user.id);
    if (!set) return notFound("Comparison not found");
    await requireAcknowledgementForTrack(set.track_id, user.id);
    await requireFeature(user.id, "comparison", set.track_id); // REQ-122, REQ-170
    const next = await nextDiscriminationItem(user.id, setId);
    if (!next) return notFound("This comparison has no questions yet");
    const { item, seen } = next;
    const order = presentationOrder(presentationSeed(user.id, item.set_id, "discriminate", item.scenario), item.options.length);
    return ok({ item: { id: item.id, scenario: item.scenario, options: shuffleForPresentation(item.options, order) }, seen });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
