import { ok, badRequest, notFound, unauthorized, serverError, readJson, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { visibleTrack } from "@/lib/visibility";
import { resolveToday } from "@/lib/study-plan-store";
import { IntakeInputError, intakeFor, parseIntake, saveIntake, skipIntake } from "@/lib/intake";

export const dynamic = "force-dynamic";

// GET /api/intake?today=YYYY-MM-DD -- REQ-169: the learner's study profile
// (goal, courses and exam dates, experience, weekly time, use), whether to
// offer placement, and -- with paid plans on only -- a suggested category
// plan and length. The suggestion never carries or changes a price.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const today = resolveToday(new URL(req.url).searchParams.get("today"));
    return ok(await intakeFor(user.id, today));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PUT /api/intake { goal?, experience?, weeklyHours?, useFor?, targets: [{ trackId, examDate? }],
//                   applyToPlan?, today? }  or  { skip: true }
// Saves the answers (every one optional) and writes the exam dates and
// weekly hours into each named course's study plan. Answers the new view.
export async function PUT(req: Request) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req);
    try {
      await consumeRateLimit("intake_save", user.id, { max: 30, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    const today = resolveToday(body?.today);
    if (body?.skip === true) {
      await skipIntake(user.id);
      return ok(await intakeFor(user.id, today));
    }
    let input;
    try {
      input = parseIntake(body, today);
    } catch (err) {
      if (err instanceof IntakeInputError) return badRequest(err.message);
      throw err;
    }
    // REQ-129: client-supplied course ids must be visible to the caller.
    for (const t of input.targets) {
      if (!(await visibleTrack(t.trackId, user.id))) return notFound("Course not found");
    }
    await saveIntake(user.id, input);
    return ok(await intakeFor(user.id, today));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
