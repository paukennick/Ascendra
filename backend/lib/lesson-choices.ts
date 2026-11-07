// REQ-089: multiple-choice answers in cached lessons.
//
// Merged 2026-11-07: serving and grading now go through lib/choice-order.ts
// (line A, REQ-134: a fixed per-learner shuffle and server-side keys), which
// gives the same guarantees. These helpers stay for text matching
// (storedIndexOfText, used by /api/grade) and their tests.
//
// Two problems this closes:
// - The generator put the right answer first in 49 of 52 cached questions,
//   so "pick the first option" scored well. Choices are now shuffled every
//   time a lesson is served, and the served lesson no longer says which
//   option is right.
// - The app used to send the right answer's position along with the
//   learner's pick, and the server just compared the two, so a modified app
//   could award itself mastery. The server now looks the answer up in the
//   cached lesson and grades the learner's chosen text against it.

export interface StoredChoices {
  choices: string[];
  correctIndex: number;
  why: string;
  // One explanation per choice, same order as `choices`. Null for lessons
  // cached before REQ-089, which only explained the right answer.
  choiceFeedback: string[] | null;
}

// Fisher-Yates. `random` is injectable so tests can pin the order.
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface ChoiceGrade {
  correct: boolean;
  feedback: string;
}

// Grades a pick by its text, so it works whatever order the learner saw.
// Returns null when the text is not one of the lesson's choices.
export function gradeChoice(stored: StoredChoices, chosenText: string): ChoiceGrade | null {
  const picked = stored.choices.findIndex((c) => c.trim() === chosenText.trim());
  if (picked < 0) return null;
  const correct = picked === stored.correctIndex;
  const pickedNote = stored.choiceFeedback?.[picked]?.trim();
  if (correct) {
    return { correct, feedback: `That's right. ${pickedNote || stored.why}`.trim() };
  }
  // Wrong: say why their pick is wrong (when we have it), then what is right.
  const right = stored.choices[stored.correctIndex];
  const parts = ["Not quite."];
  if (pickedNote) parts.push(pickedNote);
  parts.push(`The best answer is "${right}": ${stored.why}`);
  return { correct, feedback: parts.join(" ").trim() };
}

// Release 2026-11-07 merge: the stored position of a choice given its exact
// text, or null when it is not one of them (or matches more than one).
// /api/grade uses it for clients that send chosenText instead of chosenIndex.
export function storedIndexOfText(choices: readonly string[], chosenText: string): number | null {
  const want = chosenText.trim();
  const hits = choices.map((c, i) => (c.trim() === want ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : null;
}
