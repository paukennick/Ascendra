import { query, queryOne } from "@/lib/db";
import { STUDY_PATHS, type SeedStudyPath } from "../supabase/seed/paths";

// REQ-198: the study paths a course sits on, for the course page's
// "Recommended before / Recommended after". The paths are seed data
// (supabase/seed/paths.ts), keyed by track code. This module places a
// course on them (pure) and resolves the codes to catalog course ids
// (one query). Read-only, no AI call, nothing per learner except
// visibility, so it reads no learner data.

export interface PathStepView {
  trackId: string;
  code: string;
  title: string;
  when: string;
  why: string;
  position: number; // 1-based
  current: boolean;
}

export interface CoursePathView {
  slug: string;
  title: string;
  audience: string;
  steps: PathStepView[];
  // The steps right before and right after this course, if any.
  before: PathStepView | null;
  after: PathStepView | null;
}

// Pure: the paths that include `code`, with the course's index in each.
export function pathsContaining(code: string, paths: readonly SeedStudyPath[] = STUDY_PATHS): { path: SeedStudyPath; index: number }[] {
  const out: { path: SeedStudyPath; index: number }[] = [];
  for (const path of paths) {
    const index = path.steps.findIndex((s) => s.trackCode === code);
    if (index >= 0) out.push({ path, index });
  }
  return out;
}

// Every catalog code any path names, for the one lookup query.
export function pathCodes(paths: readonly SeedStudyPath[] = STUDY_PATHS): string[] {
  return [...new Set(paths.flatMap((p) => p.steps.map((s) => s.trackCode)))];
}

// Pure: builds the view for the course with `code`, given catalog rows by
// code. A step whose course is not in `catalog` (not seeded on this
// database) is left out. The path is still shown when this course and at
// least one other step remain, and before/after are worked out on the
// steps that remain, so a missing middle course never leaves a gap.
export function buildCoursePaths(
  code: string,
  catalog: ReadonlyMap<string, { id: string; title: string }>,
  paths: readonly SeedStudyPath[] = STUDY_PATHS
): CoursePathView[] {
  const views: CoursePathView[] = [];
  for (const { path } of pathsContaining(code, paths)) {
    const kept = path.steps.filter((s) => catalog.has(s.trackCode));
    if (kept.length < 2 || !kept.some((s) => s.trackCode === code)) continue;
    const steps: PathStepView[] = kept.map((s, i) => ({
      trackId: catalog.get(s.trackCode)!.id,
      code: s.trackCode,
      title: catalog.get(s.trackCode)!.title,
      when: s.when,
      why: s.why,
      position: i + 1,
      current: s.trackCode === code,
    }));
    const at = steps.findIndex((s) => s.current);
    views.push({
      slug: path.slug,
      title: path.title,
      audience: path.audience,
      steps,
      before: at > 0 ? steps[at - 1] : null,
      after: at < steps.length - 1 ? steps[at + 1] : null,
    });
  }
  return views;
}

// The paths for one course as the caller sees it. Only shared catalog
// courses are on a path: a learner's own course (user_id set) never is,
// even if it reuses a catalog code, so it gets [].
// `paths` is for tests; the route always uses the seed's list.
export async function coursePaths(trackId: string, paths: readonly SeedStudyPath[] = STUDY_PATHS): Promise<CoursePathView[]> {
  const row = await queryOne<{ code: string | null; user_id: string | null }>(
    `select code, user_id from subject_tracks where id = $1`,
    [trackId]
  );
  if (!row?.code || row.user_id !== null) return [];
  if (!pathsContaining(row.code, paths).length) return [];
  const rows = await query<{ id: string; code: string; title: string }>(
    `select id, code, title from subject_tracks where user_id is null and code = any($1::text[])`,
    [pathCodes(paths)]
  );
  return buildCoursePaths(row.code, new Map(rows.map((r) => [r.code, { id: r.id, title: r.title }])), paths);
}
