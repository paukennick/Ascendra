import { queryOne } from "@/lib/db";
import { hasAcceptedStudyNotice, STUDY_NOTICE_REQUIRED_MESSAGE } from "@/lib/study-notice";

// Thrown when a clinical (disclaimer-gated) track is used before the learner
// has accepted the study notice. Routes map this to 403 -- distinct from 401
// (not signed in), because the caller is authenticated and simply hasn't
// agreed yet.
export class AcknowledgementError extends Error {
  constructor(message = STUDY_NOTICE_REQUIRED_MESSAGE) {
    super(message);
    this.name = "AcknowledgementError";
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
export async function requireAcknowledgementForTrack(trackId: string, userId: string): Promise<void> {
  const track = await queryOne<{ requires_acknowledgement: boolean }>(
    `select requires_acknowledgement from subject_tracks where id = $1 and (user_id is null or user_id = $2)`,
    [trackId, userId]
  );
  // Missing/not-owned tracks are the caller's problem to report as 404;
  // there's nothing to gate here.
  if (!track || !track.requires_acknowledgement) return;
  if (!(await hasAcceptedStudyNotice(userId))) throw new AcknowledgementError();
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
