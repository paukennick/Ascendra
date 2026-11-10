// REQ-197 (Nick, 2026-11-09, voice to text step 1): a one-time tip next to
// the long written-answer fields (labs, explain-it-back, the coach) that the
// phone keyboard's own mic can dictate an answer. iOS and Android only (a
// web keyboard has no mic key), dismissible, shown once per learner: the
// first dismissal hides it on every field (ascendra.dictationHint.<userId>,
// swept at Log out).
//
// Dictation produces long answers quickly, so those fields no longer cut
// text off silently at their limit (a TextInput's maxLength drops whatever
// is dictated past it). They take everything, show how much is over, and
// the send button waits until it fits. No audio is touched here: the
// keyboard does the dictation, and the app only ever sees text.

export const DICTATION_HINT = "Tip: tap the mic on your keyboard to dictate";
export const dictationHintKey = (userId: string) => `ascendra.dictationHint.${userId}`;

export function showDictationHint(platform: string, dismissed: boolean, userId: string | null | undefined): boolean {
  return !!userId && !dismissed && (platform === "ios" || platform === "android");
}

// null while the text fits; otherwise what to tell the learner.
export function lengthProblem(text: string, max: number): string | null {
  if (text.length <= max) return null;
  const over = text.length - max;
  return `${over.toLocaleString("en-US")} character${over === 1 ? "" : "s"} over the ${max.toLocaleString("en-US")} limit. Shorten it a little to send; nothing has been cut.`;
}

// Shown under the field once it gets near the limit.
export function lengthCounter(text: string, max: number): string | null {
  if (text.length < max * 0.9) return null;
  return `${text.length.toLocaleString("en-US")} / ${max.toLocaleString("en-US")}`;
}
