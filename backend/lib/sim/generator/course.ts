// REQ-230: what the generator knows about a course, read from the seeded
// catalog (no database): the course's own outline and the dated sources of
// the unit an objective sits in. The prompt is built from these, and a draft
// must cite at least one of them (gates.ts, "course sources").
import { CATALOG_TRACKS, activeUnits } from "../../../supabase/seed/catalog.ts";
import type { SeedTrack, SeedUnit } from "../../../supabase/seed/data.ts";

export interface CourseSource {
  title: string;
  url: string;
  checkedAt: string | null;
  keyValues: string[];
}

export interface ObjectiveContext {
  course: string;
  courseTitle: string;
  unitTitle: string;
  unitWeight: number | null; // the unit's weight; percent of the exam when weightsAreExam
  weightsAreExam: boolean;
  objective: string;
  courseSources: CourseSource[]; // outline first, then the unit's own sources
}

export function findCourse(code: string): SeedTrack {
  const t = CATALOG_TRACKS.find((x) => x.code === code);
  if (!t) throw new Error(`no course with code ${code} in the seeded catalog (backend/supabase/seed/catalog.ts)`);
  return t;
}

function outlineSources(t: SeedTrack): CourseSource[] {
  const out: CourseSource[] = [];
  const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : null);
  if (t.credential?.officialObjectivesUrl) out.push({ title: `${t.title}: official exam outline`, url: t.credential.officialObjectivesUrl, checkedAt: day(t.credential.lastVendorVerifiedAt), keyValues: [] });
  if (t.sourceUrl && !out.some((s) => s.url === t.sourceUrl)) out.push({ title: `${t.title}: course source`, url: t.sourceUrl, checkedAt: day(t.sourceVerifiedAt), keyValues: [] });
  if (t.curriculum && !out.some((s) => s.url === t.curriculum!.url)) out.push({ title: t.curriculum.name, url: t.curriculum.url, checkedAt: t.curriculum.checkedAt, keyValues: [] });
  return out;
}

function unitSources(u: SeedUnit): CourseSource[] {
  return (u.sources ?? []).map((s) => ({ title: s.title, url: s.url, checkedAt: s.checkedAt, keyValues: s.keyValues ?? [] }));
}

// Every active objective of the course with its unit, in course order.
export function courseObjectives(code: string): ObjectiveContext[] {
  const t = findCourse(code);
  const exam = (t.credential?.domainWeights ?? "exam_blueprint") === "exam_blueprint" && !!t.credential;
  const out: ObjectiveContext[] = [];
  for (const u of activeUnits(t)) {
    for (const o of u.objectives) {
      out.push({
        course: t.code,
        courseTitle: t.title,
        unitTitle: u.title,
        unitWeight: u.weight ?? null,
        weightsAreExam: exam,
        objective: o,
        courseSources: [...outlineSources(t), ...unitSources(u)],
      });
    }
  }
  return out;
}

// The objective by its exact title (as the seed registers a sim: course code
// plus exact title). Throws with the nearest titles when it is not found.
export function objectiveContext(code: string, title: string): ObjectiveContext {
  const all = courseObjectives(code);
  const hit = all.filter((o) => o.objective === title);
  if (hit.length === 1) return hit[0];
  if (hit.length > 1) throw new Error(`${code} has ${hit.length} active objectives titled "${title}"; expected one`);
  const lower = title.toLowerCase();
  const near = all.filter((o) => o.objective.toLowerCase().includes(lower.slice(0, 24))).slice(0, 5);
  throw new Error(`${code} has no active objective titled "${title}"${near.length ? `. Did you mean: ${near.map((n) => `"${n.objective}"`).join("; ")}` : ""}. List them with --select.`);
}
