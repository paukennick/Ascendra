import { ok, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { findLabObjective, recordLabCompletion } from "@/lib/lab-attempts";

export const dynamic = "force-dynamic";

// POST /api/objectives/:id/lab -- the learner says they did the objective's
// optional hands-on lab (REQ-096). Records one attempt of kind 'lab' with no
// verdict. It never touches mastery or the spaced-review error log: the app
// can't check a hands-on task, so a self-report must not move either.
//
// No body is read. The question stored is the objective's own lab_prompt,
// loaded here, so a caller can't write arbitrary text into the history.
// Repeat calls within a few minutes are a no-op (`recorded: false`) so a
// double tap or retry doesn't stack rows.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(req);

    // 404 for a malformed id, an id in someone else's track, or an objective
    // with no lab -- one answer for all three so the route can't be used to
    // probe which objective ids exist.
    const objective = await findLabObjective(id, user.id);
    if (!objective || !objective.lab_prompt?.trim()) return notFound("No lab for this objective");

    await requireAcknowledgementForObjective(objective.id, user.id);

    const { recorded } = await recordLabCompletion(user.id, objective);
    return ok({ ok: true, recorded });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
