import { ok, badRequest, notFound, unauthorized, serverError, tooManyRequests, conflict } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { visibleTrack } from "@/lib/visibility";
import { resolveToday } from "@/lib/study-plan-store";
import {
  createOutcome,
  listOutcomes,
  outcomePrompt,
  OutcomeLimitError,
  validateOutcome,
  type OutcomeInput,
} from "@/lib/exam-outcomes";

export const dynamic = "force-dynamic";

// GET /api/exam-outcomes?trackId=&today=YYYY-MM-DD -- REQ-119: the caller's
// own reported exam results, newest exam first. With trackId, also the
// study plan's exam date and whether to ask "How did it go?".
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const sp = new URL(req.url).searchParams;
    const trackParam = sp.get("trackId");
    let trackId: string | null = null;
    if (trackParam) {
      const track = await visibleTrack(trackParam, user.id);
      if (!track) return notFound("Track not found");
      trackId = track.id;
    }
    const outcomes = await listOutcomes(user.id, trackId);
    const prompt = trackId ? await outcomePrompt(user.id, trackId, resolveToday(sp.get("today"))) : null;
    return ok({ outcomes, prompt });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// POST /api/exam-outcomes { trackId?, examDate, result: passed|failed|not_said, score?, today? }
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => null);
    const v = validateOutcome(body, resolveToday(body?.today));
    if (!v.ok) return badRequest(v.error);
    let trackId: string | null = null;
    if (body?.trackId != null && body.trackId !== "") {
      const track = typeof body.trackId === "string" ? await visibleTrack(body.trackId, user.id) : null;
      if (!track) return notFound("Track not found");
      trackId = track.id;
    }
    try {
      await consumeRateLimit("exam_outcome", user.id, { max: 20, windowMinutes: 60 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("You've saved several results just now. Try again in a little while.");
      throw err;
    }
    const outcome = await createOutcome(user.id, trackId, v.value as OutcomeInput);
    return ok({ outcome }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof OutcomeLimitError) return conflict(err.message);
    return serverError(err);
  }
}
