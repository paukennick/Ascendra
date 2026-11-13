import { ok, badRequest, notFound, unauthorized, serverError, readJson, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isUuid, visibleTrack, visibleUnit } from "@/lib/visibility";
import { levelState, saveCourseProfile, setUnitLevel } from "@/lib/learner-level";
import { isCourseGoal, isGoalVia, isLevel, type CourseGoal, type Level } from "@/lib/learner-level-rules";

export const dynamic = "force-dynamic";

// REQ-252 (levels phase 1A, migration 078): the learner's goal and level for
// one course. Signed-in only; the course must be visible to the caller. No
// model call. Unauthenticated: 401 and nothing else.

// GET /api/courses/:id/level?unitId=  -> LevelState (lib/learner-level.ts):
// the goal answer, the course level and per-unit overrides, the suggestion
// from the goal and the account intake, the level the lesson in `unitId`
// uses, whether the level-aware lesson flow is on for this course, and any
// automatic change the learner has not acknowledged yet.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!(await visibleTrack(id, user.id))) return notFound("Course not found");
    const unitParam = new URL(req.url).searchParams.get("unitId");
    let unitId: string | null = null;
    if (unitParam) {
      const unit = isUuid(unitParam) ? await visibleUnit(unitParam, user.id) : null;
      if (unit && unit.track_id === id) unitId = unit.id;
    }
    return ok(await levelState(user.id, id, unitId));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PUT /api/courses/:id/level
//   { goal?: CourseGoal | null, level?: Level, skip?: true, dismiss?: true, via? }
//                                                              -- the goal question / course settings
//     REQ-255: `via` says where it was asked (intake, start, lesson,
//     settings; lib/learner-level-rules.ts GOAL_VIA) and goes only into the
//     course_goal_set event; `dismiss` is the lesson card's "Not now" (asked,
//     like skip). An unknown `via` is a 400.
//   { unitId, unitLevel: Level | null }                         -- a unit's own level (null: follow the course)
// Answers the new LevelState.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    try {
      await consumeRateLimit("level_save", user.id, { max: 60, windowMinutes: 10 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    if (!(await visibleTrack(id, user.id))) return notFound("Course not found");
    const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

    if (b.unitId !== undefined) {
      const unit = isUuid(b.unitId) ? await visibleUnit(b.unitId, user.id) : null;
      if (!unit || unit.track_id !== id) return notFound("Unit not found");
      if (b.unitLevel !== null && !isLevel(b.unitLevel)) return badRequest("unitLevel must be new, some, experienced or null");
      await setUnitLevel(user.id, id, unit.id, b.unitLevel as Level | null);
      return ok(await levelState(user.id, id, unit.id));
    }

    let goal: CourseGoal | null | undefined;
    if (b.goal === null) goal = null;
    else if (b.goal !== undefined) {
      if (!isCourseGoal(b.goal)) return badRequest("goal must be one of work, current, program, career_change, interest");
      goal = b.goal;
    }
    let level: Level | undefined;
    if (b.level !== undefined) {
      if (!isLevel(b.level)) return badRequest("level must be new, some or experienced");
      level = b.level;
    }
    if (b.via !== undefined && !isGoalVia(b.via)) return badRequest("via must be one of intake, start, lesson, settings");
    if (b.skip !== undefined && typeof b.skip !== "boolean") return badRequest("skip must be true or false");
    if (b.dismiss !== undefined && typeof b.dismiss !== "boolean") return badRequest("dismiss must be true or false");
    if (goal === undefined && level === undefined && b.skip !== true && b.dismiss !== true) return badRequest("Nothing to save");
    await saveCourseProfile(user.id, id, {
      goal,
      level,
      skip: b.skip === true,
      dismiss: b.dismiss === true,
      via: isGoalVia(b.via) ? b.via : undefined,
    });
    return ok(await levelState(user.id, id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
