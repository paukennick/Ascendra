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

// REQ-106: Teach-step state (which card, the self-explanation answer, the
// guess-match signal). Lives here, beside the position it is saved with.
export type GuessMatch = "close" | "partial" | "off";

// Saved with the lesson position (device copy, and the account copy's
// existing checks jsonb). The self-explanation is never graded and never
// mastery evidence; it goes when the lesson is finished, like the rest of the
// position.
export interface TeachState {
  card: number;
  explain: string;
  explainDone: boolean;
  guessMatch: GuessMatch | null;
}

export const EMPTY_TEACH: TeachState = { card: 0, explain: "", explainDone: false, guessMatch: null };

const MAX_EXPLAIN = 2000;
const GUESS_MATCHES: readonly string[] = ["close", "partial", "off"];

export function parseTeachState(v: unknown): TeachState {
  if (!v || typeof v !== "object") return EMPTY_TEACH;
  const o = v as Record<string, unknown>;
  return {
    card: Number.isInteger(o.card) && (o.card as number) >= 0 && (o.card as number) < 10 ? (o.card as number) : 0,
    explain: typeof o.explain === "string" ? o.explain.slice(0, MAX_EXPLAIN) : "",
    explainDone: o.explainDone === true,
    guessMatch: typeof o.guessMatch === "string" && GUESS_MATCHES.includes(o.guessMatch) ? (o.guessMatch as GuessMatch) : null,
  };
}

export type CheckKind = "fade" | "solo";

export interface CheckResult {
  verdict: string;
  feedback: string;
  missedParts: string[];
  // REQ-097: the lesson payload has no answer key; these come back with the
  // verdict and are saved with it so a resumed check shows the same marks.
  // correctIndex is a position in the order the choices were shown.
  correctIndex?: number | null;
  correctAnswer?: string | null;
  why?: string | null;
  assistReason?: "hint" | "repeat" | "retry" | null;
  // REQ-105: one reason per option in the shown order (null for a lesson
  // cached before reasons existed), the grader's model answer and "what to
  // fix" line, and the attempt id a revision points at.
  optionReasons?: string[] | null;
  modelAnswer?: string | null;
  fixNext?: string | null;
  attemptId?: string | null;
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
  // REQ-105: the first, missed result once the learner chose to revise. Kept
  // so its feedback stays on screen while revising and after. Optional so
  // older saved positions (without it) still parse.
  firstResult?: CheckResult | null;
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
  // REQ-106. Optional so positions saved before it still parse. The account
  // copy stores it inside its checks jsonb (checks.teach).
  teach?: TeachState;
  savedAt: number;
}

// REQ-095: Solo is unassisted -- it starts in free response, and the choices
// are an explicit opt-in hint (mode "mc"). Guided keeps multiple choice first.
export function defaultMode(kind: CheckKind): CheckState["mode"] {
  return kind === "solo" ? "open" : "mc";
}

export function emptyCheck(kind: CheckKind = "fade"): CheckState {
  return { mode: defaultMode(kind), picked: null, openAnswer: "", clientAttemptId: null, sentSignature: null, result: null };
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
    const c = parseCheck(checksIn[k], k);
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
    teach: parseTeachState(o.teach ?? checksIn.teach),
    savedAt: o.savedAt,
  };
}

const ASSIST_REASONS = ["hint", "repeat", "retry"] as const;

function parseResult(r: Record<string, unknown> | null | undefined): CheckResult | null {
  if (!r || typeof r !== "object" || typeof r.verdict !== "string") return null;
  return {
    verdict: r.verdict,
    feedback: typeof r.feedback === "string" ? r.feedback : "",
    missedParts: Array.isArray(r.missedParts) ? r.missedParts.filter((p): p is string => typeof p === "string") : [],
    correctIndex: Number.isInteger(r.correctIndex) && (r.correctIndex as number) >= 0 ? (r.correctIndex as number) : null,
    correctAnswer: typeof r.correctAnswer === "string" ? r.correctAnswer : null,
    why: typeof r.why === "string" ? r.why : null,
    assistReason: (ASSIST_REASONS as readonly unknown[]).includes(r.assistReason)
      ? (r.assistReason as CheckResult["assistReason"])
      : null,
    optionReasons:
      Array.isArray(r.optionReasons) && r.optionReasons.every((x) => typeof x === "string")
        ? (r.optionReasons as string[])
        : null,
    modelAnswer: typeof r.modelAnswer === "string" ? r.modelAnswer : null,
    fixNext: typeof r.fixNext === "string" ? r.fixNext : null,
    attemptId: typeof r.attemptId === "string" ? r.attemptId : null,
  };
}

function parseCheck(v: unknown, kind: CheckKind): CheckState | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const r = o.result as Record<string, unknown> | null | undefined;
  const picked = Number.isInteger(o.picked) && (o.picked as number) >= 0 ? (o.picked as number) : null;
  const openAnswer = typeof o.openAnswer === "string" ? o.openAnswer : "";
  const hasResult = !!r && typeof r === "object" && typeof r.verdict === "string";
  // A Solo check saved before free response became its default, with nothing
  // answered yet, is just the old default: put it on the new one. Anything
  // answered or graded keeps the mode it was answered in.
  const untouched = !hasResult && picked === null && openAnswer === "";
  const mode: CheckState["mode"] =
    kind === "solo" && untouched ? "open" : o.mode === "open" ? "open" : o.mode === "mc" ? "mc" : defaultMode(kind);
  return {
    mode,
    picked,
    openAnswer,
    clientAttemptId: typeof o.clientAttemptId === "string" ? o.clientAttemptId : null,
    sentSignature: typeof o.sentSignature === "string" ? o.sentSignature : null,
    result: parseResult(r),
    firstResult: parseResult(o.firstResult as Record<string, unknown> | null | undefined),
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
  return mode === "mc" ? `mc:${picked ?? ""}` : `open:${openAnswer.trim().slice(0, OPEN_ANSWER_MAX)}`;
}

// REQ-098: the free-response input is capped at this length. The server
// stores openAnswer and sentSignature (which embeds the answer) cut at 8000
// characters, so an answer longer than that came back from the account copy
// with a signature that no longer matched -- and the resumed answer was sent
// under a new id, recording a second attempt. Capped here, both stay well
// under the server's limit, so what is signed is exactly what is stored.
export const OPEN_ANSWER_MAX = 4000;

// REQ-098: the account copy's savedAt is the server's clock. A phone clock
// more than a minute behind rejected it as "from the future" (parseSnapshot),
// and smaller skews could pick the older of the two copies. The server also
// sends ageMs (how long ago it was saved); this restates savedAt on the
// phone's clock. Older servers send no ageMs and the value is left as is.
export function toLocalClock(raw: unknown, now: number): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  if (typeof o.ageMs !== "number" || !Number.isFinite(o.ageMs) || o.ageMs < 0) return raw;
  return { ...o, savedAt: now - o.ageMs };
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

// REQ-101 (FAIL-091): resuming waited on the account copy with no limit, so
// a bad connection left the lesson on "Picking up where you left off..."
// until the request gave up. The device copy is used after this long; the
// account copy is still applied if it arrives later, is newer, and the
// learner hasn't moved yet (shouldAdoptLateServer).
export const RESUME_SERVER_WAIT_MS = 4000;

export type Settled<T> = { settled: true; value: T } | { settled: false; later: Promise<T> };

// Waits up to `ms` for `p`. Either way `p` keeps running; on a timeout the
// caller gets it back as `later`. `p` must not reject (callers catch first).
export function settleWithin<T>(p: Promise<T>, ms: number): Promise<Settled<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ settled: false, later: p }), ms);
    p.then((value) => {
      clearTimeout(timer);
      resolve({ settled: true, value });
    });
  });
}

// The learner-visible place in a lesson, compared to tell "nothing has moved
// since the restore" from a real change. guessFeedback is left out: it fills
// in on its own after a guess.
export interface Position {
  step: string;
  guess: string;
  confidence: number | null;
  checks: Partial<Record<CheckKind, CheckState>>;
  // REQ-106: moving between Teach cards or typing the self-explanation is a
  // move too, so the saved position remembers the card.
  teach: TeachState;
}

export const FRESH_POSITION: Position = { step: "guess", guess: "", confidence: null, checks: {}, teach: EMPTY_TEACH };

export function samePosition(a: Position, b: Position): boolean {
  return (
    a.step === b.step &&
    a.guess === b.guess &&
    a.confidence === b.confidence &&
    JSON.stringify(a.checks) === JSON.stringify(b.checks) &&
    // A position built without teach state (older callers) is at card 1.
    JSON.stringify(a.teach ?? EMPTY_TEACH) === JSON.stringify(b.teach ?? EMPTY_TEACH)
  );
}

// A late account copy replaces what was restored only if it is newer and
// the learner is still exactly where the restore put them.
export function shouldAdoptLateServer(
  late: LessonSnapshot | null,
  applied: LessonSnapshot | null,
  learnerMoved: boolean
): late is LessonSnapshot {
  if (!late || learnerMoved) return false;
  return !applied || late.savedAt > applied.savedAt;
}

// REQ-101 (FAIL-093): with no signed-in user the screen used to save under
// "anon". Those keys are never read back, so they are removed.
const ANON_PREFIX = "ascendra.lessonProgress.anon.";
export function anonSnapshotKeys(keys: readonly string[]): string[] {
  return keys.filter((k) => k.startsWith(ANON_PREFIX));
}
