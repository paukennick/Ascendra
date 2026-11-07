// Mid-lesson position (which step of guess/teach/fade/solo the learner is
// on, plus their guess and confidence) used to live only in React state on
// the lesson screen. Leaving the lesson -- back to the course dashboard,
// the sidebar, the review queue -- unmounts that screen, so reopening the
// objective always restarted at "guess". Graded attempts were never lost
// (they're saved server-side by /api/grade), but the learner's place was.
//
// This module is the pure half of the fix: the storage key, what gets
// saved, and the rules for whether a saved snapshot may be resumed. The
// lesson screen does the reads/writes.
//
// REQ-089: the position is saved to the account (GET/PUT/DELETE
// /api/objectives/:id/progress) so it follows the learner across devices,
// with a device copy kept as the offline fallback. It also carries each
// graded check's state, so answering and then leaving before "Continue"
// brings back the verdict instead of asking again.

export type ResumableStep = "teach" | "fade" | "solo";
export type CheckKind = "fade" | "solo";

export interface CheckResult {
  verdict: string;
  feedback: string;
  missedParts: string[];
}

// Everything a Guided/Solo check needs to come back exactly as it was.
// clientAttemptId is sent with the graded answer so the server can tell a
// retry from a new attempt (see /api/grade).
export interface CheckState {
  mode: "mc" | "open";
  picked: number | null;
  openAnswer: string;
  clientAttemptId: string | null;
  // The answer that clientAttemptId was sent with ("mc:2" or "open:<text>").
  sentSignature: string | null;
  result: CheckResult | null;
}

export interface LessonSnapshot {
  v: 2;
  step: ResumableStep;
  guess: string;
  guessFeedback: string | null;
  confidence: number | null;
  // Fingerprint of the lesson content the step belongs to. If the lesson
  // was regenerated since, resuming at "solo" would show a question the
  // learner was never taught, so a mismatch discards the snapshot.
  lessonKey: string;
  checks: Partial<Record<CheckKind, CheckState>>;
  savedAt: number;
}

export function emptyCheck(): CheckState {
  return { mode: "mc", picked: null, openAnswer: "", clientAttemptId: null, sentSignature: null, result: null };
}

// A snapshot older than this is treated as stale: after a week away the
// teach step is worth re-reading, and it keeps storage from accumulating.
export const SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const RESUMABLE: readonly string[] = ["teach", "fade", "solo"];

// Keyed by user as well, so two accounts on one device never see each
// other's place.
export function snapshotStorageKey(userId: string, objectiveId: string): string {
  return `ascendra.lessonProgress.${userId}.${objectiveId}`;
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
// Accepts either the device copy (a JSON string) or the server's record (an
// object, which has no `v`).
export function parseSnapshot(raw: unknown, currentLessonKey: string, now: number): LessonSnapshot | null {
  if (raw == null) return null;
  let s: unknown = raw;
  if (typeof raw === "string") {
    try {
      s = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  if (o.v !== undefined && o.v !== 2) return null;
  if (typeof o.step !== "string" || !RESUMABLE.includes(o.step)) return null;
  if (o.lessonKey !== currentLessonKey) return null;
  if (typeof o.savedAt !== "number" || now - o.savedAt > SNAPSHOT_MAX_AGE_MS || o.savedAt > now + 60_000) return null;
  const confidence =
    typeof o.confidence === "number" && o.confidence >= 1 && o.confidence <= 5 ? o.confidence : null;
  const checksIn = (o.checks && typeof o.checks === "object" ? o.checks : {}) as Record<string, unknown>;
  const checks: LessonSnapshot["checks"] = {};
  for (const k of ["fade", "solo"] as const) {
    const c = parseCheck(checksIn[k]);
    if (c) checks[k] = c;
  }
  return {
    v: 2,
    step: o.step as ResumableStep,
    guess: typeof o.guess === "string" ? o.guess : "",
    guessFeedback: typeof o.guessFeedback === "string" ? o.guessFeedback : null,
    confidence,
    lessonKey: currentLessonKey,
    checks,
    savedAt: o.savedAt,
  };
}

function parseCheck(v: unknown): CheckState | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const r = o.result as Record<string, unknown> | null | undefined;
  return {
    mode: o.mode === "open" ? "open" : "mc",
    picked: Number.isInteger(o.picked) && (o.picked as number) >= 0 ? (o.picked as number) : null,
    openAnswer: typeof o.openAnswer === "string" ? o.openAnswer : "",
    clientAttemptId: typeof o.clientAttemptId === "string" ? o.clientAttemptId : null,
    sentSignature: typeof o.sentSignature === "string" ? o.sentSignature : null,
    result:
      r && typeof r === "object" && typeof r.verdict === "string"
        ? {
            verdict: r.verdict,
            feedback: typeof r.feedback === "string" ? r.feedback : "",
            missedParts: Array.isArray(r.missedParts) ? r.missedParts.filter((p): p is string => typeof p === "string") : [],
          }
        : null,
  };
}

// The device copy and the account copy can disagree (offline edits, a
// second device). The most recently saved valid one wins.
export function newerSnapshot(a: LessonSnapshot | null, b: LessonSnapshot | null): LessonSnapshot | null {
  if (!a) return b;
  if (!b) return a;
  return b.savedAt > a.savedAt ? b : a;
}

// The id sent with a graded answer. Reused only while the answer is the
// same one that was already sent (a retry); any change to the answer is a
// new attempt and gets a new id.
export function answerSignature(mode: "mc" | "open", picked: number | null, openAnswer: string): string {
  return mode === "mc" ? `mc:${picked ?? ""}` : `open:${openAnswer.trim()}`;
}

export function attemptIdFor(
  check: Pick<CheckState, "clientAttemptId" | "sentSignature">,
  signature: string,
  makeId: () => string
): string {
  return check.clientAttemptId && check.sentSignature === signature ? check.clientAttemptId : makeId();
}

// "guess" has nothing worth saving and "done" means the objective is
// finished, so reopening it should start a fresh attempt -- both clear.
export function isResumable(step: string): step is ResumableStep {
  return RESUMABLE.includes(step);
}
