import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  isMatureCategory,
  isMatureSource,
  matureContentState,
  recordMatureContentConfirmation,
  MATURE_CONTENT_NOTICE_VERSION,
  MATURE_NOTICE_OUTDATED_MESSAGE,
} from "@/lib/mature-content";

export const dynamic = "force-dynamic";

// POST /api/mature-content/accept { category, version, source? } -- REQ-224:
// the learner confirmed they are 18 or older and want to see the category's
// frank clinical material. Only the current notice version is recorded, so a
// confirmation of older wording is never stored as one of the new; an older
// version answers 409 with code "mature_notice_outdated" and a plain message
// (REQ-175: never a raw validation string for a version gate). Repeats keep
// the first time. Returns the same state as GET /api/mature-content.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    if (!isMatureCategory(body?.category)) return badRequest("That content category doesn't need a confirmation.");
    if (body?.version !== MATURE_CONTENT_NOTICE_VERSION) {
      return ok({ error: MATURE_NOTICE_OUTDATED_MESSAGE, code: "mature_notice_outdated", noticeVersion: MATURE_CONTENT_NOTICE_VERSION }, 409);
    }
    const source = body?.source === undefined ? "course" : body.source;
    if (!isMatureSource(source)) return badRequest("source must be intake, catalog or course");
    await recordMatureContentConfirmation(user.id, body.category, source);
    return ok({ categories: await matureContentState(user.id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
