import { ok, badRequest, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack } from "@/lib/auth/requireAcknowledgement";
import { visibleTrack } from "@/lib/visibility";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { createSession, examProfile, listSessions, sessionView } from "@/lib/exam-sessions";
import { examError } from "@/lib/exam-route-errors";

export const dynamic = "force-dynamic";

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
    const { sessionId, preparation } = await createSession({
      userId: user.id,
      trackId,
      mode,
      timed,
      clientSessionId: validClientAttemptId(body.clientSessionId),
    });
    return ok({ ...(await sessionView(sessionId, user.id)), preparation }, 201);
  } catch (err) {
    return examError(err);
  }
}
