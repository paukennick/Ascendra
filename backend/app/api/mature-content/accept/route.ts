import { ok, badRequest, notFound, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { notifyOwnersUnderMinimumAge } from "@/lib/age-review";
import {
  acknowledgeMatureCourse,
  isMatureSource,
  matureCategoryOfTrack,
  matureContentState,
  matureUnderageMessage,
  ATTESTATION_REQUIRED_CODE,
  ATTESTATION_REQUIRED_MESSAGE,
  DATE_OF_BIRTH_INVALID_CODE,
  DATE_OF_BIRTH_REQUIRED_CODE,
  MATURE_CONTENT_NOTICE_VERSION,
  MATURE_NOTICE_OUTDATED_MESSAGE,
  MATURE_UNDERAGE_CODE,
} from "@/lib/mature-content";
import { DATE_OF_BIRTH_PROBLEM_MESSAGES } from "@/lib/date-of-birth";

export const dynamic = "force-dynamic";

// POST /api/mature-content/accept { trackId, version, attested: true,
// dateOfBirth?, source? } -- REQ-259 (REQ-224): the learner acknowledged, for
// THIS mental health course, that the information they gave is true and they
// are 18 or older. Answers, in the order checked:
//   409 mature_notice_outdated   an older notice version (REQ-175: a plain
//                                message, never a raw validation string);
//   400 / 404                    a course that is not a visible mental health
//                                course;
//   400 attestation_required     `attested` is not exactly true;
//   400 date_of_birth_required   no date of birth on the account and none sent
//                                (the first prompt asks for it, later ones do
//                                not);
//   400 date_of_birth_invalid    not a real past date from 1900 on;
//   403 mature_content_underage  the age computed from the account's date of
//                                birth (UTC date terms) is under 18: nothing
//                                is recorded, the course stays locked;
//   200                          recorded; the body is GET /api/mature-content.
// A date of birth already on the account is never replaced: one sent with the
// request is ignored. A date entered here that is below the account minimum
// age alerts the owners once (lib/age-review.ts); the learner sees the same
// locked-course answer.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    if (body?.version !== MATURE_CONTENT_NOTICE_VERSION) {
      return ok({ error: MATURE_NOTICE_OUTDATED_MESSAGE, code: "mature_notice_outdated", noticeVersion: MATURE_CONTENT_NOTICE_VERSION }, 409);
    }
    if (typeof body?.trackId !== "string" || !isUuid(body.trackId)) return badRequest("Choose the course to confirm.");
    const track = await matureCategoryOfTrack(body.trackId, user.id);
    if (!track) return notFound("Course not found");
    if (!track.category) return badRequest("That course doesn't need a confirmation.");
    if (body?.attested !== true) return ok({ error: ATTESTATION_REQUIRED_MESSAGE, code: ATTESTATION_REQUIRED_CODE }, 400);
    const source = body?.source === undefined ? "course" : body.source;
    if (!isMatureSource(source)) return badRequest("source must be intake or course");

    const result = await acknowledgeMatureCourse({ userId: user.id, trackId: track.id, source, dateOfBirth: body?.dateOfBirth });
    switch (result.kind) {
      case "date_of_birth_required":
        return ok({ error: DATE_OF_BIRTH_PROBLEM_MESSAGES.missing, code: DATE_OF_BIRTH_REQUIRED_CODE }, 400);
      case "date_of_birth_invalid":
        return ok({ error: result.message, code: DATE_OF_BIRTH_INVALID_CODE, problem: result.problem }, 400);
      case "underage":
        // Once per account: only the request that stored the date alerts.
        if (result.belowMinimum && result.newlyStored) await notifyOwnersUnderMinimumAge(user.id, result.email);
        return ok({ error: matureUnderageMessage(), code: MATURE_UNDERAGE_CODE }, 403);
      case "recorded":
        return ok(await matureContentState(user.id));
    }
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
