import { legalContext } from "@/lib/legal";
import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { STUDY_NOTICE_VERSION, isCurrentStudyNoticeVersion, recordStudyNoticeAcceptance } from "@/lib/study-notice";
import { onboardingState } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

// POST /api/onboarding/notice { version } -- REQ-165: the learner accepted
// the study notice (the one disclaimer for all content, and what is sent to
// the AI provider). Only the current version is recorded, so agreeing to
// superseded wording is never stored as agreement to the new one; repeats
// keep the first time. Returns the onboarding state.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    if (!isCurrentStudyNoticeVersion(body?.version)) {
      return badRequest(`version must be the current study notice version (${STUDY_NOTICE_VERSION})`);
    }
    await recordStudyNoticeAcceptance(user.id);
    return ok(await onboardingState(user.id, legalContext(req)));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
