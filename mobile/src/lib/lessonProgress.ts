// Mid-lesson position (which step of guess/teach/fade/solo the learner is
// on, plus their guess and confidence) used to live only in React state on
// the lesson screen. Leaving the lesson -- back to the course dashboard,
// the sidebar, the review queue -- unmounts that screen, so reopening the
// objective always restarted at "guess". Graded attempts were never lost
// (they're saved server-side by /api/grade), but the learner's place was.
//
// This module is the pure half of the fix: the storage key, what gets
// saved, and the rules for whether a saved snapshot may be resumed. The
// lesson screen does the actual AsyncStorage read/write.

export type ResumableStep = "teach" | "fade" | "solo";

export interface LessonSnapshot {
  v: 1;
  step: ResumableStep;
  guess: string;
  guessFeedback: string | null;
  confidence: number | null;
  // Fingerprint of the lesson content the step belongs to. If the lesson
  // was regenerated since, resuming at "solo" would show a question the
  // learner was never taught, so a mismatch discards the snapshot.
  lessonKey: string;
  savedAt: number;
}

// A snapshot older than this is treated as stale: after a week away the
// teach step is worth re-reading, and it keeps storage from accumulating.
export const SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const RESUMABLE: readonly string[] = ["teach", "fade", "solo"];

export function snapshotStorageKey(objectiveId: string): string {
  return `ascendra.lessonProgress.${objectiveId}`;
}

// Cheap, stable fingerprint of the lesson text. Not a security hash -- it
// only needs to change when the lesson content changes.
export function lessonFingerprint(lesson: { guessPrompt?: string | null; teach?: string | null }): string {
  const text = `${lesson.guessPrompt ?? ""}\u0000${lesson.teach ?? ""}`;
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}:${(h >>> 0).toString(36)}`;
}

// Returns the snapshot only if it is well-formed, fresh, and belongs to the
// lesson currently loaded. Anything else returns null (start at "guess").
export function parseSnapshot(raw: string | null, currentLessonKey: string, now: number): LessonSnapshot | null {
  if (!raw) return null;
  let s: unknown;
  try {
    s = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.step !== "string" || !RESUMABLE.includes(o.step)) return null;
  if (o.lessonKey !== currentLessonKey) return null;
  if (typeof o.savedAt !== "number" || now - o.savedAt > SNAPSHOT_MAX_AGE_MS || o.savedAt > now + 60_000) return null;
  const confidence =
    typeof o.confidence === "number" && o.confidence >= 1 && o.confidence <= 5 ? o.confidence : null;
  return {
    v: 1,
    step: o.step as ResumableStep,
    guess: typeof o.guess === "string" ? o.guess : "",
    guessFeedback: typeof o.guessFeedback === "string" ? o.guessFeedback : null,
    confidence,
    lessonKey: currentLessonKey,
    savedAt: o.savedAt,
  };
}

// "guess" has nothing worth saving and "done" means the objective is
// finished, so reopening it should start a fresh attempt -- both clear.
export function isResumable(step: string): step is ResumableStep {
  return RESUMABLE.includes(step);
}
