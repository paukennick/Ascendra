// REQ-165 (Nick, 2026-11-09): the study notice -- ONE disclaimer, accepted
// once per account and version, that covers all of Ascendra (lessons,
// questions, labs, sims and the AI coach) and says what is sent to the AI
// provider (Google Play's User Data policy, which since July 2026 says
// plainly that it covers third-party AI). It replaced the per-course
// disclaimers, the per-lab disclaimer, the "Awaiting expert review" badge
// and the clinical / fitness lab acknowledgement.
//
// Asked at launch, after the Terms and before first run (src/lib/legal.ts
// launchGate, app/(app)/notice.tsx), and recorded on the server
// (POST /api/onboarding/notice, legal_acceptances 'study_notice'), which
// also requires it before clinical courses and clinical / fitness labs.
// As a backstop, the API client asks for it before any request that sends
// the learner's own text to the AI provider when the launch state is
// unknown (the onboarding request failed, or a server older than this).
//
// STUDY_NOTICE_VERSION equals backend/lib/study-notice.ts (studyNotice.test.ts
// checks). Bump both when the meaning changes: everyone is asked once more.
// The AI section follows section 5 of the Privacy Policy
// (src/content/legal.ts); a test keeps the two saying the same thing.
export const STUDY_NOTICE_VERSION = "2026-11-09";

export const STUDY_NOTICE_TITLE = "Before you start";
export const STUDY_NOTICE_SUMMARY =
  "Ascendra is AI-assisted practice material for exam preparation. Please read this once; it covers everything in the app.";

export interface NoticeSection {
  heading: string;
  lines: readonly string[];
}

export const AI_DATA_HEADING = "What the AI features send, and to whom";

export const STUDY_NOTICE_SECTIONS: readonly NoticeSection[] = [
  {
    heading: "Practice material that can be wrong",
    lines: [
      "Lessons, questions, labs, sims and the coach's replies are written or graded with the help of AI, from published exam outlines and open sources. Not all of it has been checked by a subject-matter expert. It may contain errors.",
      "If something looks wrong, use the report link beside it. Reports go to a person.",
    ],
  },
  {
    heading: "Not professional, medical or clinical advice",
    lines: [
      "Nothing in Ascendra is medical, nursing, physical-therapy, fitness, nutrition, legal, financial or other professional advice.",
      "Health courses are exam preparation only. The patients, clients and cases in them are fictional. Never use anything here to make decisions about a real patient or client: follow your program, your facility's policies, your license and scope of practice, licensed supervisors and current guidelines. Check drug doses, lab values and procedures against a current authoritative source.",
      "In an emergency, call your local emergency services.",
    ],
  },
  {
    heading: "Independent",
    lines: [
      "Ascendra is not affiliated with or endorsed by any certification, licensing or exam body. Exam names and trademarks belong to their owners.",
    ],
  },
  {
    heading: AI_DATA_HEADING,
    lines: [
      "The coach and the grading of written answers use Claude, an AI model from Anthropic (United States).",
      "What is sent: the messages you write to the coach (with the earlier messages in that course's conversation and a short summary of your weakest topics), and the answers you write in your own words — first guesses, lesson and review answers, \"explain it back\", lab answers and reports, scenario and unit-check answers — each with the question and course material it is graded against.",
      "Why: to answer your question, or to grade and give feedback on your answer. Your name, email address and account ID are not sent.",
      "How long: under its commercial terms Anthropic may not train its models on it, and it says it deletes it within 30 days, except where the law requires longer or to enforce its usage policy (up to 2 years for content its safety systems flag). We keep your answers and coach conversations with your account while it is open, as the Privacy Policy describes.",
    ],
  },
];

// Google Play's Prominent Disclosure rule: the data disclosure "cannot be
// included with other disclosures unrelated to personal and sensitive user
// data collection". So the notice is one acceptance with two pages: the
// content disclaimer, then the AI data disclosure on its own page with its
// own "I agree". Accepting the second page records the whole notice.
export type NoticePage = "content" | "data";
export function sectionsFor(page: NoticePage): readonly NoticeSection[] {
  return STUDY_NOTICE_SECTIONS.filter((s) => (s.heading === AI_DATA_HEADING) === (page === "data"));
}

export const STUDY_NOTICE_CONTINUE_LABEL = "I understand, next";
export const STUDY_NOTICE_ACCEPT_LABEL = "I agree and continue";

// Requests that send text the learner wrote to the AI provider (Privacy
// Policy section 5, "Features that send what you type"). POST only.
// Adding a feature that sends learner text to the model? Add its route here.
export const AI_ROUTES: readonly RegExp[] = [
  /^\/api\/chat(?:$|\?)/, // Ask the coach, and follow-ups from a lesson
  /^\/api\/grade(?:$|\?)/, // written lesson answers
  /^\/api\/pbq(?:$|\?)/, // scenario (PBQ) answers
  /^\/api\/objectives\/[^/?]+\/guess-feedback(?:$|\?)/, // first guess in a lesson
  /^\/api\/objectives\/[^/?]+\/explain-back(?:$|\?)/,
  /^\/api\/objectives\/[^/?]+\/lab\/report(?:$|\?)/,
  /^\/api\/labs\/[^/?]+\/submit(?:$|\?)/, // a lab step graded by the model
  /^\/api\/sims\/runs\/[^/?]+\/reasoning(?:$|\?)/, // REQ-190: a sim's written reasoning, graded by the model
  /^\/api\/review\/sessions\/[^/?]+\/items\/[^/?]+\/answer(?:$|\?)/, // written review answers
  /^\/api\/units\/[^/?]+\/check(?:$|\?)/,
];

export function isAiRequest(method: string | undefined, path: string): boolean {
  return (method ?? "GET").toUpperCase() === "POST" && AI_ROUTES.some((r) => r.test(path));
}

// Thrown instead of sending when the learner closes the notice. Screens show
// its message beside their own Retry/Send (friendlyError reads `friendly`);
// nothing was sent, so a draft stays in its box.
export class StudyNoticeDeclinedError extends Error {
  friendly = true;
  constructor() {
    super("Nothing was sent. Please read and accept the study notice first — try again whenever you're ready.");
    this.name = "StudyNoticeDeclinedError";
  }
}

// Registered by OnboardingProvider: resolves true once the learner has
// accepted the notice (at once if they already had), false if they closed
// it. Not registered (signed out, or tests): requests go ahead -- the server
// refuses a signed-out AI request anyway.
type Handler = () => Promise<boolean>;
let handler: Handler | null = null;

export function registerStudyNoticeHandler(h: Handler | null): void {
  handler = h;
}

export async function studyNoticeGate(method: string | undefined, path: string): Promise<void> {
  if (!handler || !isAiRequest(method, path)) return;
  if (!(await handler())) throw new StudyNoticeDeclinedError();
}

// For the backstop: "go" when accepted (per the server or this session),
// otherwise "ask". Unknown state asks: showing it twice is harmless, sending
// without it is not.
export function studyNoticeDecision(state: { notice?: { needed?: boolean } } | null, acceptedThisSession: boolean): "go" | "ask" {
  if (acceptedThisSession) return "go";
  if (state?.notice && state.notice.needed === false) return "go";
  return "ask";
}

// REQ-217 (FAIL-1061): the server refuses a request with 403 and this code when
// the learner has not accepted the current study notice (backend
// requireStudyNotice). The app's own copy of the launch state said otherwise
// (the first onboarding request failed, or the notice version moved on while the
// app was open), so the learner got the error text and no way to the notice.
// The client hands this to the onboarding provider, which reloads the state so
// the launch gate opens the notice screen.
export function isStudyNoticeRequired(status: number, data: unknown): boolean {
  return status === 403 && !!data && typeof data === "object" && (data as { code?: unknown }).code === "study_notice_required";
}
