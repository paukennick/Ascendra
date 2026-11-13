// REQ-252 (levels phase 1A): the pure rules behind learner levels, so they
// run under `tsx --test` with no database. lib/learner-level.ts does the
// reads and writes; the app mirrors the wording in
// mobile/src/lib/learnerLevel.ts.
//
// Design: "Teaching learners at every level" (2026-11-12), with Nick's
// decisions of that day:
//   - three levels, a dial behind the scenes, shown as plain names
//     (New, Some background, Experienced) the learner can see and change;
//   - per course, with optional per-unit overrides (a unit reads its own
//     level and falls back to the course's);
//   - level changes are AUTOMATIC as mastery is gained, each with a short
//     notice and an undo -- never silent;
//   - ONE mastery bar for everyone: a level changes the path, never the
//     solo check or the mastery rule.

export const LEVELS = ["new", "some", "experienced"] as const;
export type Level = (typeof LEVELS)[number];

// The per-course goal question (approved by Nick 2026-11-10). The wording is
// the app's (mobile/src/lib/learnerLevel.ts GOAL_CHOICES).
export const COURSE_GOALS = ["work", "current", "program", "career_change", "interest"] as const;
export type CourseGoal = (typeof COURSE_GOALS)[number];

// REQ-255 (Nick, 2026-11-12: ask the goal when the learner picks a course,
// not later): where the goal question was answered, skipped or dismissed.
//   intake    the first course, chosen in the welcome steps (next to the
//             account's experience question)
//   start     the sheet "Start course" opens on a course not asked yet
//   lesson    the one-tap card above the first lesson opened in a course
//             not asked yet (the fallback)
//   settings  the course's level settings ("Change" on the course page)
// REQ-252 builds still installed ask on the course page and send no `via`.
// Recorded in course_goal_set's detail only; nothing else reads it.
export const GOAL_VIA = ["intake", "start", "lesson", "settings"] as const;
export type GoalVia = (typeof GOAL_VIA)[number];
export function isGoalVia(v: unknown): v is GoalVia {
  return typeof v === "string" && (GOAL_VIA as readonly string[]).includes(v);
}

// What became of the question, in course_goal_set's detail: answered (a goal
// was saved or changed), skipped ("Skip for now" on the start sheet, or the
// REQ-252 panel's skip) or dismissed ("Not now" on the lesson card). Skipped
// and dismissed both count as asked (learner_course_profiles.answered_at),
// so the question is not put to the learner again; the course page and the
// level settings keep a "Change" for later.
export const GOAL_OUTCOMES = ["answered", "skipped", "dismissed"] as const;
export type GoalOutcome = (typeof GOAL_OUTCOMES)[number];

// The account intake's experience answer (REQ-169, lib/intake.ts).
export type AccountExperience = "new" | "some" | "experienced" | "retake";

export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}
export function isCourseGoal(v: unknown): v is CourseGoal {
  return typeof v === "string" && (COURSE_GOALS as readonly string[]).includes(v);
}

// Design section 3, "How the level is set", step 1:
//   getting into the field / changing careers, or out of interest -> New
//   in a program or studying for the exam now                     -> Some background
//   uses this at work, or staying current                          -> Experienced
export const GOAL_LEVEL: Record<CourseGoal, Level> = {
  work: "experienced",
  current: "experienced",
  program: "some",
  career_change: "new",
  interest: "new",
};

// "Retaking" is Experienced plus an exam date, not a fourth level (design 3).
export const EXPERIENCE_LEVEL: Record<AccountExperience, Level> = {
  new: "new",
  some: "some",
  experienced: "experienced",
  retake: "experienced",
};

// With neither answer, today's lesson: Some background.
export const DEFAULT_LEVEL: Level = "some";

export type SuggestionReason = "experience" | "goal" | "none";

// The starting suggestion. The experience answer wins when the two disagree
// ("a career changer who says Some experience is Some background").
export function suggestedLevel(
  goal: CourseGoal | null,
  experience: AccountExperience | null
): { level: Level; reason: SuggestionReason } {
  if (experience && EXPERIENCE_LEVEL[experience]) return { level: EXPERIENCE_LEVEL[experience], reason: "experience" };
  if (goal && GOAL_LEVEL[goal]) return { level: GOAL_LEVEL[goal], reason: "goal" };
  return { level: DEFAULT_LEVEL, reason: "none" };
}

// The level a lesson in this unit uses: the unit's override, else the
// course's, else the suggestion.
export function effectiveLevel(unitLevel: Level | null, courseLevel: Level | null, suggestion: Level): Level {
  return unitLevel ?? courseLevel ?? suggestion;
}

// ---------------------------------------------------------------------------
// Moving up from mastery evidence (design 3, "Evidence from answers").
//
// Over the learner's most recent LEVEL_UP_WINDOW objectives in a unit, the
// FIRST solo answer on each (the lesson's solo check, kind 'lesson', stage
// 'solo', not voided): when at least LEVEL_UP_MIN_FIRST_TRY_CORRECT of them
// were correct without a hint, the unit moves up one level. Only answers
// given after the unit's last level change count, so an undo (or the
// learner's own change) is never overridden by the evidence it already saw.
// Moving down is the learner's choice; nothing moves down on its own.
// ---------------------------------------------------------------------------
export const LEVEL_UP_WINDOW = 5;
export const LEVEL_UP_MIN_FIRST_TRY_CORRECT = 4;

export interface FirstTry {
  verdict: string;
  assisted: boolean;
}

export function firstTryStrong(t: FirstTry): boolean {
  return t.verdict === "correct" && !t.assisted;
}

// `recent` is newest first; only the first LEVEL_UP_WINDOW are read, and a
// window that is not yet full never moves anyone.
export function meetsLevelUp(recent: FirstTry[]): boolean {
  const window = recent.slice(0, LEVEL_UP_WINDOW);
  if (window.length < LEVEL_UP_WINDOW) return false;
  return window.filter(firstTryStrong).length >= LEVEL_UP_MIN_FIRST_TRY_CORRECT;
}

export function levelAbove(level: Level): Level | null {
  if (level === "new") return "some";
  if (level === "some") return "experienced";
  return null;
}

// ---------------------------------------------------------------------------
// REQ-256 (Nick, 2026-11-12): the downward counterpart, as a SUGGESTION.
// Never automatic: the lesson asks "This unit seems tougher than expected.
// Want more step-by-step help here?" with Yes (the unit moves down one
// level, recorded so Undo works) and Not now (snoozed for that unit for
// LEVEL_DOWN_SNOOZE_DAYS). Design section 3: "3 of the last 5 missed, or
// every guess off". Asked at the same moment as the level-up check, only
// when nothing moved up, never below New, at most once per unit per
// LEVEL_DOWN_SNOOZE_DAYS, and only on a course whose lessons change by level
// (subject_tracks.level_flow) -- elsewhere "more step-by-step help" would
// change nothing, so it is not offered.
//
// The evidence is the same as the move up: the first lesson solo answer on
// each of the learner's most recent LEVEL_DOWN_WINDOW objectives in the unit,
// after the unit's last level change. A miss is an incorrect or partial
// verdict (an assisted right answer is not a miss; an ungraded one is
// neither). The guesses are the latest typed guess per objective
// (learner_events guess_matched, the model's guessMatch, migration 080) in
// the same window; "every guess off" needs at least LEVEL_DOWN_MIN_GUESSES of
// them, so one off guess is never "every guess".
// The app mirrors these numbers (mobile/src/lib/learnerLevel.ts) and a test
// in each package pins them.
// ---------------------------------------------------------------------------
export const LEVEL_DOWN_WINDOW = 5;
export const LEVEL_DOWN_MIN_MISSED = 3;
export const LEVEL_DOWN_MIN_GUESSES = 3;
export const LEVEL_DOWN_SNOOZE_DAYS = 7;

export type GuessMatch = "close" | "partial" | "off";
export const GUESS_MATCHES: readonly GuessMatch[] = ["close", "partial", "off"];
export function isGuessMatch(v: unknown): v is GuessMatch {
  return typeof v === "string" && (GUESS_MATCHES as readonly string[]).includes(v);
}

export function firstTryMissed(t: FirstTry): boolean {
  return t.verdict === "incorrect" || t.verdict === "partial";
}

export type LevelDownWhy = "missed" | "guesses";

// `recent` and `guesses` are newest first; only the first LEVEL_DOWN_WINDOW
// of each are read. Misses are checked first (the stronger signal).
export function meetsLevelDown(recent: FirstTry[], guesses: GuessMatch[]): LevelDownWhy | null {
  const window = recent.slice(0, LEVEL_DOWN_WINDOW);
  if (window.filter(firstTryMissed).length >= LEVEL_DOWN_MIN_MISSED) return "missed";
  const g = guesses.slice(0, LEVEL_DOWN_WINDOW);
  if (g.length >= LEVEL_DOWN_MIN_GUESSES && g.every((m) => m === "off")) return "guesses";
  return null;
}

export function levelBelow(level: Level): Level | null {
  if (level === "experienced") return "some";
  if (level === "some") return "new";
  return null;
}

// At most one suggestion per unit per LEVEL_DOWN_SNOOZE_DAYS, counted from
// the latest suggestion or "Not now" for that unit.
export function suggestionDue(lastAskedOrDeclined: Date | null, now: Date = new Date()): boolean {
  if (!lastAskedOrDeclined) return true;
  return now.getTime() - lastAskedOrDeclined.getTime() >= LEVEL_DOWN_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// REQ-256: REQ-255's lesson goal card stops after it has been shown in
// GOAL_CARD_MAX_SHOWINGS lessons without an answer or "Not now". The next
// lesson records it dismissed the way "Not now" is (course_goal_set, outcome
// dismissed, via lesson) with reason "auto", and shows nothing. A showing is
// counted once per lesson (objective), on the server, so a reinstall or a
// cleared device does not reset it and reopening the same lesson is not a
// second showing.
// ---------------------------------------------------------------------------
export const GOAL_CARD_MAX_SHOWINGS = 2;

export function goalCardDecision(answered: boolean, lessonsShown: number, shownInThisLesson: boolean): "hide" | "show" | "auto_dismiss" {
  if (answered) return "hide";
  if (shownInThisLesson) return "show";
  if (lessonsShown >= GOAL_CARD_MAX_SHOWINGS) return "auto_dismiss";
  return "show";
}

// ---------------------------------------------------------------------------
// Measurement (design 8, phase 1): the lesson events the app may post, and
// the only detail each may carry. Never answer text; the detail is built here
// from a fixed list of keys and values, whatever the request held.
// ---------------------------------------------------------------------------
export const LESSON_EVENTS = [
  "guess_shown",
  "guess_answered",
  "guess_skipped",
  "teach_card_viewed",
  "guided_skipped",
  "lesson_step_reached",
  // For the primers builder's "Key terms" button (REQ-252 / migration 079):
  // opened, and closed with the seconds it stayed open.
  "key_terms_opened",
  "key_terms_closed",
] as const;
export type LessonEvent = (typeof LESSON_EVENTS)[number];

export function isLessonEvent(v: unknown): v is LessonEvent {
  return typeof v === "string" && (LESSON_EVENTS as readonly string[]).includes(v);
}

const GUESS_KINDS = ["option", "no_idea", "typed"] as const;
const STEPS = ["guess", "teach", "fade", "solo", "lab", "done"] as const;
export const MAX_EVENT_SECONDS = 3600;
export const MAX_EVENT_CARD = 9;

export interface LessonEventDetail {
  level?: Level;
  flow?: boolean;
  kind?: (typeof GUESS_KINDS)[number];
  seconds?: number;
  card?: number;
  step?: (typeof STEPS)[number];
}

const intIn = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : undefined;

export function lessonEventDetail(raw: unknown): LessonEventDetail {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d: LessonEventDetail = {};
  if (isLevel(r.level)) d.level = r.level;
  if (typeof r.flow === "boolean") d.flow = r.flow;
  if (typeof r.kind === "string" && (GUESS_KINDS as readonly string[]).includes(r.kind)) d.kind = r.kind as LessonEventDetail["kind"];
  const seconds = intIn(r.seconds, 0, MAX_EVENT_SECONDS);
  if (seconds !== undefined) d.seconds = seconds;
  const card = intIn(r.card, 0, MAX_EVENT_CARD);
  if (card !== undefined) d.card = card;
  if (typeof r.step === "string" && (STEPS as readonly string[]).includes(r.step)) d.step = r.step as LessonEventDetail["step"];
  return d;
}
