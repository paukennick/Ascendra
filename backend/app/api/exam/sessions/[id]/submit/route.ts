import { ok, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack } from "@/lib/auth/requireAcknowledgement";
import { isUuid } from "@/lib/visibility";
import { queryOne } from "@/lib/db";
import { sessionView, submitSession } from "@/lib/exam-sessions";
import { examError } from "@/lib/exam-route-errors";

export const dynamic = "force-dynamic";
// REQ-218: no model call here, but the submit grades and records every answer
// in one transaction (a mock can hold a hundred), which the default function
// time could cut off. At most 300, the Hobby plan ceiling with Fluid compute.
export const maxDuration = 120;

// REQ-109: POST /api/exam/sessions/:id/submit -- grades every saved answer on
// the server, records each answered question as an attempt (mastery, review
// log, repeat rule), and returns the session with its results: score,
// breakdown by domain, pacing, the readiness comparison (mock) and
// confidence calibration. Submitting again returns the same results.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!isUuid(id)) return notFound("Session not found");
    const s = await queryOne<{ track_id: string }>(`select track_id from exam_sessions where id = $1 and user_id = $2`, [id, user.id]);
    if (!s) return notFound("Session not found");
    await requireAcknowledgementForTrack(s.track_id, user.id);
    await submitSession(id, user.id);
    return ok(await sessionView(id, user.id));
  } catch (err) {
    return examError(err);
  }
}
