import { ok, badRequest, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack } from "@/lib/auth/requireAcknowledgement";
import { visibleTrack } from "@/lib/visibility";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { createSession, examProfile, listSessions, sessionView } from "@/lib/exam-sessions";
import { examError } from "@/lib/exam-route-errors";
import { requireCourseAccess, requireFeature, withAllowance } from "@/lib/entitlements";
import { queryOne } from "@/lib/db";

// REQ-202: seconds this route may run (up to 4 writer calls and fact-checks, 4 at a time). Never above 300, the Hobby
// plan ceiling with Fluid compute (docs/billing.md, "Function duration").
export const maxDuration = 300;

export const dynamic = "force-dynamic";

// REQ-122: a resend of a session this learner already started (same
// clientSessionId) is a replay, never a second counted mock.
async function sessionExists(userId: string, clientSessionId: string): Promise<boolean> {
  return (await queryOne(`select 1 from exam_sessions where user_id = $1 and client_session_id = $2`, [userId, clientSessionId])) !== null;
}

// REQ-109: timed sprints and mock exams.
//
// GET  /api/exam/sessions?trackId=...   what the course's exam looks like
//      (formats, question count, duration) and this learner's recent sessions
// POST /api/exam/sessions  { trackId, mode: "sprint" | "mock", timed, clientSessionId? }
//      builds a session and returns it (questions without keys, in this
//      learner's shuffle) plus how it was prepared. Starting a new session of
//      the same mode closes an open one without grading it.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const trackId = new URL(req.url).searchParams.get("trackId");
    if (!trackId) return badRequest("trackId is required");
    if (!(await visibleTrack(trackId, user.id))) return notFound("Course not found");
    const profile = await examProfile(trackId);
    return ok({ exam: profile, sessions: await listSessions(user.id, trackId) });
  } catch (err) {
    return examError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { trackId, mode, timed } = body ?? {};
    if (typeof trackId !== "string" || !trackId) return badRequest("trackId is required");
    if (mode !== "sprint" && mode !== "mock") return badRequest("mode must be 'sprint' or 'mock'");
    if (typeof timed !== "boolean") return badRequest("timed must be true or false");
    const user = await requireUser(req);
    if (!(await visibleTrack(trackId, user.id))) return notFound("Course not found");
    await requireAcknowledgementForTrack(trackId, user.id);
    // REQ-122: a Free learner studies one course; mock exams are in Plus
    // (counted a month) and Pro. A resend of a session already started is
    // never counted again. All no-ops while billing is off.
    await requireCourseAccess(user.id, trackId);
    const clientSessionId = validClientAttemptId(body.clientSessionId);
    const start = () => createSession({ userId: user.id, trackId, mode, timed, clientSessionId });
    let created: Awaited<ReturnType<typeof createSession>>;
    if (mode === "mock" && !(clientSessionId && (await sessionExists(user.id, clientSessionId)))) {
      const tier = await requireFeature(user.id, "mock_exam", trackId); // REQ-170: the tier on this course
      created = await withAllowance(user.id, "mock_exam", start, tier);
    } else {
      created = await start();
    }
    const { sessionId, preparation } = created;
    return ok({ ...(await sessionView(sessionId, user.id)), preparation }, 201);
  } catch (err) {
    return examError(err);
  }
}
