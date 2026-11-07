import { NextResponse } from "next/server";
import { ok, badRequest, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { visibleTrack } from "@/lib/visibility";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { answerPlacement, placementView, skipPlacement, startPlacement } from "@/lib/placement";

export const dynamic = "force-dynamic";

const conflict = (message: string) => NextResponse.json({ error: message }, { status: 409 });

// GET /api/courses/:id/placement -- REQ-110: the placement check's state and
// the question waiting, if any (choices in this learner's shuffled order, no key).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!(await visibleTrack(id, user.id))) return notFound("Track not found");
    await requireAcknowledgementForTrack(id, user.id);
    return ok(await placementView(user.id, id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

// POST /api/courses/:id/placement
//   { action: "start" }                                  begin (or resume)
//   { action: "skip" }                                   not now
//   { action: "answer", seq, choice, clientAttemptId? }  answer the waiting question
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const user = await requireUser(req);
    if (!(await visibleTrack(id, user.id))) return notFound("Track not found");
    await requireAcknowledgementForTrack(id, user.id);
    switch (body?.action) {
      case "start": {
        const r = await startPlacement(user.id, id);
        if ("error" in r) return conflict("A placement check isn't available for this course yet.");
        return ok(r);
      }
      case "skip":
        return ok(await skipPlacement(user.id, id));
      case "answer": {
        if (!Number.isInteger(body.seq)) return badRequest("seq is required");
        const r = await answerPlacement(user.id, id, body.seq, body.choice, validClientAttemptId(body.clientAttemptId));
        if (r.status === "not_active") return conflict("There's no placement check in progress for this course.");
        if (r.status === "bad_choice") return badRequest("choice must be one of the options shown");
        if (r.status === "stale") return ok({ ...r.view, stale: true });
        return ok({ ...r.view, replayed: r.replayed });
      }
      default:
        return badRequest('action must be "start", "skip" or "answer"');
    }
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
