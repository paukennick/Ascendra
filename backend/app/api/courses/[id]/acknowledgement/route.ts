import { queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { hasAcceptedStudyNotice, STUDY_NOTICE_REQUIRED_MESSAGE, STUDY_NOTICE_VERSION } from "@/lib/study-notice";

export const dynamic = "force-dynamic";

// REQ-165 (Nick, 2026-11-09): courses no longer carry their own disclaimer.
// A gated course (requires_acknowledgement) needs the one study notice
// (lib/study-notice.ts), accepted at launch for all of Ascendra.
//
// GET /api/courses/:id/acknowledgement -- whether this course is gated and
// whether the learner has accepted the study notice. `disclaimerKey` is not
// sent any more, so an app from before the notice shows no course
// disclaimer screen.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const track = await queryOne<{ requires_acknowledgement: boolean }>(
      `select requires_acknowledgement from subject_tracks where id = $1 and (user_id is null or user_id = $2)`,
      [id, user.id]
    );
    if (!track) return notFound("Track not found");
    if (!track.requires_acknowledgement) return ok({ required: false, acknowledged: true });
    return ok({
      required: true,
      acknowledged: await hasAcceptedStudyNotice(user.id),
      notice: "study_notice",
      noticeVersion: STUDY_NOTICE_VERSION,
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// POST -- the old per-course "I understand". Nothing is recorded: agreeing
// to a course's old disclaimer is not agreeing to the study notice.
export async function POST(req: Request) {
  try {
    await requireUser(req);
    return badRequest(STUDY_NOTICE_REQUIRED_MESSAGE);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
