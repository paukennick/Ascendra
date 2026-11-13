// REQ-251: the two style thresholds the distractor lint enforces
// (lib/content-validator.ts distractorProblems) and the item-writing rules
// state (lib/prompts.ts ITEM_WRITING_RULES), in one place with no imports, so
// the prompt and the check cannot drift apart. Before REQ-251 the prompt said
// "parallel in length" with no number and named four of the eight cue words.

// How much longer than the mean distractor the key may be. Short options get
// a few characters of slack: "TCP 443" vs "UDP 53" is not a length cue.
export const KEY_LENGTH_RATIO = 1.25;
export const KEY_LENGTH_SLACK_CHARS = 8;

// The longest the key may be, in characters, for a given mean distractor
// length: flagged only when it exceeds BOTH 1.25x the mean and the mean + 8.
export function keyLengthLimit(meanDistractorLength: number): number {
  return Math.floor(Math.max(KEY_LENGTH_RATIO * meanDistractorLength, meanDistractorLength + KEY_LENGTH_SLACK_CHARS));
}

// Words that let a WRONG option be ruled out on wording alone (unless the
// stem uses the word itself). The right answer may use them when the fact does.
export const ABSOLUTE_WORDS = ["always", "never", "only", "all", "none", "every", "guaranteed", "completely"] as const;
