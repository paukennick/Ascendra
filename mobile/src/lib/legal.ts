// REQ-119 (Audit 3 product H5): the Terms of Service + Privacy Policy
// version this app shows: the newest of the Terms and Privacy versions in
// src/content/legal.ts, and equal to CURRENT_TERMS_VERSION in
// backend/lib/legal.ts (src/lib/productBasics.test.ts checks both): the app
// sends it when someone signs up, and the server records it only if it is
// the current one. Change both, together with the pages, when the text
// changes in a way people should agree to again.
export const TERMS_VERSION = "2026-11-09";

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
