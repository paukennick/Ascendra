// REQ-224 (Nick, 2026-11-10): the 18+ mature-content notice for the mental
// health courses (EPPP first; NCE, NCMHCE, ASWB Clinical and the Washington
// psychology jurisprudence course next). Those courses include frank clinical
// material -- suicide risk, abuse, violence, trauma -- where the exam tests it,
// so before any of it is shown the learner confirms, once per account and
// notice version, that they are 18 or older and want to see it.
//
// Asked (src/auth/MatureContentContext.tsx, src/components/MatureContentNotice.tsx):
//   - on the intake form, when a mental health course is picked
//     (source "intake");
//   - on Explore, when the Mental Health category filter is picked
//     (source "catalog");
//   - whenever a mental health course is opened or started without a recorded
//     confirmation: the server answers 403 { code: "mature_content_required" }
//     and the API client asks here, then sends the request once more
//     (source "course").
// Recorded on the server (POST /api/mature-content/accept,
// mature_content_confirmations, migration 077), which refuses every mental
// health course route without it. Separate from the study notice and from the
// 16+ sign-up confirmation.
//
// MATURE_CONTENT_NOTICE_VERSION equals backend/lib/mature-content.ts
// (matureContent.test.ts checks). Bump both when the meaning changes:
// everyone is asked again the next time they open a mental health course.
export const MATURE_CONTENT_NOTICE_VERSION = "2026-11-10";
export const MATURE_CONTENT_MIN_AGE = 18;

export const MATURE_CATEGORIES = ["mental-health"] as const;
export type MatureCategory = (typeof MATURE_CATEGORIES)[number];
export type MatureSource = "intake" | "catalog" | "course";

export function isMatureCategory(slug: unknown): slug is MatureCategory {
  return typeof slug === "string" && (MATURE_CATEGORIES as readonly string[]).includes(slug);
}

export const MATURE_NOTICE_TITLE = "Adults only: mature clinical content";

export const MATURE_NOTICE_LINES: readonly string[] = [
  "Mental health courses prepare you for licensure exams for psychologists, counselors and social workers. To teach what those exams test, some lessons, questions and simulations describe suicide and self-harm, abuse of children and adults, violence, sexual content in a clinical context, substance use and trauma, frankly and in clinical detail.",
  "The cases are fictional exam practice, not advice about you or anyone you know, and not a substitute for care.",
  "If you're struggling yourself, you can stop at any time. In the US, call or text 988 (Suicide & Crisis Lifeline); elsewhere, contact your local emergency number.",
];

export const MATURE_CONFIRM_STATEMENT = `I am ${MATURE_CONTENT_MIN_AGE} or older and I want to see this material.`;
export const MATURE_CONFIRM_LABEL = `I'm ${MATURE_CONTENT_MIN_AGE} or older, continue`;
export const MATURE_DECLINE_LABEL = "Not now";

// Thrown instead of resending when the learner closes the notice. Screens show
// its message (friendlyError reads `friendly`) beside their own Retry.
export class MatureContentDeclinedError extends Error {
  friendly = true;
  constructor() {
    super("This course has mature clinical content for adults. Open it again whenever you're ready to confirm you're 18 or older.");
    this.name = "MatureContentDeclinedError";
  }
}

// The category a 403 body asks a confirmation for, or null when the refusal
// is something else (the study notice, a plan).
export function matureRefusalCategory(status: number, data: unknown): MatureCategory | null {
  if (status !== 403 || !data || typeof data !== "object") return null;
  const d = data as { code?: unknown; category?: unknown };
  if (d.code !== "mature_content_required") return null;
  return isMatureCategory(d.category) ? d.category : "mental-health";
}

export interface MatureCategoryState {
  category: MatureCategory;
  confirmed: boolean;
  confirmedAt: string | null;
  noticeVersion: string;
}

export function parseMatureState(data: unknown): MatureCategoryState[] {
  const list = (data as { categories?: unknown } | null)?.categories;
  if (!Array.isArray(list)) return [];
  return list
    .filter((c): c is MatureCategoryState => !!c && typeof c === "object" && isMatureCategory((c as { category?: unknown }).category))
    .map((c) => ({ category: c.category, confirmed: c.confirmed === true, confirmedAt: c.confirmedAt ?? null, noticeVersion: String(c.noticeVersion ?? "") }));
}

// Whether to ask before an action on a course in this category. Unknown state
// asks: showing the notice to someone who already confirmed is harmless (the
// server keeps the first row), showing the material without it is not.
export function needsMatureConfirmation(
  categorySlug: string | null | undefined,
  state: readonly MatureCategoryState[] | null,
  confirmedThisSession: ReadonlySet<string>
): boolean {
  if (!isMatureCategory(categorySlug)) return false;
  if (confirmedThisSession.has(categorySlug)) return false;
  const s = state?.find((c) => c.category === categorySlug);
  return !(s && s.confirmed && s.noticeVersion === MATURE_CONTENT_NOTICE_VERSION);
}

// Registered by MatureContentProvider: shows the notice and resolves true once
// the learner confirmed (and it was recorded), false if they closed it. Not
// registered (signed out, or tests): the API client does not retry.
type Handler = (category: MatureCategory, source: MatureSource) => Promise<boolean>;
let handler: Handler | null = null;

export function registerMatureContentHandler(h: Handler | null): void {
  handler = h;
}

export function hasMatureContentHandler(): boolean {
  return handler !== null;
}

export async function askMatureConfirmation(category: MatureCategory, source: MatureSource): Promise<boolean> {
  if (!handler) return false;
  return handler(category, source);
}
