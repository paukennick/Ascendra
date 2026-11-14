// REQ-119 (Audit 3 product H5): the Terms of Service + Privacy Policy
// version this app shows: the newest of the Terms and Privacy versions in
// src/content/legal.ts, and equal to CURRENT_TERMS_VERSION in
// backend/lib/legal.ts (src/lib/productBasics.test.ts checks both): the app
// sends it when someone signs up, and the server records it only if it is
// the current one. Change both, together with the pages, when the text
// changes in a way people should agree to again.
export const TERMS_VERSION = "2026-11-14";

// REQ-205: sent on every request (src/api/client.ts) so the server knows
// which text this build shows. Without it, an installed build that still
// carries an older text could not be told from one that carries the new text.
export const LEGAL_VERSION_HEADER = "X-Ascendra-Legal";

export interface TermsState {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsAcceptance: boolean;
  // REQ-093: which documents changed since the account last agreed (absent
  // from a server older than the 2026-11-07 release).
  pending?: ("terms" | "privacy")[];
}

export interface FirstRunState {
  needed: boolean;
  completedAt: string | null;
  goalTrackId: string | null;
  justExploring: boolean;
}

export interface OnboardingState {
  terms: TermsState;
  firstRun: FirstRunState;
  // REQ-165: the study notice (src/lib/studyNotice.ts); absent from a server
  // older than this release.
  notice?: { currentVersion: string; acceptedAt: string | null; needed: boolean };
}

export type LaunchGate = "agree" | "notice" | "welcome" | null;

// What a signed-in launch should show first. Terms, then the study notice
// (REQ-165), then first run.
// Unknown state (still loading, or the request failed) asks for nothing:
// a network problem must never lock anyone out of studying.
export function launchGate(state: OnboardingState | null): LaunchGate {
  if (!state) return null;
  if (state.terms.needsAcceptance) return "agree";
  if (state.notice?.needed === true) return "notice";
  if (state.firstRun.needed) return "welcome";
  return null;
}

// REQ-226 (FAIL-1241): the server refuses a signed-in request with 403 and this
// code when the account has not accepted the Terms and Privacy Policy this
// build must accept (backend requireUser, REQ-219). The launch prompt normally
// asks first; a build whose launch state never loaded (the onboarding request
// failed) or went stale (the text changed while the app was open) used to show
// the server's sentence as error text and no way to agree.
export const TERMS_REQUIRED_CODE = "terms_required";

export function isTermsRequired(status: number, data: unknown): boolean {
  return status === 403 && !!data && typeof data === "object" && (data as { code?: unknown }).code === TERMS_REQUIRED_CODE;
}

// Once, not a loop: when the launch state already says the Terms are waiting,
// the gate is already sending the learner to the Terms screen and a refused
// request needs nothing more. Otherwise the state is reloaded, which opens it.
export function shouldReloadForTerms(state: OnboardingState | null): boolean {
  return state?.terms.needsAcceptance !== true;
}

// Where the root navigator should send a signed-in learner, or null to stay.
// - "agree" applies everywhere except the legal pages (people read the Terms
//   before agreeing) and account settings / support, where someone who would
//   rather not agree can export their data, delete the account or ask us.
// - "welcome" (first run) only replaces Home: a brand-new learner lands
//   there after signing in. A deep link into a course or a reminder tap is
//   left alone -- first run is an offer, never a wall.
export function gateRedirect(gate: LaunchGate, segments: readonly string[]): string | null {
  if (!gate) return null;
  const [group, first] = segments;
  if (group !== "(app)") return null;
  if (first === gate) return null;
  // REQ-165: the study notice keeps the same escape hatches as the Terms.
  if (gate === "agree" || gate === "notice") {
    if (first === "account" || first === "support") return null;
    return gate === "agree" ? "/agree" : "/notice";
  }
  return first === undefined || first === "index" ? "/welcome" : null;
}
