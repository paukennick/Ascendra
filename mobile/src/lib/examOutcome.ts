// REQ-119 (Audit 3 product, "I took the exam"): checks and the words the
// app answers with. Kind either way: a pass is celebrated without fuss, a
// fail is met as information and a next step, never as a verdict on the
// person; "rather not say" is simply thanked.

export type OutcomeResult = "passed" | "failed" | "not_said";

export interface ExamOutcome {
  id: string;
  track_id: string | null;
  track_title: string | null;
  exam_date: string;
  result: OutcomeResult;
  score: number | null;
}

export const RESULT_LABELS: Record<OutcomeResult, string> = {
  passed: "I passed",
  failed: "I didn't pass this time",
  not_said: "I'd rather not say",
};

export const RESULT_SHORT: Record<OutcomeResult, string> = {
  passed: "Passed",
  failed: "Not passed yet",
  not_said: "Not shared",
};

export function outcomeResponse(result: OutcomeResult): { title: string; message: string } {
  switch (result) {
    case "passed":
      return {
        title: "Congratulations",
        message: "That's your work paying off. Your progress stays here if you want to keep your knowledge fresh.",
      };
    case "failed":
      return {
        title: "Thanks for telling us",
        message:
          "Not passing is common, and plenty of people pass on a later attempt. Everything you've learned is still here. " +
          "When you're ready, your study plan and today's review are a good place to pick back up -- no rush.",
      };
    default:
      return { title: "Thanks", message: "Noted. You can add or change the details any time." };
  }
}

// The score field as typed: blank is fine (optional); otherwise a number
// from 0 to 100000. Returns the number, null for blank, or an error.
export function parseScore(text: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = text.trim().replace(",", ".");
  if (!t) return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return { ok: false, error: "Enter the score as a number, like 750 or 82.5, or leave it blank." };
  const n = Number(t);
  if (n > 100000) return { ok: false, error: "That score is larger than we can store." };
  return { ok: true, value: n };
}

export function outcomeDateError(date: string | null, today: string): string | null {
  if (!date) return "Pick the day you took the exam.";
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  if (date > tomorrow) return "That date is still to come. Pick the day you took it.";
  return null;
}
