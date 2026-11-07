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

// An id that isn't a UUID can't match any row; asking Postgres anyway raises
// "invalid input syntax for type uuid" and surfaces as a 500. Treat it as
// not visible (404) instead.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

// REQ-098: the canonical (lowercase) form of a UUID, or null if it isn't one.
// Postgres compares uuid values case-insensitively, but strings built from
// an id -- advisory-lock keys, in-memory map keys, `!==` checks -- do not.
// iOS prints UUIDs in uppercase, so an uppercase and a lowercase copy of one
// id took different locks: two grades on one objective ran at once and left
// mastery stale, and two session starts on one track both inserted. Ids are
// lowercased here at the edge and wherever a key is built from one.
export function normUuid(v: unknown): string | null {
  return isUuid(v) ? v.toLowerCase() : null;
}

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
  if (!isUuid(objectiveId)) return null;
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
  if (!isUuid(unitId)) return null;
  return queryOne<{ id: string; track_id: string }>(
    `select cu.id, cu.track_id
       from course_units cu
       join subject_tracks st on st.id = cu.track_id
      where cu.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [unitId, userId]
  );
}

export async function visibleTrack(trackId: string, userId: string): Promise<{ id: string; title: string } | null> {
  if (!isUuid(trackId)) return null;
  return queryOne<{ id: string; title: string }>(
    `select id, title from subject_tracks where id = $1 and (user_id is null or user_id = $2)`,
    [trackId, userId]
  );
}

export interface VisibleScenario {
  id: string;
  unit_id: string;
  track_id: string;
  title: string;
  scenario: string;
  sub_parts: string[];
}

// A PBQ scenario reached through its own unit and track. Its unit_id is the
// only one callers should trust; a scenario with no unit is not visible.
export async function visibleScenario(scenarioId: string, userId: string): Promise<VisibleScenario | null> {
  if (!isUuid(scenarioId)) return null;
  return queryOne<VisibleScenario>(
    `select ps.id, ps.unit_id, cu.track_id, ps.title, ps.scenario, ps.sub_parts
       from pbq_scenarios ps
       join course_units cu on cu.id = ps.unit_id
       join subject_tracks st on st.id = cu.track_id
      where ps.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [scenarioId, userId]
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
