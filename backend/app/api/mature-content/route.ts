import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { matureContentState } from "@/lib/mature-content";

export const dynamic = "force-dynamic";

// GET /api/mature-content -- REQ-224 / REQ-259: this account's 18+ state for
// mental health courses: whether a date of birth is on file (so the notice
// asks for one only the first time), whether the age computed from it is 18
// or over ("unknown", "adult" or "under_18"; never the date or the age), and
// the courses acknowledged at the current notice version. Signed-in only;
// reveals nothing about anyone else.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return ok(await matureContentState(user.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
