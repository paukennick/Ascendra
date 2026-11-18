// REQ-332 (Nick, 2026-11-17 19:48 PT: "Is the give feedback only at the bottom
// of page? Doesn't seem helpful for reviewers for it to be there."): the
// floating Feedback button and its quick-note sheet -- the pure parts, so they
// run under node --test (no imports).
//
// Every signed-in screen gets a small Feedback button for reviewers and owners
// (src/components/ReviewerFab.tsx, mounted once in app/(app)/_layout.tsx). A
// tap opens a quick note that records where the reviewer was: the route and
// screen, the course, the unit and lesson, the question, the sim and its phase,
// the practice exam session and question number. Screens tell the button what
// they know (src/lib/reviewerFacts.ts); the route fills in the rest.
//
// The server keeps the same lists (backend/lib/reviewers-config.ts
// QUICK_TAGS, QUICK_CONTEXT_RULES; a backend test reads this file) and drops
// any context key it doesn't know.

export const QUICK_TAGS = ["inaccurate", "unrealistic", "unclear", "sensitive", "bug", "praise"] as const;
export type QuickTag = (typeof QUICK_TAGS)[number];
export const QUICK_TAG_LABEL: Record<QuickTag, string> = {
  inaccurate: "Inaccurate",
  unrealistic: "Unrealistic",
  unclear: "Unclear",
  sensitive: "Sensitive-topic concern",
  bug: "Bug",
  praise: "Praise",
};
export const QUICK_NOTE_MAX = 2000;
export const QUICK_NOTE_EMPTY = "Write a note before sending.";
export const FAB_LABEL = "Feedback";
export const FAB_A11Y_LABEL = "Reviewer feedback: send a quick note about this screen";
export const QUICK_NOTE_SENT = "Note sent. Thanks.";

export const ITEM_KINDS = ["lesson", "review", "exam", "quiz", "comparison", "lab", "pbq", "unit-check", "placement"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

// What a screen knows about where the reviewer is. Every field is optional;
// titles are for the line the sheet shows (the server resolves its own).
export interface ScreenFacts {
  trackId?: string | null;
  courseTitle?: string | null;
  unitId?: string | null;
  unitTitle?: string | null;
  objectiveId?: string | null;
  lessonTitle?: string | null;
  lessonStage?: string | null;
  item?: { kind: ItemKind; id?: string | null; position?: number | null } | null;
  sim?: { id: string; title?: string | null; runId?: string | null; phase?: string | null; phaseLabel?: string | null; tick?: number | null; clock?: string | null } | null;
  exam?: { sessionId: string; question: number; count: number } | null;
  lab?: { id: string; title?: string | null } | null;
}

// What the server stores in reviewer_feedback.context (ids, numbers, short labels).
export interface QuickContext {
  route?: string;
  screen?: string;
  unitId?: string;
  objectiveId?: string;
  lessonStage?: string;
  itemKind?: ItemKind;
  itemId?: string;
  itemPosition?: number;
  simRunId?: string;
  simPhase?: string;
  simPhaseLabel?: string;
  simTick?: number;
  simClock?: string;
  examSessionId?: string;
  examQuestion?: number;
  examQuestionCount?: number;
  labId?: string;
}

export interface QuickNotePayload {
  kind: "quick";
  note: string;
  tag: QuickTag | null;
  trackId: string | null;
  simId: string | null;
  context: QuickContext;
}

// ---------------------------------------------------------------------------
// Who sees the button, and where
// ---------------------------------------------------------------------------

function accessOf(user: { access?: unknown } | null | undefined): Record<string, unknown> | null {
  const a = user?.access;
  return a && typeof a === "object" ? (a as Record<string, unknown>) : null;
}

// Reviewers (a well-formed reviewer mark from /api/auth/me) and owners. Same
// rule as REQ-331's canGiveFeedback; the server checks again on every send.
export function canSeeFab(user: { access?: unknown } | null | undefined): boolean {
  const a = accessOf(user);
  if (!a) return false;
  if (a.level === "owner") return true;
  const r = a.reviewer;
  return !!r && typeof r === "object" && typeof (r as Record<string, unknown>).since === "string";
}

// Screens where the button stays away: the full form itself (it is already
// feedback), and the Terms prompt (nothing can be sent until it is accepted).
const NO_FAB = [/^\/feedback\/edit$/, /^\/agree$/];

export function fabOnRoute(pathname: string): boolean {
  const p = cleanPath(pathname);
  return !NO_FAB.some((re) => re.test(p));
}

// Timed screens get the compact, icon-only button.
const TIMED = [/^\/course\/[^/]+\/exam$/, /^\/course\/[^/]+\/sim\/[^/]+$/];
export function isTimedRoute(pathname: string): boolean {
  const p = cleanPath(pathname);
  return TIMED.some((re) => re.test(p));
}

function cleanPath(pathname: string): string {
  const p = (pathname || "/").split(/[?#]/)[0];
  return p.length > 1 ? p.replace(/\/+$/, "") : p || "/";
}

// ---------------------------------------------------------------------------
// The context
// ---------------------------------------------------------------------------

const SCREEN_NAMES: [RegExp, string][] = [
  [/^\/$/, "Home"],
  [/^\/course\/[^/]+$/, "Course page"],
  [/^\/course\/[^/]+\/lesson\/[^/]+$/, "Lesson"],
  [/^\/course\/[^/]+\/exam$/, "Practice exam"],
  [/^\/course\/[^/]+\/sim\/[^/]+$/, "Simulation"],
  [/^\/course\/[^/]+\/sims$/, "Simulations"],
  [/^\/course\/[^/]+\/lab\/[^/]+$/, "Lab"],
  [/^\/course\/[^/]+\/labs$/, "Labs"],
  [/^\/course\/[^/]+\/quiz$/, "Quiz me"],
  [/^\/course\/[^/]+\/compare$/, "Compare look-alikes"],
  [/^\/course\/[^/]+\/pbq$/, "PBQ simulator"],
  [/^\/course\/[^/]+\/chat$/, "Ask the coach"],
  [/^\/course\/[^/]+\/progress$/, "Mastery"],
  [/^\/course\/[^/]+\/history$/, "Answer history"],
  [/^\/course\/[^/]+\/explain\/[^/]+$/, "Explain it back"],
  [/^\/course\/[^/]+\/plan$/, "Study plan"],
  [/^\/course\/[^/]+\/level$/, "Your level"],
  [/^\/course\/[^/]+\/placement$/, "Placement check"],
  [/^\/course\/[^/]+\/outcome$/, "I took the exam"],
  [/^\/review$/, "Review"],
  [/^\/review-session$/, "Today's review"],
  [/^\/review-coverage$/, "Terms you know"],
  [/^\/unit-check$/, "Unit check"],
  [/^\/explore$/, "Explore courses"],
  [/^\/settings(\/.*)?$/, "Settings"],
  [/^\/account(\/.*)?$/, "Account"],
  [/^\/feedback$/, "Your feedback"],
  [/^\/plans$/, "Plans"],
  [/^\/support$/, "Support"],
  [/^\/release-notes$/, "Release notes"],
  [/^\/notice$/, "Before you start"],
  [/^\/welcome$/, "Welcome"],
];

export function screenName(pathname: string): string {
  const p = cleanPath(pathname);
  return SCREEN_NAMES.find(([re]) => re.test(p))?.[1] ?? "This screen";
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | null => (typeof v === "string" && v ? v : Array.isArray(v) && v[0] ? v[0] : null);

// The route's own ids, for when a screen hasn't said (or can't).
export function routeIds(pathname: string, params: Params = {}): { trackId: string | null; objectiveId: string | null; simId: string | null; labId: string | null; unitId: string | null } {
  const p = cleanPath(pathname);
  const seg = p.split("/").filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const inCourse = seg[0] === "course" && seg.length >= 2;
  return {
    trackId: inCourse ? seg[1] : one(params.trackId),
    objectiveId: inCourse && (seg[2] === "lesson" || seg[2] === "explain") ? seg[3] ?? null : null,
    simId: inCourse && seg[2] === "sim" ? seg[3] ?? null : null,
    labId: inCourse && seg[2] === "lab" ? seg[3] ?? null : null,
    unitId: one(params.unitId),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const set = <K extends keyof QuickContext>(c: QuickContext, k: K, v: QuickContext[K] | null | undefined) => {
  if (v !== null && v !== undefined && v !== "") c[k] = v;
};

// Everything the note will carry: the course and sim as their own fields
// (they link the row), the rest as context. A screen's facts win over the
// route's ids, except that facts about another course are ignored (a screen
// left behind in the stack must never label this one).
export function buildQuickContext(input: { pathname: string; params?: Params; facts?: ScreenFacts | null }): { trackId: string | null; simId: string | null; context: QuickContext } {
  const ids = routeIds(input.pathname, input.params);
  let f = input.facts ?? {};
  if (f.trackId && ids.trackId && f.trackId !== ids.trackId) f = {};
  const trackId = ids.trackId ?? f.trackId ?? null;
  const simId = f.sim?.id ?? ids.simId;
  const c: QuickContext = {};
  set(c, "route", cleanPath(input.pathname).slice(0, 200));
  set(c, "screen", screenName(input.pathname));
  set(c, "unitId", f.unitId ?? ids.unitId);
  set(c, "objectiveId", f.objectiveId ?? ids.objectiveId);
  set(c, "lessonStage", f.lessonStage);
  if (f.item) {
    set(c, "itemKind", f.item.kind);
    set(c, "itemId", f.item.id);
    set(c, "itemPosition", f.item.position);
  }
  if (f.sim) {
    set(c, "simRunId", f.sim.runId);
    set(c, "simPhase", f.sim.phase);
    set(c, "simPhaseLabel", f.sim.phaseLabel);
    set(c, "simTick", f.sim.tick);
    set(c, "simClock", f.sim.clock);
  }
  if (f.exam) {
    set(c, "examSessionId", f.exam.sessionId);
    set(c, "examQuestion", f.exam.question);
    set(c, "examQuestionCount", f.exam.count);
  }
  set(c, "labId", f.lab?.id ?? ids.labId);
  return {
    // Only ids the server can link; anything else stays in the route.
    trackId: trackId && UUID.test(trackId) ? trackId : null,
    simId: simId && UUID.test(simId) ? simId : null,
    context: c,
  };
}

// ---------------------------------------------------------------------------
// The readable line
// ---------------------------------------------------------------------------

export function clip(text: string, max = 40): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

const STAGE_LABEL: Record<string, string> = {
  guess: "Guess first",
  teach: "Teach",
  fade: "Guided practice",
  solo: "Solo check",
  lab: "Lab",
  done: "Done",
};
export function stageLabel(stage: string): string {
  return STAGE_LABEL[stage] ?? stage;
}

const ITEM_LABEL: Record<ItemKind, string> = {
  lesson: "question",
  review: "review question",
  exam: "exam question",
  quiz: "quiz question",
  comparison: "look-alike question",
  lab: "lab",
  pbq: "PBQ",
  "unit-check": "unit check question",
  placement: "placement question",
};

export interface ContextTitles {
  courseTitle?: string | null;
  unitTitle?: string | null;
  lessonTitle?: string | null;
  simTitle?: string | null;
  labTitle?: string | null;
}

// "About: NCMHCE · Sim 'Client at risk…' · Assessment · sim time 04:30".
// Built from the stored context plus whatever titles are known; never empty.
export function contextLine(ctx: QuickContext, titles: ContextTitles = {}): string {
  const parts: string[] = [];
  if (titles.courseTitle) parts.push(clip(titles.courseTitle, 48));
  const screen = ctx.screen ?? "This screen";
  if (titles.simTitle || ctx.simRunId || ctx.simPhase || ctx.simPhaseLabel) {
    parts.push(titles.simTitle ? `Sim ‘${clip(titles.simTitle)}’` : "Simulation");
    if (ctx.simPhaseLabel) parts.push(clip(ctx.simPhaseLabel, 40));
    if (ctx.simClock) parts.push(`sim time ${ctx.simClock}`);
  } else if (ctx.examSessionId || ctx.examQuestion) {
    parts.push("Practice exam");
    if (ctx.examQuestion) parts.push(ctx.examQuestionCount ? `question ${ctx.examQuestion} of ${ctx.examQuestionCount}` : `question ${ctx.examQuestion}`);
  } else if (ctx.objectiveId) {
    if (titles.unitTitle) parts.push(`Unit ‘${clip(titles.unitTitle)}’`);
    parts.push(titles.lessonTitle ? `Lesson ‘${clip(titles.lessonTitle)}’` : screen === "Explain it back" ? screen : "Lesson");
    if (ctx.lessonStage) parts.push(stageLabel(ctx.lessonStage));
  } else if (ctx.labId) {
    parts.push(titles.labTitle ? `Lab ‘${clip(titles.labTitle)}’` : "Lab");
  } else {
    if (titles.unitTitle) parts.push(`Unit ‘${clip(titles.unitTitle)}’`);
    parts.push(screen);
  }
  if (ctx.itemKind && !ctx.examQuestion && ctx.itemKind !== "lab") {
    parts.push(ctx.itemPosition ? `${ITEM_LABEL[ctx.itemKind]} ${ctx.itemPosition}` : ITEM_LABEL[ctx.itemKind]);
  }
  return `About: ${parts.join(" · ")}`;
}

// ---------------------------------------------------------------------------
// The sheet
// ---------------------------------------------------------------------------

export function quickNoteProblem(note: string): string | null {
  const t = note.trim();
  if (!t) return QUICK_NOTE_EMPTY;
  if (t.length > QUICK_NOTE_MAX) return `Keep the note under ${QUICK_NOTE_MAX} characters.`;
  return null;
}

export function quickNotePayload(note: string, tag: QuickTag | null, built: { trackId: string | null; simId: string | null; context: QuickContext }): QuickNotePayload {
  return { kind: "quick", note: note.trim(), tag, trackId: built.trackId, simId: built.simId, context: built.context };
}

// What the sheet says about a clock on this screen. A sim's clock can be
// paused (pausing is never scored), so the sheet pauses it while it is open
// and runs it again on close; a practice exam's deadline is the server's and
// cannot stop, so the sheet says so.
export type TimerKind = "exam" | "sim";
export function timerNotice(timer: { kind: TimerKind; running: boolean } | null, pausedBySheet: boolean): string | null {
  if (!timer) return null;
  if (timer.kind === "exam") return "The practice exam clock keeps running while you write. Your answers so far stay saved.";
  if (pausedBySheet) return "The sim clock is paused while this is open, and runs again when you close it.";
  return null;
}

// ---------------------------------------------------------------------------
// Lists (the reviewer's own and the owner's)
// ---------------------------------------------------------------------------

export function tagLabel(tag: string | null | undefined): string | null {
  return tag && (QUICK_TAGS as readonly string[]).includes(tag) ? QUICK_TAG_LABEL[tag as QuickTag] : null;
}

// Where an owner's link goes for a quick note: the exact lesson, sim or lab
// where possible, else the practice exam or the course. Null when there is no
// course (a note sent from Settings, say).
export function quickNoteHref(f: { trackId: string | null; simId: string | null; context: QuickContext | null }): string | null {
  if (!f.trackId) return null;
  const t = encodeURIComponent(f.trackId);
  const c = f.context ?? {};
  if (f.simId) return `/course/${t}/sim/${encodeURIComponent(f.simId)}`;
  if (c.objectiveId && c.route && /\/explain\//.test(c.route)) return `/course/${t}/explain/${encodeURIComponent(c.objectiveId)}`;
  if (c.objectiveId) return `/course/${t}/lesson/${encodeURIComponent(c.objectiveId)}${c.unitId ? `?unitId=${encodeURIComponent(c.unitId)}` : ""}`;
  if (c.labId) return `/course/${t}/lab/${encodeURIComponent(c.labId)}`;
  if (c.examSessionId) return `/course/${t}/exam`;
  return `/course/${t}`;
}

export function quickNoteLinkLabel(f: { simId: string | null; context: QuickContext | null }): string {
  const c = f.context ?? {};
  if (f.simId) return "Open the sim";
  if (c.objectiveId) return "Open the lesson";
  if (c.labId) return "Open the lab";
  if (c.examSessionId) return "Open the practice exam";
  return "Open the course";
}
