import { ok, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleObjective } from "@/lib/visibility";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { labObjective, latestLabReport, reportShape } from "@/lib/lesson-experience";
import { featureLock } from "@/lib/entitlements";
import { LABS_FEATURE } from "@/lib/labs";
import { findLabObjective, recordLabCompletion, tryItLab } from "@/lib/lab-attempts";

export const dynamic = "force-dynamic";

// GET /api/objectives/:id/lab -- REQ-106: the objective's optional hands-on
// lab for the lesson's Done card, and this learner's latest lab report on it.
// No model call. Returns { lab: { prompt } | null, report: {...} | null }.
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
    // REQ-165: no per-lab disclaimer; the study notice covers labs.
    return ok({ lab: { prompt }, report: reportShape(await latestLabReport(user.id, id)) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

// POST /api/objectives/:id/lab -- the learner says they did the objective's
// optional hands-on lab from the lesson's Try it step (REQ-096, line B;
// merged into this route 2026-11-07 beside A's GET). Records one attempt of
// kind 'lab', format 'lab', with no verdict. It never touches mastery or the
// spaced-review error log: the app can't check a hands-on task, so a
// self-report must not move either.
//
// No body is read. The question stored is the objective's own lab_prompt,
// loaded here, so a caller can't write arbitrary text into the history.
// Repeat calls within a few minutes are a no-op (`recorded: false`) so a
// double tap or retry doesn't stack rows. 404 for a malformed id, an id in
// someone else's track, an objective with no lab, or a lab the Try it step
// would not offer (lib/lab-attempts.ts tryItLab: plan without labs, a
// clinical / fitness lab before the study notice is accepted, or -- REQ-139 --
// an objective whose lab the learner already sees as the lab card or a
// build / case lab) -- one answer
// for all, so the route can't be used to probe which objective ids exist.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const objective = await findLabObjective(id, user.id);
    if (!objective || !objective.lab_prompt?.trim()) return notFound("No lab for this objective");
    await requireAcknowledgementForObjective(objective.id, user.id);
    if (!(await tryItLab(user.id, objective.id))) return notFound("No lab for this objective");
    const { recorded } = await recordLabCompletion(user.id, objective);
    return ok({ ok: true, recorded });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
