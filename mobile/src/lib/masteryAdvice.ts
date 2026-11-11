// What a mastery level just reached means, and the one concrete thing that
// moves it up. Shown under the level at the end of a lesson.
//
// The rule lives in the database (mastery_detail(), backend migrations 045
// and 074; thresholds in mastery_model_params). REQ-228 (FAIL-1262): this
// text said a correct solo answer "earns Independent" after migration 074
// (REQ-218) made Independent need a second correct unassisted answer at least
// 24 hours after the first. Change this file in the same PR as the rule;
// masteryAdvice.test.ts pins the parts that must stay true.
import type { MasteryStatus } from "../types";

export function masteryAdvice(status: MasteryStatus | null): string {
  switch (status) {
    case "Transfer-ready":
      return "Top of the rubric: you've answered on your own, correctly, in more than one way and days apart. Today's review will still bring it back if you ever miss it.";
    case "Independent":
      return "Confirmed: you got it right on your own twice, a day or more apart. To make it Transfer-ready, get it right on your own a different way too (a scenario, a review or explaining it back), three or more days after your first.";
    case "Guided":
      return "Guided practice, the choices hint, or a question you'd answered before tops out here. To earn Independent, answer on your own in your own words, then once more a day or more later. Today's review brings it back.";
    case "Introduced":
      return "Not there yet -- the explanation is one tap back, and this objective will come up for review.";
    case "Needs review":
      return "This one is flagged for review. Re-read the explanation and try the solo check in your own words.";
    default:
      return "Pick up the next objective, or revisit this one.";
  }
}

// Under the solo check, before it is answered.
export const SOLO_OPEN_NOTE =
  "Answer in your own words -- a correct answer counts toward Independent, and one more a day or more later confirms it.";
export const SOLO_HINT_NOTE = "Choices are a hint: a correct multiple-choice answer caps mastery at Guided.";
