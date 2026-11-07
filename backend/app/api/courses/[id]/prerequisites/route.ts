import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireReviewAgent, ReviewAgentAuthError } from "@/lib/auth/requireReviewAgent";
import { isUuid, visibleTrack } from "@/lib/visibility";
import { queryOne } from "@/lib/db";
import { editPrerequisites, insightStatus, prerequisiteMap, PrerequisiteEditError } from "@/lib/understanding-store";

export const dynamic = "force-dynamic";

// GET /api/courses/:id/prerequisites -- REQ-111: the course's light
// prerequisite map ({ state, edges: [{ objective_id, prerequisite_id, source }] }).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!(await visibleTrack(id, user.id))) return notFound("Course not found");
    return ok({ state: await insightStatus(id, "prerequisites"), edges: await prerequisiteMap(id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PUT /api/courses/:id/prerequisites -- edit one objective's prerequisites.
// Body: { objectiveId, prerequisiteIds: [] } (at most two; [] removes them).
// Edited rows are kept by any later generation. Allowed for the owner of a
// private course, and for the catalog-review agent (its machine token) on
// shared catalog courses; nobody else may change a shared map.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) return notFound("Course not found");
    const track = await queryOne<{ user_id: string | null }>(`select user_id from subject_tracks where id = $1`, [id]);
    if (!track) return notFound("Course not found");
    let allowed = false;
    try {
      const user = await requireUser(req);
      allowed = track.user_id === user.id;
      if (!allowed && track.user_id !== null) return notFound("Course not found");
    } catch (err) {
      if (!(err instanceof AuthError)) throw err;
      if (track.user_id === null) {
        try {
          requireReviewAgent(req);
          allowed = true;
        } catch (e) {
          if (!(e instanceof ReviewAgentAuthError)) throw e;
        }
      }
      if (!allowed) return unauthorized(err.message);
    }
    if (!allowed) return NextResponse.json({ error: "Only the catalog review can edit a shared course's map." }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const ids = body?.prerequisiteIds;
    if (!isUuid(body?.objectiveId)) return badRequest("objectiveId is required");
    if (!Array.isArray(ids) || !ids.every(isUuid)) return badRequest("prerequisiteIds must be a list of ids");
    try {
      await editPrerequisites(id, body.objectiveId, ids);
    } catch (e) {
      if (e instanceof PrerequisiteEditError) return badRequest(e.message);
      throw e;
    }
    return ok({ edges: await prerequisiteMap(id) });
  } catch (err) {
    return serverError(err);
  }
}
