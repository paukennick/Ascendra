// REQ-109: confidence calibration. Every answer can carry a 1-5 confidence
// ("guessing" .. "certain"); after a sprint or mock this compares how sure
// the learner felt with how often they were right. Pure arithmetic, no model
// call.
//
// Three bands keep it readable on a phone and need fewer answers per band
// than five would: unsure (1-2), in between (3), sure (4-5). "Right" means
// fully right (the exam-style credit), so a half-right ordering item is not
// counted as right here.
//
// The coaching is deliberately gentle: a confident miss is framed as the
// most useful kind of information, not a failing.

export type CalibrationBand = "unsure" | "middle" | "sure";

export interface CalibrationInput {
  confidence: number | null;
  correct: boolean;
}

export interface BandSummary {
  band: CalibrationBand;
  label: string;
  answered: number;
  correct: number;
  accuracyPercent: number | null;
}

export interface Calibration {
  rated: number; // answers with a confidence
  unrated: number;
  bands: BandSummary[];
  // Plain sentences, e.g. "When you were sure, you were right 9 of 10."
  lines: string[];
  coaching: string[];
}

// A band needs at least this many answers before we say anything about it.
export const MIN_BAND = 3;

export function bandOf(confidence: number): CalibrationBand {
  if (confidence <= 2) return "unsure";
  if (confidence === 3) return "middle";
  return "sure";
}

const LABELS: Record<CalibrationBand, string> = {
  unsure: "unsure (1-2)",
  middle: "in between (3)",
  sure: "sure (4-5)",
};

const PHRASE: Record<CalibrationBand, string> = {
  unsure: "When you were unsure",
  middle: "When you were in between",
  sure: "When you were sure",
};

export function calibrate(answers: CalibrationInput[]): Calibration {
  const rated = answers.filter((a) => Number.isInteger(a.confidence) && a.confidence! >= 1 && a.confidence! <= 5);
  const bands: BandSummary[] = (["sure", "middle", "unsure"] as CalibrationBand[]).map((band) => {
    const inBand = rated.filter((a) => bandOf(a.confidence!) === band);
    const correct = inBand.filter((a) => a.correct).length;
    return {
      band,
      label: LABELS[band],
      answered: inBand.length,
      correct,
      accuracyPercent: inBand.length ? Math.round((correct / inBand.length) * 100) : null,
    };
  });

  const lines = bands
    .filter((b) => b.answered > 0)
    .map((b) => `${PHRASE[b.band]}, you were right ${b.correct} of ${b.answered}.`);

  const by = Object.fromEntries(bands.map((b) => [b.band, b])) as Record<CalibrationBand, BandSummary>;
  const enough = (b: BandSummary) => b.answered >= MIN_BAND;
  const acc = (b: BandSummary) => b.correct / b.answered;
  const coaching: string[] = [];

  if (rated.length < MIN_BAND) {
    coaching.push(
      "Rate how sure you are on a few more questions and a pattern will show up here. It's one tap, and it tells you which right answers were luck."
    );
  } else {
    if (enough(by.sure) && acc(by.sure) < 0.7) {
      coaching.push(
        "Some answers you felt sure about were wrong. Those are the most useful misses you can have: they point at an idea that feels familiar but has a gap. Before locking in a confident answer, check it against the exact wording of the question."
      );
    }
    if (enough(by.unsure) && acc(by.unsure) >= 0.7) {
      coaching.push(
        "You were right most of the time when you felt unsure, so you know more than you're giving yourself credit for. Trust your first reasoned answer a bit more, and save second-guessing for questions where you can name a specific doubt."
      );
    }
    if (enough(by.unsure) && acc(by.unsure) < 0.5 && (!enough(by.sure) || acc(by.sure) >= 0.7)) {
      coaching.push(
        "Your sense of what you don't know is accurate. Flagging the questions you're unsure about and coming back to them is a good use of time on the real exam."
      );
    }
    if (enough(by.sure) && acc(by.sure) >= 0.85 && !coaching.length) {
      coaching.push("When you feel sure you're usually right, so your confidence is a good guide to where to spend review time.");
    }
    if (!coaching.length) {
      coaching.push("No strong pattern yet. Keep rating your confidence; it gets clearer with more answers.");
    }
  }

  return { rated: rated.length, unrated: answers.length - rated.length, bands, lines, coaching };
}
