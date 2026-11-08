import { ok, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { showChoices } from "@/lib/review-service";
import { positionOf, reviewRouteError } from "@/lib/review-routes";

export const dynamic = "force-dynamic";

// POST /api/review/sessions/:id/items/:position/choices -- REQ-108: "Show
// choices". Recorded first, so a typed answer after it counts as helped
// (assist_reason 'hint'). Returns the four options in this learner's fixed
// shuffle; the key is sent only with the verdict.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; position: string }> }) {
  try {
    const { id, position } = await params;
    const user = await requireUser(req);
    const pos = positionOf(position);
    if (!isUuid(id) || pos === null) return notFound("Review question not found");
    return ok(await showChoices(user.id, id, pos));
  } catch (err) {
    return reviewRouteError(err);
  }
}
