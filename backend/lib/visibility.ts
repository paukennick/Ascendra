// REQ-091: one place that answers "may this caller see this row?".
//
// Since REQ-082 a track is visible when it belongs to the shared catalog
// (user_id is null) or to the caller. Several routes checked that, several
// didn't (lesson, prefetch, guess-feedback, PBQ, grade, chat, sessions),
// and requireAcknowledgement* silently returns for a track the caller
// can't see -- so it can't double as an access check. Routes call these
// first and answer 404 on null, which also avoids confirming that a
// private id exists.

import { queryOne } from "@/lib/db";

export class NotVisibleError extends Error {
  constructor(what = "Not found") {
    super(what);
    this.name = "NotVisibleError";
  }
}

export interface VisibleObjective {
  id: string;
  unit_id: string;
  track_id: string;
}

export async function visibleObjective(objectiveId: string, userId: string): Promise<VisibleObjective | null> {
  return queryOne<VisibleObjective>(
    `select o.id, o.unit_id, cu.track_id
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where o.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [objectiveId, userId]
  );
}

export async function visibleUnit(unitId: string, userId: string): Promise<{ id: string; track_id: string } | null> {
  return queryOne<{ id: string; track_id: string }>(
    `select cu.id, cu.track_id
       from course_units cu
       join subject_tracks st on st.id = cu.track_id
      where cu.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [unitId, userId]
  );
}

export async function visibleTrack(trackId: string, userId: string): Promise<{ id: string } | null> {
  return queryOne<{ id: string }>(
    `select id from subject_tracks where id = $1 and (user_id is null or user_id = $2)`,
    [trackId, userId]
  );
}

// Throwing variants for routes that prefer try/catch -> 404.
export async function requireVisibleObjective(objectiveId: string, userId: string) {
  const o = await visibleObjective(objectiveId, userId);
  if (!o) throw new NotVisibleError("Objective not found");
  return o;
}
export async function requireVisibleUnit(unitId: string, userId: string) {
  const u = await visibleUnit(unitId, userId);
  if (!u) throw new NotVisibleError("Unit not found");
  return u;
}
export async function requireVisibleTrack(trackId: string, userId: string) {
  const t = await visibleTrack(trackId, userId);
  if (!t) throw new NotVisibleError("Course not found");
  return t;
}
