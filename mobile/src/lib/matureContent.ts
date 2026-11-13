// REQ-224 (Nick, 2026-11-10), REQ-259 (Nick, 2026-11-13): the 18+ notice for
// the mental health courses (EPPP, NCE, NCMHCE, ...). Those courses include
// frank clinical material -- suicide risk, abuse, violence, trauma -- where the
// exam tests it.
//
// REQ-259 made it per COURSE, with the date of birth asked once:
//   - every mental health course the learner has not acknowledged asks again,
//     with the attestation "I confirm the information I've given is true to
//     the best of my knowledge, and I'm 18 or older";
//   - the FIRST time (no date of birth on the account) the notice also asks
//     for a date of birth; later courses do not;
//   - under 18 (from the stored date) the course stays locked and the notice
//     says so kindly instead of asking again; the learner cannot enter a new
//     date and is pointed to support.
//
// Asked (src/auth/MatureContentContext.tsx, src/components/MatureContentNotice.tsx):
//   - on the intake form, when a mental health course is picked
//     (source "intake");
//   - whenever a mental health course is opened or started without an
//     acknowledgement for it: the server answers 403
//     { code: "mature_content_required", trackId } and the API client asks
//     here, then sends the request once more (source "course"). Browsing the
//     Explore category list asks nothing: no course is opened.
// Recorded on the server (POST /api/mature-content/accept,
// mature_course_acknowledgements, migration 081), which refuses every mental
// health course route without it. Separate from the study notice and from the
// 16+ sign-up confirmation.
//
// MATURE_CONTENT_NOTICE_VERSION equals backend/lib/mature-content.ts
// (matureContent.test.ts checks). Bump both when the meaning or wording
// changes: everyone is asked again the next time they open a mental health
// course (the date of birth is kept, not asked again).
import { dobFromParts } from "./dateOfBirth.ts";

export const MATURE_CONTENT_NOTICE_VERSION = "2026-11-13";
export const MATURE_CONTENT_MIN_AGE = 18;

export const MATURE_CATEGORIES = ["mental-health"] as const;
export type MatureCategory = (typeof MATURE_CATEGORIES)[number];
export type MatureSource = "intake" | "course";

export function isMatureCategory(slug: unknown): slug is MatureCategory {
  return typeof slug === "string" && (MATURE_CATEGORIES as readonly string[]).includes(slug);
}

export const MATURE_NOTICE_TITLE = "Adults only: mature clinical content";

export const MATURE_NOTICE_LINES: readonly string[] = [
  "Mental health courses prepare you for licensure exams for psychologists, counselors and social workers. To teach what those exams test, some lessons, questions and simulations describe suicide and self-harm, abuse of children and adults, violence, sexual content in a clinical context, substance use and trauma, frankly and in clinical detail.",
  "The cases are fictional exam practice, not advice about you or anyone you know, and not a substitute for care.",
  "If you're struggling yourself, you can stop at any time. In the US, call or text 988 (Suicide & Crisis Lifeline); elsewhere, contact your local emergency number.",
];

// Asked once per account, with the first course (no date of birth on file).
export const MATURE_DOB_INTRO =
  "To open a course like this we need your date of birth, once. It stays on your account and is only used to check your age. You can't change it yourself later, so check it before you continue.";
export const MATURE_ATTESTATION_STATEMENT = `I confirm the information I've given is true to the best of my knowledge, and I'm ${MATURE_CONTENT_MIN_AGE} or older.`;
export const MATURE_ATTESTATION_MISSING = "Tick the box to confirm before you continue.";
export const MATURE_CONFIRM_LABEL = "Confirm and continue";
export const MATURE_DECLINE_LABEL = "Not now";

// Under 18 on the date of birth stored on the account. Matches the server's
// words (backend/lib/mature-content.ts matureUnderageMessage).
export const MATURE_UNDERAGE_TITLE = "This course is for adults";
export const MATURE_UNDERAGE_LINES = (supportEmail: string): readonly string[] => [
  `This course is for learners who are ${MATURE_CONTENT_MIN_AGE} or older, so it stays locked on your account for now.`,
  `That's based on the date of birth on your account, which can't be changed in the app. If it's wrong, contact ${supportEmail} and we'll look at it.`,
];
export const MATURE_UNDERAGE_CLOSE_LABEL = "Close";

// Thrown instead of resending when the learner closes the notice. Screens show
// its message (friendlyError reads `friendly`) beside their own Retry.
export class MatureContentDeclinedError extends Error {
  friendly = true;
  constructor() {
    super("This course has mature clinical content for adults. Open it again whenever you're ready to confirm you're 18 or older.");
    this.name = "MatureContentDeclinedError";
  }
}

// Thrown when the account's date of birth makes the learner under 18: the
// course stays locked and there is nothing to confirm.
export class MatureContentBlockedError extends Error {
  friendly = true;
  constructor() {
    super(`This course is for learners who are ${MATURE_CONTENT_MIN_AGE} or older, so it stays locked on your account. If the date of birth on your account is wrong, contact Support from the app.`);
    this.name = "MatureContentBlockedError";
  }
}

// The course a 403 body asks an acknowledgement for, or null when the refusal
// is something else (the study notice, a plan) or names no course (a server
// older than REQ-259: nothing to acknowledge per course).
export interface MatureTarget {
  trackId: string;
  category: MatureCategory;
}

export function matureRefusalTarget(status: number, data: unknown): MatureTarget | null {
  if (status !== 403 || !data || typeof data !== "object") return null;
  const d = data as { code?: unknown; category?: unknown; trackId?: unknown };
  if (d.code !== "mature_content_required") return null;
  if (typeof d.trackId !== "string" || !d.trackId) return null;
  return { trackId: d.trackId, category: isMatureCategory(d.category) ? d.category : "mental-health" };
}

export type AgeStatus = "unknown" | "adult" | "under_18";

// GET /api/mature-content and the accept route's 200.
export interface MatureState {
  noticeVersion: string;
  dateOfBirthOnFile: boolean;
  ageStatus: AgeStatus;
  acknowledgedTrackIds: string[];
}

export function parseMatureState(data: unknown): MatureState | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.noticeVersion !== "string" || !Array.isArray(d.acknowledgedTrackIds)) return null;
  const ageStatus: AgeStatus = d.ageStatus === "adult" || d.ageStatus === "under_18" ? d.ageStatus : "unknown";
  return {
    noticeVersion: d.noticeVersion,
    dateOfBirthOnFile: d.dateOfBirthOnFile === true,
    ageStatus,
    acknowledgedTrackIds: d.acknowledgedTrackIds.filter((x): x is string => typeof x === "string"),
  };
}

// Whether to ask before an action on this course. Unknown state asks:
// showing the notice to someone who already acknowledged is harmless (the
// server keeps the first row), showing the material without it is not.
export function needsMatureConfirmation(
  track: { id: string; category_slug?: string | null } | null | undefined,
  state: MatureState | null,
  acknowledgedThisSession: ReadonlySet<string>
): boolean {
  if (!track || !isMatureCategory(track.category_slug)) return false;
  if (acknowledgedThisSession.has(track.id)) return false;
  return !(state && state.noticeVersion === MATURE_CONTENT_NOTICE_VERSION && state.acknowledgedTrackIds.includes(track.id));
}

// What the notice shows for this account: the closed under-18 message, or the
// form (with the date of birth fields only while none is on file).
export type NoticeMode = "blocked" | "form_with_dob" | "form";

export function noticeMode(state: MatureState | null): NoticeMode {
  if (state?.ageStatus === "under_18") return "blocked";
  return state?.dateOfBirthOnFile ? "form" : "form_with_dob";
}

// The notice's form: what the learner typed, and whether it can be sent.
export interface MatureFormInput {
  needsDateOfBirth: boolean;
  day: string;
  month: string;
  year: string;
  attested: boolean;
}

export type MatureFormResult =
  | { ok: true; body: { attested: true; dateOfBirth?: string } }
  | { ok: false; errors: { dateOfBirth?: string; attested?: string } };

export function validateMatureForm(input: MatureFormInput, now: Date = new Date()): MatureFormResult {
  const errors: { dateOfBirth?: string; attested?: string } = {};
  let dateOfBirth: string | undefined;
  if (input.needsDateOfBirth) {
    const dob = dobFromParts({ day: input.day, month: input.month, year: input.year }, now);
    if (dob.ok) dateOfBirth = dob.iso;
    else errors.dateOfBirth = dob.message;
  }
  if (!input.attested) errors.attested = MATURE_ATTESTATION_MISSING;
  if (errors.dateOfBirth || errors.attested) return { ok: false, errors };
  return { ok: true, body: dateOfBirth ? { attested: true, dateOfBirth } : { attested: true } };
}

// What the server's answer to the accept request means for the notice.
export type AcceptFailure =
  | { kind: "underage" } // 403 mature_content_underage: lock it, show the closed message
  | { kind: "needs_dob" } // 400 date_of_birth_required: the state was stale, ask for it
  | { kind: "other" };

export function acceptFailure(status: number, data: unknown): AcceptFailure {
  const code = data && typeof data === "object" ? (data as { code?: unknown }).code : undefined;
  if (status === 403 && code === "mature_content_underage") return { kind: "underage" };
  if (status === 400 && code === "date_of_birth_required") return { kind: "needs_dob" };
  return { kind: "other" };
}

// Registered by MatureContentProvider: shows the notice for this course and
// resolves "confirmed" once the acknowledgement was recorded, "declined" if the
// learner closed it, "blocked" if the account is under 18. Not registered
// (signed out, or tests): the API client does not retry.
export type MatureAnswer = "confirmed" | "declined" | "blocked";
type Handler = (target: MatureTarget, source: MatureSource, title?: string) => Promise<MatureAnswer>;
let handler: Handler | null = null;

export function registerMatureContentHandler(h: Handler | null): void {
  handler = h;
}

export function hasMatureContentHandler(): boolean {
  return handler !== null;
}

export async function askMatureConfirmation(target: MatureTarget, source: MatureSource, title?: string): Promise<MatureAnswer> {
  if (!handler) return "declined";
  return handler(target, source, title);
}
