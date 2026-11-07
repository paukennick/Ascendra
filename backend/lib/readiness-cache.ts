import { examBlueprintForTrack, type ExamBlueprint } from "@/lib/exam-blueprint";
import type { CourseReadiness } from "@/lib/readiness";

// REQ-118 (Audit 3 MEDIUM-5): the course view (the home screen) recomputed
// readiness -- mastery_detail() for every objective in the course -- on every
// request. It is now cached per learner and course for READINESS_CACHE_MS.
//
// Invalidation: each entry is stored with a stamp of the learner's newest
// answer (max(attempts.created_at), read by the course view's first query at
// no extra round trip). Any graded answer, from any route and on any server
// instance, changes the stamp, so the next view recomputes. Time-based
// changes (evidence ageing, review due dates) and tuning-table edits show up
// within the TTL.
//
// LIMITATION (multi-instance): the cache is in this process's memory. Each
// serverless instance keeps its own, so the hit rate is per instance and a
// cold instance always recomputes. Correctness does not depend on it (the
// stamp comes from the database), only the saving does. A shared cache
// (Redis / a table) would be the next step if the course view stays hot.
// One edge: two answers by the same learner committed out of start order can
// leave the stamp unchanged for the later commit; the TTL bounds that.

export const READINESS_CACHE_MS = 60_000;
export const READINESS_CACHE_MAX = 5_000;

interface Entry<T> {
  at: number;
  stamp: string;
  value: T;
}

export function createReadinessCache<T>(ttlMs = READINESS_CACHE_MS, max = READINESS_CACHE_MAX) {
  const entries = new Map<string, Entry<T>>();
  const key = (userId: string, trackId: string) => `${userId}:${trackId}`;
  return {
    async get(
      userId: string,
      trackId: string,
      stamp: string | null,
      compute: () => Promise<T>,
      now: () => number = Date.now
    ): Promise<{ value: T; cached: boolean }> {
      const k = key(userId, trackId);
      const s = stamp ?? "none";
      const hit = entries.get(k);
      if (hit && hit.stamp === s && now() - hit.at < ttlMs) return { value: hit.value, cached: true };
      const value = await compute();
      // Insertion order is the eviction order: re-insert to keep it fresh.
      entries.delete(k);
      entries.set(k, { at: now(), stamp: s, value });
      while (entries.size > max) entries.delete(entries.keys().next().value as string);
      return { value, cached: false };
    },
    // For a caller that knows a learner's evidence changed without a new
    // attempt (an attempt deleted or voided). Drops every course of theirs.
    invalidateUser(userId: string): void {
      for (const k of entries.keys()) if (k.startsWith(`${userId}:`)) entries.delete(k);
    },
    clear(): void {
      entries.clear();
    },
    get size(): number {
      return entries.size;
    },
  };
}

// The stamp as the course view reads it: newest attempt time as text (or
// null when the learner has none), compared for equality only.
export function stampOf(v: unknown): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

// The course view's caches (app/api/courses/[id]/route.ts). Route files may
// only export route fields, so they live here.
export const courseReadinessCache = createReadinessCache<CourseReadiness>();

// The exam blueprint is catalog data, the same for every learner. Keyed on
// the course AND the exam it points at (subject_tracks.credential_exam_id,
// which the course view already reads), so a move to a new exam version
// shows at once; an edit inside the same exam shows within the TTL.
const blueprintCache = new Map<string, { at: number; value: ExamBlueprint | null }>();
const BLUEPRINT_CACHE_MAX = 1_000;

export async function cachedExamBlueprint(trackId: string, examId: unknown): Promise<ExamBlueprint | null> {
  const key = `${trackId}:${examId ?? "none"}`;
  const hit = blueprintCache.get(key);
  if (hit && Date.now() - hit.at < READINESS_CACHE_MS) return hit.value;
  const value = await examBlueprintForTrack(trackId);
  blueprintCache.delete(key);
  blueprintCache.set(key, { at: Date.now(), value });
  while (blueprintCache.size > BLUEPRINT_CACHE_MAX) blueprintCache.delete(blueprintCache.keys().next().value as string);
  return value;
}

export function clearCourseViewCaches(): void {
  courseReadinessCache.clear();
  blueprintCache.clear();
}
