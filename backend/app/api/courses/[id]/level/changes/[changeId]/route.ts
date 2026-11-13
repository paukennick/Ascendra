import { ok, badRequest, conflict, notFound, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isUuid, visibleTrack } from "@/lib/visibility";
import { actOnLevelChange, LevelChangeError, levelState } from "@/lib/learner-level";

export const dynamic = "force-dynamic";

// POST /api/courses/:id/level/changes/:changeId { action: "seen" | "undo" }
// REQ-252: "OK" on an automatic level change's notice, or "Undo", which puts
// the unit's level back exactly as it was. Answers the new LevelState.
// Unauthenticated: 401.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; changeId: string }> }) {
  try {
    const { id, changeId } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    const action = body?.action;
    if (action !== "seen" && action !== "undo") return badRequest("action must be seen or undo");
    if (!isUuid(changeId) || !(await visibleTrack(id, user.id))) return notFound("Level change not found");
    try {
      await actOnLevelChange(user.id, id, changeId, action);
    } catch (err) {
      if (err instanceof LevelChangeError) return err.status === 404 ? notFound(err.message) : conflict(err.message);
      throw err;
    }
    return ok(await levelState(user.id, id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
