import { ok, notFound, badRequest } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack } from "@/lib/auth/requireAcknowledgement";
import { isUuid } from "@/lib/visibility";
import { queryOne } from "@/lib/db";
import { saveItem } from "@/lib/exam-sessions";
import { examError } from "@/lib/exam-route-errors";

export const dynamic = "force-dynamic";

// REQ-109: PUT /api/exam/sessions/:id/items/:position
//   { response?, flagged?, confidence?, timeSpentMs?, seq? }
// Saves one question's answer (in SHOWN positions; null clears it), its
// flag-for-review, confidence (1-5) and time on screen. Nothing is graded
// here and nothing about the answer comes back. 409 once the session has
// ended or its time is up. REQ-113: `seq` numbers the app's saves of this
// question; one at or below the last applied is ignored and answered
// { saved: false, stale: true } (a newer save already won).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string; position: string }> }) {
  try {
    const { id, position } = await params;
    const user = await requireUser(req);
    if (!isUuid(id)) return notFound("Session not found");
    const pos = Number(position);
    if (!Number.isInteger(pos) || pos < 0) return badRequest("position must be a whole number");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be a JSON object");
    const s = await queryOne<{ track_id: string }>(`select track_id from exam_sessions where id = $1 and user_id = $2`, [id, user.id]);
    if (!s) return notFound("Session not found");
    await requireAcknowledgementForTrack(s.track_id, user.id);
    return ok(await saveItem(id, user.id, pos, body));
  } catch (err) {
    return examError(err);
  }
}
