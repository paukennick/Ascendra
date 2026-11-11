import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { matureContentState } from "@/lib/mature-content";

export const dynamic = "force-dynamic";

// GET /api/mature-content -- REQ-224: for each mature-content category
// (mental health), whether this account has confirmed it is 18+ at the
// current notice version, and when. Signed-in only; reveals nothing about
// anyone else.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return ok({ categories: await matureContentState(user.id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
