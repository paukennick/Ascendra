import { queryOne } from "@/lib/db";

// Thrown when a track carries a required disclaimer the user hasn't
// accepted. Routes map this to 403 -- distinct from 401 (not signed in),
// because the caller is authenticated and simply hasn't agreed yet.
export class AcknowledgementError extends Error {
  constructor(message = "You must accept this course's disclaimer before starting it.") {
    super(message);
    this.name = "AcknowledgementError";
  }
}

// Gating only in the client would be decorative -- these endpoints are
// reachable directly with a valid token. Anything that teaches or grades
// content on a disclaimer-gated track (nursing) goes through here first, so
// the acknowledgement is a real precondition rather than a screen the user
// can navigate around.
export async function requireAcknowledgementForTrack(trackId: string, userId: string): Promise<void> {
  const track = await queryOne<{
    requires_acknowledgement: boolean;
    disclaimer_version: number;
  }>(
    `select requires_acknowledgement, disclaimer_version
       from subject_tracks where id = $1 and user_id = $2`,
    [trackId, userId]
  );
  // Missing/not-owned tracks are the caller's problem to report as 404;
  // there's nothing to gate here.
  if (!track || !track.requires_acknowledgement) return;

  const ack = await queryOne<{ id: string }>(
    `select id from track_acknowledgements
      where user_id = $1 and track_id = $2 and disclaimer_version = $3`,
    [userId, trackId, track.disclaimer_version]
  );
  if (!ack) throw new AcknowledgementError();
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
