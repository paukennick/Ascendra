import { normalizeEmail } from "@/lib/account-access-config";
import { hasUnstorableText } from "@/lib/text-input";

// REQ-331 (Nick, 2026-11-17): reviewers -- the pure rules. The database side
// is lib/reviewers.ts; the routes are /api/access/reviewers (owner only),
// /api/reviewer/feedback (reviewers) and /api/access/reviewer-feedback (owner
// only). The app's copy of the field lists is mobile/src/lib/reviewers.ts
// (a mobile test checks they match).
//
// A reviewer is an owner-granted access grant with a reviewer mark (migration
// 088), so a reviewer has what any grant gives -- every course, full AI within
// the global daily ceiling -- plus the reviewer feedback form. Nothing here
// touches the 18+ gates (REQ-259/327): a reviewer acknowledges a mental health
// course or an 18+ sim like anyone else.

export const REVIEWER_AREAS_MAX = 20;
export const REVIEWER_NOTE_MAX = 500;
export const FEEDBACK_NAME_MAX = 120;
export const FEEDBACK_AREA_MAX = 120;
export const FEEDBACK_TEXT_MAX = 5000;
// Per reviewer per hour: creates and edits together. Generous for a person
// typing, small enough that a stolen session can't fill the table.
export const FEEDBACK_LIMIT = { max: 30, windowMinutes: 60 };

export const REVIEWER_ROLES = ["lpc", "lcsw", "lmsw", "psychologist", "lmft", "rn", "student", "other"] as const;
export type ReviewerRole = (typeof REVIEWER_ROLES)[number];

export const TRIED = ["lessons", "practice", "exam", "sims", "tutor"] as const;
export type Tried = (typeof TRIED)[number];

// The five optional 1-5 ratings: request key -> column.
export const RATINGS = {
  accuracy: "rating_accuracy",
  simRealism: "rating_sim_realism",
  sensitive: "rating_sensitive",
  usefulness: "rating_usefulness",
  ease: "rating_ease",
} as const;
export type RatingKey = keyof typeof RATINGS;

// The five free-text answers: request key -> column.
export const TEXTS = {
  wrongOrOutdated: "wrong_or_outdated",
  simsRealistic: "sims_realistic",
  heavyTopics: "heavy_topics",
  missing: "missing",
  otherComments: "other_comments",
} as const;
export type TextKey = keyof typeof TEXTS;

export const RECOMMEND = ["yes", "maybe", "no"] as const;
export type Recommend = (typeof RECOMMEND)[number];

// Refusals the app shows in the server's own words (4xx).
export const NOT_A_REVIEWER_MESSAGE = "The reviewer feedback form is for reviewers. Ask the account owner if you were expecting it.";
export const EMPTY_FEEDBACK_MESSAGE = "Add a rating, a comment or an answer to “Would you recommend it?” before saving.";

// ---------------------------------------------------------------------------
// Marking a reviewer (owner)
// ---------------------------------------------------------------------------

export interface MarkInput {
  email: string;
  areas: string[];
  note: string | null;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
// Same shape as lib/visibility.ts isUuid, kept here so this file stays free of the database.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

// POST /api/access/reviewers { email, areas?: string[], note? }. Areas are
// category slugs (education_categories.slug; lib/reviewers.ts checks they
// exist). Duplicates are dropped.
export function parseMarkInput(body: unknown): MarkInput | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = normalizeEmail(b.email);
  if (!email) return "email must be an email address";
  let areas: string[] = [];
  if (b.areas !== undefined && b.areas !== null) {
    if (!Array.isArray(b.areas) || b.areas.some((a) => typeof a !== "string" || !SLUG.test(a))) return "areas must be a list of course category slugs";
    areas = [...new Set(b.areas as string[])];
    if (areas.length > REVIEWER_AREAS_MAX) return `at most ${REVIEWER_AREAS_MAX} areas`;
  }
  if (b.note !== undefined && b.note !== null && typeof b.note !== "string") return "note must be text";
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : null;
  if (note && note.length > REVIEWER_NOTE_MAX) return `note must be at most ${REVIEWER_NOTE_MAX} characters`;
  if (note && hasUnstorableText(note)) return "note contains characters that can't be stored";
  return { email, areas, note };
}

// ---------------------------------------------------------------------------
// Feedback (reviewer)
// ---------------------------------------------------------------------------

export interface FeedbackInput {
  trackId: string | null;
  simId: string | null;
  name: string | null;
  role: ReviewerRole | null;
  roleOther: string | null;
  areas: string[];
  tried: Tried[];
  ratings: Record<RatingKey, number | null>;
  texts: Record<TextKey, string | null>;
  recommend: Recommend | null;
  followUp: boolean | null;
}

function optionalText(v: unknown, name: string, max: number): string | null | { error: string } {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return { error: `${name} must be text` };
  const t = v.trim();
  if (!t) return null;
  if (t.length > max) return { error: `${name} is too long (max ${max} characters)` };
  if (hasUnstorableText(t)) return { error: `${name} contains characters that can't be stored` };
  return t;
}

const isErr = (v: unknown): v is { error: string } => typeof v === "object" && v !== null && "error" in v;

// The whole form, checked before anything is stored. A field left out is
// empty (an edit sends the whole form again, so an edit can clear a field).
export function parseFeedbackInput(body: unknown): FeedbackInput | string {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof body !== "object" || body === null || Array.isArray(body)) return "the request body must be an object";

  const trackId = b.trackId === undefined || b.trackId === null || b.trackId === "" ? null : b.trackId;
  if (trackId !== null && !isUuid(trackId)) return "trackId must be a course id";
  const simId = b.simId === undefined || b.simId === null || b.simId === "" ? null : b.simId;
  if (simId !== null && !isUuid(simId)) return "simId must be a simulation id";

  const name = optionalText(b.name, "name", FEEDBACK_NAME_MAX);
  if (isErr(name)) return name.error;

  let role: ReviewerRole | null = null;
  if (b.role !== undefined && b.role !== null && b.role !== "") {
    if (!(REVIEWER_ROLES as readonly unknown[]).includes(b.role)) return `role must be one of: ${REVIEWER_ROLES.join(", ")}`;
    role = b.role as ReviewerRole;
  }
  const roleOtherRaw = optionalText(b.roleOther, "roleOther", FEEDBACK_NAME_MAX);
  if (isErr(roleOtherRaw)) return roleOtherRaw.error;
  const roleOther = role === "other" ? roleOtherRaw : null;

  let areas: string[] = [];
  if (b.areas !== undefined && b.areas !== null) {
    if (!Array.isArray(b.areas)) return "areas must be a list";
    for (const a of b.areas) {
      const t = optionalText(a, "area", FEEDBACK_AREA_MAX);
      if (isErr(t)) return t.error;
      if (t && !areas.includes(t)) areas.push(t);
    }
    if (areas.length > REVIEWER_AREAS_MAX) return `at most ${REVIEWER_AREAS_MAX} areas`;
  }

  let tried: Tried[] = [];
  if (b.tried !== undefined && b.tried !== null) {
    if (!Array.isArray(b.tried) || b.tried.some((t) => !(TRIED as readonly unknown[]).includes(t))) return `tried must list some of: ${TRIED.join(", ")}`;
    tried = TRIED.filter((t) => (b.tried as unknown[]).includes(t));
  }

  const ratingsIn = (b.ratings ?? {}) as Record<string, unknown>;
  if (typeof ratingsIn !== "object" || Array.isArray(ratingsIn)) return "ratings must be an object";
  const ratings = {} as Record<RatingKey, number | null>;
  for (const k of Object.keys(RATINGS) as RatingKey[]) {
    const v = ratingsIn[k];
    if (v === undefined || v === null) ratings[k] = null;
    else if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) ratings[k] = v;
    else return `ratings.${k} must be a whole number from 1 to 5`;
  }

  const textsIn = (b.texts ?? {}) as Record<string, unknown>;
  if (typeof textsIn !== "object" || Array.isArray(textsIn)) return "texts must be an object";
  const texts = {} as Record<TextKey, string | null>;
  for (const k of Object.keys(TEXTS) as TextKey[]) {
    const t = optionalText(textsIn[k], `texts.${k}`, FEEDBACK_TEXT_MAX);
    if (isErr(t)) return t.error;
    texts[k] = t;
  }

  let recommend: Recommend | null = null;
  if (b.recommend !== undefined && b.recommend !== null && b.recommend !== "") {
    if (!(RECOMMEND as readonly unknown[]).includes(b.recommend)) return `recommend must be one of: ${RECOMMEND.join(", ")}`;
    recommend = b.recommend as Recommend;
  }
  let followUp: boolean | null = null;
  if (b.followUp !== undefined && b.followUp !== null) {
    if (typeof b.followUp !== "boolean") return "followUp must be true or false";
    followUp = b.followUp;
  }

  const said = Object.values(ratings).some((r) => r !== null) || Object.values(texts).some((t) => t !== null) || recommend !== null;
  if (!said) return EMPTY_FEEDBACK_MESSAGE;

  return { trackId: trackId === null ? null : (trackId as string).toLowerCase(), simId: simId === null ? null : (simId as string).toLowerCase(), name, role, roleOther, areas, tried, ratings, texts, recommend, followUp };
}

// The owner screen's filters: GET /api/access/reviewer-feedback?reviewer=&course=
export function parseFeedbackFilter(url: URL): { reviewerId: string | null; trackId: string | null } | string {
  const reviewer = url.searchParams.get("reviewer");
  const course = url.searchParams.get("course");
  if (reviewer && !isUuid(reviewer)) return "reviewer must be an account id";
  if (course && !isUuid(course)) return "course must be a course id";
  return { reviewerId: reviewer ? reviewer.toLowerCase() : null, trackId: course ? course.toLowerCase() : null };
}
