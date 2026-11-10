import { ok, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleTrack } from "@/lib/visibility";
import { coursePaths } from "@/lib/study-paths";

export const dynamic = "force-dynamic";

// GET /api/courses/:id/path -- REQ-198: the study paths this course sits
// on, from the seed's path list (supabase/seed/paths.ts):
// { paths: [{ slug, title, audience, steps: [{ trackId, code, title, when,
// why, position, current }], before, after }] }. [] for a course on no path.
// 404 for a course the caller can't see, like every course route.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!(await visibleTrack(id, user.id))) return notFound("Course not found");
    return ok({ paths: await coursePaths(id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
