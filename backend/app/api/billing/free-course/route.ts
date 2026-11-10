import { ok, badRequest, notFound, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { startableTrack } from "@/lib/visibility";
import { billingEnabled } from "@/lib/billing-config";
import { chooseFreeCourse, tierFor } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// PUT /api/billing/free-course { trackId } -- REQ-122: a Free learner picks
// the one course they study. A course picked automatically (the first one
// opened) can be switched at once; after that once every
// BILLING_FREE_COURSE_SWITCH_DAYS (7) -- a 409 saying when otherwise.
// Progress in every course is kept either way.
export async function PUT(req: Request) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req);
    if (!billingEnabled()) return notFound("Paid plans aren't available yet.");
    if (typeof body?.trackId !== "string") return badRequest("trackId is required");
    const track = await startableTrack(body.trackId, user.id); // REQ-194: not a hidden course
    if (!track) return notFound("Course not found");
    if ((await tierFor(user.id)) !== "free") return badRequest("Your plan includes every course.");
    return ok({ freeCourse: await chooseFreeCourse(user.id, track.id) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
