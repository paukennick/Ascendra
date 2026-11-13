import { queryOne } from "@/lib/db";
import { hasAcceptedStudyNotice, STUDY_NOTICE_REQUIRED_MESSAGE, STUDY_NOTICE_VERSION } from "@/lib/study-notice";
import {
  isMatureCategory,
  matureContentNeededSql,
  matureContentRequiredBody,
  MATURE_CONTENT_REQUIRED_MESSAGE,
  type MatureCategory,
} from "@/lib/mature-content";

// Thrown when a clinical (disclaimer-gated) track is used before the learner
// has accepted the study notice. Routes map this to 403 -- distinct from 401
// (not signed in), because the caller is authenticated and simply hasn't
// agreed yet.
//
// `extra` goes into the 403 body (forbidden(err.message, err.extra)) so the
// app can tell which acknowledgement is missing: the study notice
// (code "study_notice_required") or, REQ-224, the 18+ mature-content
// confirmation (code "mature_content_required", MatureContentError).
export class AcknowledgementError extends Error {
  // Read by serverError (lib/http.ts), which cannot import this module: any
  // route that lets one escape still answers 403, never 500.
  readonly acknowledgementRequired = true;
  readonly extra: Record<string, unknown>;
  constructor(message = STUDY_NOTICE_REQUIRED_MESSAGE, extra?: Record<string, unknown>) {
    super(message);
    this.name = "AcknowledgementError";
    this.extra = extra ?? { code: "study_notice_required", noticeVersion: STUDY_NOTICE_VERSION };
  }
}

// REQ-224: a mental health course used before the learner confirmed they are
// 18+ (lib/mature-content.ts); REQ-259: confirmed for THAT course. A subclass, so every route that already maps
// AcknowledgementError to a 403 answers this one with a 403 too.
export class MatureContentError extends AcknowledgementError {
  constructor(readonly category: MatureCategory, readonly trackId: string) {
    super(MATURE_CONTENT_REQUIRED_MESSAGE, matureContentRequiredBody(category, trackId));
    this.name = "MatureContentError";
  }
}

// Gating only in the client would be decorative -- these endpoints are
// reachable directly with a valid token. Anything that teaches or grades
// content on a gated track (requires_acknowledgement: nursing, physical
// therapy, fitness) goes through here first.
//
// REQ-165 (Nick, 2026-11-09): the per-course disclaimer is gone; what a gated
// track now requires is the one study notice (lib/study-notice.ts), accepted
// once for all of Ascendra. track_acknowledgements is kept as history and no
// longer read.
//
// REQ-224: the same read also says whether the track is in a mature-content
// category (mental health) the learner has not confirmed; that gate applies
// whatever requires_acknowledgement says, after the study notice.
export async function requireAcknowledgementForTrack(trackId: string, userId: string): Promise<void> {
  const track = await queryOne<{ requires_acknowledgement: boolean; mature_needed: string | null }>(
    `select st.requires_acknowledgement, ${matureContentNeededSql("st", "$2")} as mature_needed
       from subject_tracks st where st.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [trackId, userId]
  );
  // Missing/not-owned tracks are the caller's problem to report as 404;
  // there's nothing to gate here.
  if (!track) return;
  if (track.requires_acknowledgement && !(await hasAcceptedStudyNotice(userId))) throw new AcknowledgementError();
  if (isMatureCategory(track.mature_needed)) throw new MatureContentError(track.mature_needed, trackId);
}

// Same gate, entered from a unit -- the PBQ endpoints work per unit.
export async function requireAcknowledgementForUnit(unitId: string, userId: string): Promise<void> {
  const row = await queryOne<{ track_id: string }>(
    `select track_id from course_units where id = $1`,
    [unitId]
  );
  if (!row) return;
  await requireAcknowledgementForTrack(row.track_id, userId);
}

// Same gate, entered from an objective instead of a track -- the lesson and
// grading endpoints only know the objective the learner is working on.
export async function requireAcknowledgementForObjective(objectiveId: string, userId: string): Promise<void> {
  const row = await queryOne<{ track_id: string }>(
    `select cu.track_id
       from objectives o join course_units cu on cu.id = o.unit_id
      where o.id = $1`,
    [objectiveId]
  );
  if (!row) return;
  await requireAcknowledgementForTrack(row.track_id, userId);
}
