// REQ-331 (Nick, 2026-11-17): reviewers on the phone and the web -- the pure
// parts, so they run under node --test. The server decides everything: GET
// /api/auth/me says whether this account is a reviewer (user.access.reviewer),
// /api/reviewer/feedback checks again on every request, and the owner screens
// talk to /api/access/reviewers and /api/access/reviewer-feedback, which check
// for an owner. The field lists match backend/lib/reviewers-config.ts (a
// backend test reads this file).

export const REVIEWER_ROLES = ["lpc", "lcsw", "lmsw", "psychologist", "lmft", "rn", "student", "other"] as const;
export type ReviewerRole = (typeof REVIEWER_ROLES)[number];
export const ROLE_LABEL: Record<ReviewerRole, string> = {
  lpc: "LPC / LMHC / LPCC",
  lcsw: "LCSW",
  lmsw: "LMSW",
  psychologist: "Psychologist",
  lmft: "LMFT",
  rn: "RN",
  student: "Student / in training",
  other: "Other",
};

export const TRIED = ["lessons", "practice", "exam", "sims", "tutor"] as const;
export type Tried = (typeof TRIED)[number];
export const TRIED_LABEL: Record<Tried, string> = {
  lessons: "Lessons",
  practice: "Practice questions",
  exam: "Practice exam",
  sims: "Session sims",
  tutor: "AI tutor",
};

export const RATING_KEYS = ["accuracy", "simRealism", "sensitive", "usefulness", "ease"] as const;
export type RatingKey = (typeof RATING_KEYS)[number];
export const RATING_LABEL: Record<RatingKey, string> = {
  accuracy: "Content accuracy",
  simRealism: "Realism of the sims",
  sensitive: "Handling of sensitive topics",
  usefulness: "Usefulness for studying",
  ease: "Ease of use",
};

export const TEXT_KEYS = ["wrongOrOutdated", "simsRealistic", "heavyTopics", "missing", "otherComments"] as const;
export type TextKey = (typeof TEXT_KEYS)[number];
export const TEXT_LABEL: Record<TextKey, string> = {
  wrongOrOutdated: "Anything wrong or outdated?",
  simsRealistic: "Were the sims realistic, and the right answers right?",
  heavyTopics: "How were heavy topics handled?",
  missing: "What's missing?",
  otherComments: "Anything else?",
};

export const RECOMMEND = ["yes", "maybe", "no"] as const;
export type Recommend = (typeof RECOMMEND)[number];
export const RECOMMEND_LABEL: Record<Recommend, string> = { yes: "Yes", maybe: "Maybe", no: "No" };

export const FEEDBACK_TEXT_MAX = 5000;
export const FEEDBACK_NAME_MAX = 120;

export const REVIEWER_BADGE = "Reviewer";
export const GIVE_FEEDBACK_LABEL = "Give feedback";
export const REPORT_POINTER =
  "To flag one specific lesson, question or sim step, use “Report a problem” on it instead: that sends us the exact item. Use this form for your overall view.";
export const EMPTY_FORM_PROBLEM = "Add a rating, a comment or an answer to “Would you recommend it?” before saving.";

// ---------------------------------------------------------------------------
// Who is a reviewer
// ---------------------------------------------------------------------------

export interface ReviewerMark {
  since: string;
  areas: string[];
}

// user.access.reviewer from /api/auth/me; anything malformed (or an older
// server that sends nothing) is "not a reviewer".
export function parseReviewer(access: unknown): ReviewerMark | null {
  if (!access || typeof access !== "object") return null;
  const r = (access as Record<string, unknown>).reviewer;
  if (!r || typeof r !== "object") return null;
  const m = r as Record<string, unknown>;
  if (typeof m.since !== "string") return null;
  return { since: m.since, areas: Array.isArray(m.areas) ? m.areas.filter((a): a is string => typeof a === "string") : [] };
}

// A category slug as words, for when the category list isn't loaded:
// "mental-health" -> "Mental health".
export function areaWords(slug: string): string {
  const w = slug.replace(/-/g, " ").trim();
  return w ? w[0].toUpperCase() + w.slice(1) : slug;
}

// What Settings says under the Reviewer badge.
export function reviewerSettingsLine(r: ReviewerMark, locale?: string): string {
  const since = new Date(r.since).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  const areas = r.areas.length ? ` for ${r.areas.map(areaWords).join(", ")}` : "";
  return `You're reviewing Ascendra${areas} (since ${since}). Every course and the AI features are open to you; the 18+ notices still apply. Send your view with ${GIVE_FEEDBACK_LABEL}.`;
}

// The feedback form is for reviewers; owners can open it too (to try it).
export function canGiveFeedback(user: { access?: unknown } | null | undefined): boolean {
  const a = user?.access as Record<string, unknown> | null | undefined;
  if (!a || typeof a !== "object") return false;
  return a.level === "owner" || parseReviewer(a) !== null;
}

export function isReviewer(user: { access?: unknown } | null | undefined): boolean {
  return parseReviewer(user?.access) !== null;
}

// Where "Give feedback" goes. A course or sim travels as ids only (never
// anything sensitive in route params; src/lib/handoff.ts).
export function feedbackHref(ctx: { trackId?: string | null; simId?: string | null } = {}): string {
  const q: string[] = [];
  if (ctx.trackId) q.push(`trackId=${encodeURIComponent(ctx.trackId)}`);
  if (ctx.simId) q.push(`simId=${encodeURIComponent(ctx.simId)}`);
  return `/feedback/edit${q.length ? `?${q.join("&")}` : ""}`;
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

export interface Feedback {
  id: string;
  trackId: string | null;
  trackTitle: string | null;
  simId: string | null;
  simTitle: string | null;
  name: string | null;
  role: string | null;
  roleOther: string | null;
  areas: string[];
  tried: string[];
  ratings: Partial<Record<RatingKey, number | null>>;
  texts: Partial<Record<TextKey, string | null>>;
  recommend: string | null;
  followUp: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerFeedback extends Feedback {
  reviewerId: string;
  reviewerEmail: string;
}

export interface FormState {
  trackId: string | null;
  simId: string | null;
  name: string;
  role: ReviewerRole | null;
  roleOther: string;
  areasText: string;
  tried: Tried[];
  ratings: Record<RatingKey, number | null>;
  texts: Record<TextKey, string>;
  recommend: Recommend | null;
  followUp: boolean | null;
}

function emptyRatings(): Record<RatingKey, number | null> {
  return { accuracy: null, simRealism: null, sensitive: null, usefulness: null, ease: null };
}
function emptyTexts(): Record<TextKey, string> {
  return { wrongOrOutdated: "", simsRealistic: "", heavyTopics: "", missing: "", otherComments: "" };
}

// A new form: the account's name, and the areas from the course (or sim) it
// was opened from, else the reviewer's areas.
export function newForm(prefill: {
  name?: string | null;
  areas?: string[];
  trackId?: string | null;
  simId?: string | null;
  contextAreas?: string[];
}): FormState {
  const areas = prefill.contextAreas?.length ? prefill.contextAreas : prefill.areas ?? [];
  return {
    trackId: prefill.trackId ?? null,
    simId: prefill.simId ?? null,
    name: prefill.name ?? "",
    role: null,
    roleOther: "",
    areasText: areas.join(", "),
    tried: prefill.simId ? ["sims"] : [],
    ratings: emptyRatings(),
    texts: emptyTexts(),
    recommend: null,
    followUp: null,
  };
}

// A saved submission, back into the form for editing.
export function formFrom(f: Feedback): FormState {
  const ratings = emptyRatings();
  for (const k of RATING_KEYS) {
    const v = f.ratings?.[k];
    ratings[k] = typeof v === "number" ? v : null;
  }
  const texts = emptyTexts();
  for (const k of TEXT_KEYS) texts[k] = f.texts?.[k] ?? "";
  return {
    trackId: f.trackId,
    simId: f.simId,
    name: f.name ?? "",
    role: (REVIEWER_ROLES as readonly string[]).includes(f.role ?? "") ? (f.role as ReviewerRole) : null,
    roleOther: f.roleOther ?? "",
    areasText: f.areas.join(", "),
    tried: TRIED.filter((t) => f.tried.includes(t)),
    ratings,
    texts,
    recommend: (RECOMMEND as readonly string[]).includes(f.recommend ?? "") ? (f.recommend as Recommend) : null,
    followUp: f.followUp,
  };
}

export function splitAreas(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[,;\n]+/)) {
    const a = raw.trim();
    if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

// What the server takes (POST/PUT /api/reviewer/feedback).
export function payloadFrom(s: FormState) {
  const texts: Record<string, string | null> = {};
  for (const k of TEXT_KEYS) texts[k] = s.texts[k].trim() || null;
  return {
    trackId: s.trackId,
    simId: s.simId,
    name: s.name.trim() || null,
    role: s.role,
    roleOther: s.role === "other" ? s.roleOther.trim() || null : null,
    areas: splitAreas(s.areasText),
    tried: TRIED.filter((t) => s.tried.includes(t)),
    ratings: { ...s.ratings },
    texts,
    recommend: s.recommend,
    followUp: s.followUp,
  };
}

// Checked before sending (the server checks again).
export function formProblem(s: FormState): string | null {
  const said = RATING_KEYS.some((k) => s.ratings[k] !== null) || TEXT_KEYS.some((k) => s.texts[k].trim()) || s.recommend !== null;
  if (!said) return EMPTY_FORM_PROBLEM;
  if (s.name.trim().length > FEEDBACK_NAME_MAX) return `Keep your name under ${FEEDBACK_NAME_MAX} characters.`;
  if (s.role === "other" && s.roleOther.trim().length > FEEDBACK_NAME_MAX) return `Keep the role under ${FEEDBACK_NAME_MAX} characters.`;
  for (const k of TEXT_KEYS) if (s.texts[k].length > FEEDBACK_TEXT_MAX) return `“${TEXT_LABEL[k]}” is too long (up to ${FEEDBACK_TEXT_MAX} characters).`;
  return null;
}

// ---------------------------------------------------------------------------
// Lines the lists show
// ---------------------------------------------------------------------------

function shortDate(iso: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function roleLine(f: Pick<Feedback, "role" | "roleOther">): string {
  if (!f.role) return "";
  if (f.role === "other") return f.roleOther ? `Other: ${f.roleOther}` : "Other";
  return ROLE_LABEL[f.role as ReviewerRole] ?? f.role;
}

// "Course · Sim" or "General"
export function aboutLine(f: Pick<Feedback, "trackTitle" | "simTitle">): string {
  if (f.trackTitle && f.simTitle) return `${f.trackTitle} · ${f.simTitle}`;
  return f.trackTitle ?? f.simTitle ?? "General feedback";
}

export function whenLine(f: Pick<Feedback, "createdAt" | "updatedAt">, locale?: string): string {
  const sent = `Sent ${shortDate(f.createdAt, locale)}`;
  return new Date(f.updatedAt).getTime() - new Date(f.createdAt).getTime() > 60_000 ? `${sent}, edited ${shortDate(f.updatedAt, locale)}` : sent;
}

// "Accuracy 4/5 · Ease 2/5" (only the ratings given)
export function ratingsLine(f: Pick<Feedback, "ratings">): string {
  return RATING_KEYS.filter((k) => typeof f.ratings?.[k] === "number")
    .map((k) => `${RATING_LABEL[k]} ${f.ratings[k]}/5`)
    .join(" · ");
}

export function recommendLine(f: Pick<Feedback, "recommend" | "followUp">): string {
  const parts: string[] = [];
  if (f.recommend) parts.push(`Would recommend: ${RECOMMEND_LABEL[f.recommend as Recommend] ?? f.recommend}`);
  if (f.followUp !== null) parts.push(f.followUp ? "OK to follow up" : "No follow-up");
  return parts.join(" · ");
}

export function triedLine(f: Pick<Feedback, "tried">): string {
  return TRIED.filter((t) => f.tried.includes(t))
    .map((t) => TRIED_LABEL[t])
    .join(", ");
}

// Where an owner's link goes: the sim inside its course, else the course.
export function itemHref(f: Pick<Feedback, "trackId" | "simId">): string | null {
  if (f.trackId && f.simId) return `/course/${f.trackId}/sim/${f.simId}`;
  if (f.trackId) return `/course/${f.trackId}`;
  return null;
}

// ---------------------------------------------------------------------------
// Owner: reviewers on the Access screen
// ---------------------------------------------------------------------------

export interface ReviewerGrant {
  id: string;
  email: string;
  status: "active" | "waiting" | "ended";
  reviewer: { since: string; areas: string[]; note: string | null; addedAccess: boolean } | null;
}

export function reviewerStatusLine(g: ReviewerGrant, categoryName: (slug: string) => string, locale?: string): string {
  const state = g.status === "waiting" ? "Waiting for sign-up" : g.status === "ended" ? "Access ended" : "Active";
  const since = g.reviewer ? `, reviewer since ${shortDate(g.reviewer.since, locale)}` : "";
  const areas = g.reviewer?.areas.length ? `. Reviews: ${g.reviewer.areas.map(categoryName).join(", ")}` : "";
  return `${state}${since}${areas}`;
}

// What "Remove reviewer" tells the owner will happen.
export function unmarkMessage(g: ReviewerGrant): string {
  return g.reviewer?.addedAccess
    ? `${g.email} loses the reviewer form and the access that came with it, straight away. Their feedback is kept.`
    : `${g.email} loses the reviewer form straight away and keeps the unrestricted access they had before. Their feedback is kept.`;
}

export function markFormProblem(email: string, note: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter an email address.";
  if (note.trim().length > 500) return "Keep the note under 500 characters.";
  return null;
}
