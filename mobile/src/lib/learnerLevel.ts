// REQ-252 (levels phase 1A): the pure, testable half of learner levels in
// the app -- the wording of the goal question and the levels, the
// level-aware lesson flow (switched on per course; Python and JavaScript in
// phase 1), the one-tap hunch, and the progress signals for newer learners:
// the mastery ladder, "You can now...", before/after and comeback credit.
// The server owns the goal, the level and the level changes
// (GET/PUT /api/courses/:id/level, backend/lib/learner-level.ts).
//
// Nick, 2026-11-12: levels are a dial behind the scenes, shown as plain
// names the learner can see and change. Level changes are automatic as
// mastery is gained, each with a short notice and an Undo. ONE mastery bar for
// everyone: newer learners get more rungs and visible progress on the way.
// No points, confetti or leaderboards.

import type { CheckState, Hunch, TeachState } from "./lessonProgress.ts";
import { fadingPlan, type FadingPlan, type GuessMatch, type LearnerHistory } from "./lessonExperience.ts";

export type Level = "new" | "some" | "experienced";
export type CourseGoal = "work" | "current" | "program" | "career_change" | "interest";

export const LEVELS: Level[] = ["new", "some", "experienced"];

export const LEVEL_NAMES: Record<Level, string> = {
  new: "New",
  some: "Some background",
  experienced: "Experienced",
};

// The per-course goal question, worded as Nick approved it (2026-11-10).
export const GOAL_QUESTION = "Why are you taking this course?";
export const GOAL_CHOICES: Array<{ id: CourseGoal; label: string }> = [
  { id: "work", label: "I use this at work regularly" },
  { id: "current", label: "I'm staying current or keeping a credential" },
  { id: "program", label: "I'm in a program or studying for the exam now" },
  { id: "career_change", label: "I'm getting into this field or changing careers" },
  { id: "interest", label: "I'm learning out of interest" },
];

// The self-rating on the same screen: concrete descriptions rather than
// labels (design section 3), with the suggestion pre-selected.
export const RATING_QUESTION = "Which sounds most like you?";
const RATINGS: Record<string, Record<Level, string>> = {
  PYTHON: {
    new: "I've never written code",
    some: "I've written small scripts",
    experienced: "I write code at work",
  },
  JAVASCRIPT: {
    new: "I've never written code",
    some: "I've built small pages or scripts",
    experienced: "I write JavaScript at work",
  },
};
const GENERIC_RATING: Record<Level, string> = {
  new: "This is new to me",
  some: "I've studied it or use parts of it",
  experienced: "I work in this area or passed a related exam",
};

export function ratingChoices(trackCode: string | null | undefined): Array<{ id: Level; label: string }> {
  const r = (trackCode && RATINGS[trackCode.toUpperCase()]) || GENERIC_RATING;
  return LEVELS.map((id) => ({ id, label: r[id] }));
}

// What each level changes in a lesson, said plainly. In a course without
// the level-aware flow yet, the level is saved but lessons are the same.
export function levelMeaning(level: Level, flow: boolean): string {
  if (!flow) return "Lessons in this course are the same at every level for now. Your level is saved for when that changes.";
  if (level === "new") return "A quick one-tap hunch to start, and the full worked example before guided practice.";
  if (level === "experienced") return "Guided practice is optional: you can go straight to the solo check.";
  return "The standard lesson: a typed guess, the explanation, guided practice, then the solo check.";
}

export const SAME_BAR_NOTE =
  "Your level changes how a lesson gets you there, never what counts: the solo check and the mastery rules are the same for everyone.";

export const AUTO_LEVEL_NOTE =
  "Your level moves up on its own as your answers show it, one unit at a time. You'll always see a note with Undo.";

export const CHIP_HINT = "Changes your level for this course or one unit";

export function chipLabel(level: Level): string {
  return `Level: ${LEVEL_NAMES[level]}`;
}

export interface UnitLevelView {
  unitId: string;
  title: string;
  level: Level | null;
  source: "self" | "auto" | null;
}

export interface LevelChange {
  id: string;
  unitId: string | null;
  unitTitle: string | null;
  fromLevel: Level;
  toLevel: Level;
  reason: "learner" | "mastery";
  createdAt: string;
}

export interface LevelState {
  trackId: string;
  trackCode: string;
  levelFlow: boolean;
  answered: boolean;
  goal: CourseGoal | null;
  courseLevel: Level | null;
  courseLevelSource: "default" | "self" | "auto" | null;
  suggestion: { level: Level; reason: "experience" | "goal" | "none" };
  units: UnitLevelView[];
  effective: Level;
  notices: LevelChange[];
}

const isLevel = (v: unknown): v is Level => v === "new" || v === "some" || v === "experienced";
const isGoal = (v: unknown): v is CourseGoal => GOAL_CHOICES.some((g) => g.id === v);

function parseChange(v: unknown): LevelChange | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  if (typeof c.id !== "string" || !isLevel(c.fromLevel) || !isLevel(c.toLevel)) return null;
  return {
    id: c.id,
    unitId: typeof c.unitId === "string" ? c.unitId : null,
    unitTitle: typeof c.unitTitle === "string" ? c.unitTitle : null,
    fromLevel: c.fromLevel,
    toLevel: c.toLevel,
    reason: c.reason === "learner" ? "learner" : "mastery",
    createdAt: typeof c.createdAt === "string" ? c.createdAt : "",
  };
}

export function parseLevelChange(v: unknown): LevelChange | null {
  return parseChange(v);
}

// The server's answer, or null when it is not one (an older server, a junk body).
export function parseLevelState(data: unknown): LevelState | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!isLevel(d.effective) || !d.suggestion || typeof d.suggestion !== "object") return null;
  const sug = d.suggestion as Record<string, unknown>;
  if (!isLevel(sug.level)) return null;
  return {
    trackId: typeof d.trackId === "string" ? d.trackId : "",
    trackCode: typeof d.trackCode === "string" ? d.trackCode : "",
    levelFlow: d.levelFlow === true,
    answered: d.answered === true,
    goal: isGoal(d.goal) ? d.goal : null,
    courseLevel: isLevel(d.courseLevel) ? d.courseLevel : null,
    courseLevelSource:
      d.courseLevelSource === "default" || d.courseLevelSource === "self" || d.courseLevelSource === "auto" ? d.courseLevelSource : null,
    suggestion: {
      level: sug.level,
      reason: sug.reason === "experience" || sug.reason === "goal" ? sug.reason : "none",
    },
    units: Array.isArray(d.units)
      ? (d.units as Array<Record<string, unknown>>)
          .filter((u) => u && typeof u.unitId === "string")
          .map((u) => ({
            unitId: u.unitId as string,
            title: typeof u.title === "string" ? u.title : "",
            level: isLevel(u.level) ? u.level : null,
            source: u.source === "self" || u.source === "auto" ? u.source : null,
          }))
      : [],
    effective: d.effective,
    notices: Array.isArray(d.notices) ? d.notices.map(parseChange).filter((c): c is LevelChange => !!c) : [],
  };
}

// The suggested self-rating for a goal picked on the start screen, mirroring
// the server (backend/lib/learner-level-rules.ts suggestedLevel): the account
// experience answer wins; otherwise the goal decides; otherwise Some background.
const GOAL_LEVEL: Record<CourseGoal, Level> = {
  work: "experienced",
  current: "experienced",
  program: "some",
  career_change: "new",
  interest: "new",
};
export function suggestionFor(goal: CourseGoal | null, state: Pick<LevelState, "suggestion">): Level {
  if (state.suggestion.reason === "experience") return state.suggestion.level;
  if (goal) return GOAL_LEVEL[goal];
  return state.suggestion.level;
}

// The short notice after an automatic move up (never silent; Undo beside it).
// It names the unit and the evidence; with the level-aware flow on, what
// changes in its lessons.
export function levelChangeNotice(change: LevelChange, flow: boolean): string {
  const where = change.unitTitle ? `"${change.unitTitle}"` : "this unit";
  const base = `You got 4 of your last 5 solo checks in ${where} right on the first try without a hint, so it's now ${LEVEL_NAMES[change.toLevel]}.`;
  if (!flow) return base;
  if (change.toLevel === "experienced") return `${base} Guided practice is optional there now.`;
  if (change.toLevel === "some") return `${base} Its lessons now start with a typed guess.`;
  return base;
}

// ---------------------------------------------------------------------------
// The level-aware lesson flow. Only where the course has it switched on;
// otherwise every learner gets today's lesson. Some background is unchanged.
// Solo is the same for everyone.
// ---------------------------------------------------------------------------
export interface LessonFlow {
  oneTapHunch: boolean;
  fullExampleFirst: boolean;
  offerSkipGuided: boolean;
}

export const STANDARD_FLOW: LessonFlow = { oneTapHunch: false, fullExampleFirst: false, offerSkipGuided: false };

export function lessonFlowFor(level: Level | null, flowOn: boolean): LessonFlow {
  if (!flowOn || !level) return STANDARD_FLOW;
  if (level === "new") return { oneTapHunch: true, fullExampleFirst: true, offerSkipGuided: false };
  if (level === "experienced") return { oneTapHunch: false, fullExampleFirst: false, offerSkipGuided: true };
  return STANDARD_FLOW;
}

// The Guided suggestion with the level applied on top of fadingPlan
// (REQ-106): New sees the full worked example before Guided by default,
// Experienced is offered "Skip guided" by default. Still never forced.
export function levelFadingPlan(
  flow: LessonFlow,
  input: { guessed: boolean; guessMatch: GuessMatch | null; history: LearnerHistory | null }
): FadingPlan {
  if (flow.fullExampleFirst) return "full-example";
  if (flow.offerSkipGuided) return "offer-skip";
  return fadingPlan(input);
}

// Why "Skip guided" is offered: the existing note speaks of a close guess and
// past results, which is not why an Experienced learner sees it.
export const SKIP_GUIDED_LEVEL_NOTE =
  "You're studying this at Experienced, so guided practice is optional. The solo check is still where your level is earned.";
export const FULL_EXAMPLE_LEVEL_NOTE = "Here's the full worked example, every step, before you try one with a step missing.";

// ---------------------------------------------------------------------------
// The one-tap hunch (Nick, 2026-11-12: shortened for New, not skipped, and
// worded so it doesn't feel like a quiz). Its options come from the lesson
// content that already exists: the Guided item's question and its choices
// (a prediction on the very item practised after the teaching -- the
// prequestion effect is on the item asked). A lesson that someday carries a
// hunch of its own (`guessChoices`, not generated yet) would use that
// instead. With neither -- the practice half still generating -- the typed
// guess is shown as before.
// ---------------------------------------------------------------------------
export interface HunchQuestion {
  source: Exclude<Hunch, "no_idea">;
  prompt: string;
  choices: string[];
}

const usableChoices = (c: unknown): c is string[] =>
  Array.isArray(c) && c.length >= 3 && c.length <= 4 && c.every((x) => typeof x === "string" && x.trim().length > 0);

export function hunchQuestion(lesson: {
  guessPrompt?: string | null;
  guessChoices?: unknown;
  fadeProblem?: string | null;
  fadeChoices?: unknown;
}): HunchQuestion | null {
  if (lesson.guessPrompt && usableChoices(lesson.guessChoices)) {
    return { source: "lesson", prompt: lesson.guessPrompt, choices: lesson.guessChoices };
  }
  if (lesson.fadeProblem && usableChoices(lesson.fadeChoices)) {
    return { source: "guided", prompt: lesson.fadeProblem, choices: lesson.fadeChoices };
  }
  return null;
}

export const HUNCH_TITLE = "What's your hunch?";
export const HUNCH_INTRO = "One tap, no score. A quick hunch before the lesson helps it stick, right or wrong.";
export const NO_IDEA = "No idea yet";
export const JUST_TEACH_ME = "Just teach me";

// One line back, never a verdict: the hunch has no answer key on the device
// and nothing about it is graded or recorded as an answer.
export function hunchFeedback(hunch: Hunch): string {
  if (hunch === "no_idea") return "Fair enough. That's what the next few minutes are for.";
  if (hunch === "guided") return "Noted. Guided practice asks this same question after the lesson, so you'll see how your hunch holds up.";
  return "Noted. Keep it in mind as you read; you'll see how it holds up.";
}

// ---------------------------------------------------------------------------
// The mastery ladder (Nick, 2026-11-12, progress signal 1). Five rungs per
// objective, from evidence that already exists. Mastered and Kept are
// exactly today's statuses (Independent or above; Transfer-ready). The
// lower rungs come from this lesson's own small checks, so a newer learner
// sees a rung fill after each one. A higher rung fills every rung under it.
// ---------------------------------------------------------------------------
export const LADDER = ["Seen", "Understood", "Practiced", "Mastered", "Kept"] as const;
export type Rung = (typeof LADDER)[number];

export const RUNG_MEANING: Record<Rung, string> = {
  Seen: "You've opened the lesson and reached the explanation.",
  Understood: "You explained a step, or got the guided question at least partly right.",
  Practiced: "You got a guided or solo question right.",
  Mastered: "Independent: right on your own, and right again on a later day.",
  Kept: "Transfer-ready: still right after more time has passed, in more than one format.",
};

export interface LadderInput {
  status: string | null; // the mastery status from the server, when known
  reachedTeach: boolean;
  explainDone: boolean;
  guidedVerdict: string | null;
  soloVerdict: string | null;
}

export interface Ladder {
  filled: number; // 0..5
  rungs: Array<{ name: Rung; filled: boolean }>;
  note: string | null;
}

const okish = (v: string | null) => v === "correct" || v === "partial";

export function ladderFor(i: LadderInput): Ladder {
  const status = i.status ?? "Not started";
  let top = -1;
  if (i.reachedTeach || (status !== "Not started")) top = 0;
  if (i.explainDone || okish(i.guidedVerdict) || okish(i.soloVerdict)) top = 1;
  if (status === "Guided" || i.guidedVerdict === "correct" || i.soloVerdict === "correct") top = 2;
  if (status === "Independent") top = 3;
  if (status === "Transfer-ready") top = 4;
  // Guided/Independent/Transfer-ready never read below Practiced.
  if ((status === "Guided" || status === "Independent" || status === "Transfer-ready") && top < 2) top = 2;
  const filled = top + 1;
  let note: string | null = null;
  if (status === "Needs review") note = "Due for review: answer it again to keep it.";
  else if (filled === 3 && i.soloVerdict === "correct") note = "Mastered takes one more right answer on your own, a day or more from now.";
  return { filled, rungs: LADDER.map((name, k) => ({ name, filled: k < filled })), note };
}

export function ladderAnnouncement(l: Ladder): string {
  return l.filled === 0 ? "Progress: not started" : `Progress: ${LADDER[l.filled - 1]}, ${l.filled} of ${LADDER.length}`;
}

// ---------------------------------------------------------------------------
// "You can now..." (progress signal 2): one concrete sentence after the
// objective, from its title, with no model call. Shown only after a correct
// solo answer, and it says so when that answer used a hint.
// ---------------------------------------------------------------------------
const ACTION_VERBS = new Set(
  (
    "analyze apply assess build calculate choose classify compare configure construct create debug define deploy describe design " +
    "determine diagnose differentiate distinguish document estimate evaluate explain identify implement install interpret list manage " +
    "monitor perform plan predict prioritize read recognize recommend select summarize test trace troubleshoot use validate write"
  ).split(" ")
);
const PROPER = new Set(["python", "javascript", "java", "linux", "windows", "azure", "aws", "kubernetes", "docker", "google", "microsoft", "git", "sql", "node"]);

function lowerFirst(text: string): string {
  const first = text.split(/[\s,:(]/)[0];
  if (!/^[A-Z][a-z]+$/.test(first) || PROPER.has(first.toLowerCase())) return text;
  return text[0].toLowerCase() + text.slice(1);
}

// The objective's topic in a few words: the part before a colon, or before a
// parenthesis, without a trailing period.
export function topicOf(title: string): string {
  const t = title.trim().replace(/\.$/, "");
  const cut = t.split(/:|\s\(/)[0].trim();
  return lowerFirst(cut || t);
}

export function canDoSentence(title: string, opts: { hinted?: boolean } = {}): string {
  const t = title.trim().replace(/\.$/, "");
  const first = t.split(/\s/)[0].toLowerCase();
  const tail = opts.hinted ? " with a hint for now. Next time, try it without one." : " on your own.";
  if (ACTION_VERBS.has(first)) {
    const rest = t.slice(first.length).trim();
    return `You can now ${first} ${lowerFirst(rest)}${opts.hinted ? tail : "."}`;
  }
  return `You can now explain ${topicOf(t)} and answer a question on it${tail}`;
}

// ---------------------------------------------------------------------------
// Before / after (progress signal 3): the first guess beside the answer now,
// from what the lesson already keeps (the guess and the graded checks, saved
// with the position). The hunch on the Guided item is compared with the
// Guided answer -- the same question -- and anything else with the solo
// answer when it was written out.
// ---------------------------------------------------------------------------
export interface BeforeAfter {
  before: string;
  now: string;
  nowLabel: string;
  verdict: string | null;
}

export function beforeAfter(input: {
  guess: string;
  teach: Pick<TeachState, "hunch">;
  guided: CheckState | undefined;
  solo: CheckState | undefined;
  guidedChoices: string[] | null | undefined;
}): BeforeAfter | null {
  const before = input.teach.hunch === "no_idea" ? NO_IDEA : input.guess.trim();
  if (!before) return null;
  const g = input.guided;
  const guidedPick =
    g?.result && g.mode === "mc" && g.picked != null && input.guidedChoices?.[g.picked] ? input.guidedChoices[g.picked] : null;
  if (input.teach.hunch === "guided" && guidedPick) {
    return { before, now: guidedPick, nowLabel: "Your guided answer", verdict: g!.result!.verdict };
  }
  const s = input.solo;
  if (s?.result && s.mode === "open" && s.openAnswer.trim()) {
    return { before, now: s.openAnswer.trim(), nowLabel: "Your solo answer", verdict: s.result.verdict };
  }
  if (guidedPick) return { before, now: guidedPick, nowLabel: "Your guided answer", verdict: g!.result!.verdict };
  return null;
}

// ---------------------------------------------------------------------------
// Comeback credit (progress signal 5): specific to the task, never generic
// praise. Only when a miss was followed by a right answer in this lesson.
// ---------------------------------------------------------------------------
const missed = (v: string | null | undefined) => v === "incorrect" || v === "partial";

export function comebackLine(input: {
  title: string;
  guided: CheckState | undefined;
  solo: CheckState | undefined;
  soloRetried: boolean;
}): string | null {
  const topic = topicOf(input.title);
  const solo = input.solo?.result;
  if (solo?.verdict === "correct") {
    const how = solo.assistReason === "hint" ? "with a hint" : "on your own";
    if (missed(input.solo?.firstResult?.verdict)) {
      return `Your first solo answer on ${topic} missed something. You revised it and got it right.`;
    }
    if (input.soloRetried) return `Your first solo answer on ${topic} missed. You came back and got it right ${how}.`;
    if (missed(input.guided?.firstResult?.verdict ?? input.guided?.result?.verdict)) {
      return `You missed the guided question on ${topic}, then got the solo check right ${how}.`;
    }
    return null;
  }
  const g = input.guided;
  if (g?.result?.verdict === "correct" && missed(g.firstResult?.verdict)) {
    return `You revised your guided answer on ${topic} after a miss and got it right.`;
  }
  return null;
}
