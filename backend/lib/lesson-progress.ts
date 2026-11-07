// REQ-089: validation for the account-level lesson position
// (lesson_progress, migration 025). The app owns the rules for whether a
// saved position may be resumed (mobile/src/lib/lessonProgress.ts); the
// server's job is to store only well-formed, bounded data for the caller.

export const RESUMABLE_STEPS = ["teach", "fade", "solo"] as const;
export type ResumableStep = (typeof RESUMABLE_STEPS)[number];

const MAX_TEXT = 8000;
const MAX_KEY = 64;
const VERDICTS = ["correct", "partial", "incorrect"];

export interface CheckState {
  mode: "mc" | "open";
  picked: number | null;
  openAnswer: string;
  clientAttemptId: string | null;
  sentSignature: string | null;
  // REQ-097: correctIndex / correctAnswer / why arrive only with the verdict
  // (the lesson payload has no answer key), so they are saved with it.
  result: {
    verdict: string;
    feedback: string;
    missedParts: string[];
    correctIndex: number | null;
    correctAnswer: string | null;
    why: string | null;
    assistReason: string | null;
  } | null;
}

export interface LessonProgressInput {
  step: ResumableStep;
  guess: string;
  guessFeedback: string | null;
  confidence: number | null;
  lessonKey: string;
  checks: { fade?: CheckState; solo?: CheckState };
}

function text(v: unknown, max = MAX_TEXT): string | null {
  return typeof v === "string" ? v.slice(0, max) : null;
}

function sanitizeCheck(v: unknown): CheckState | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const r = o.result as Record<string, unknown> | null | undefined;
  const result =
    r && typeof r === "object" && typeof r.verdict === "string" && VERDICTS.includes(r.verdict)
      ? {
          verdict: r.verdict,
          feedback: text(r.feedback) ?? "",
          missedParts: Array.isArray(r.missedParts)
            ? r.missedParts.filter((p): p is string => typeof p === "string").slice(0, 20).map((p) => p.slice(0, 500))
            : [],
          correctIndex:
            Number.isInteger(r.correctIndex) && (r.correctIndex as number) >= 0 && (r.correctIndex as number) < 20
              ? (r.correctIndex as number)
              : null,
          correctAnswer: text(r.correctAnswer),
          why: text(r.why),
          assistReason: r.assistReason === "hint" || r.assistReason === "repeat" ? r.assistReason : null,
        }
      : null;
  return {
    mode: o.mode === "open" ? "open" : "mc",
    picked: Number.isInteger(o.picked) && (o.picked as number) >= 0 && (o.picked as number) < 20 ? (o.picked as number) : null,
    openAnswer: text(o.openAnswer) ?? "",
    clientAttemptId: text(o.clientAttemptId, MAX_KEY),
    sentSignature: text(o.sentSignature),
    result,
  };
}

// Returns the cleaned record, or a string describing why it was rejected.
export function sanitizeLessonProgress(body: unknown): LessonProgressInput | string {
  if (!body || typeof body !== "object") return "body must be an object";
  const o = body as Record<string, unknown>;
  if (typeof o.step !== "string" || !(RESUMABLE_STEPS as readonly string[]).includes(o.step)) {
    return `step must be one of: ${RESUMABLE_STEPS.join(", ")}`;
  }
  if (typeof o.lessonKey !== "string" || !o.lessonKey || o.lessonKey.length > MAX_KEY) {
    return "lessonKey is required (max 64 characters)";
  }
  const c = o.confidence;
  const checksIn = (o.checks && typeof o.checks === "object" ? o.checks : {}) as Record<string, unknown>;
  const checks: LessonProgressInput["checks"] = {};
  const fade = sanitizeCheck(checksIn.fade);
  const solo = sanitizeCheck(checksIn.solo);
  if (fade) checks.fade = fade;
  if (solo) checks.solo = solo;
  return {
    step: o.step as ResumableStep,
    guess: text(o.guess) ?? "",
    guessFeedback: text(o.guessFeedback),
    confidence: Number.isInteger(c) && (c as number) >= 1 && (c as number) <= 5 ? (c as number) : null,
    lessonKey: o.lessonKey,
    checks,
  };
}

// Client attempt ids: what the app sends with each graded answer so a
// retry returns the stored result instead of recording a second attempt.
export function validClientAttemptId(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;
}

// REQ-101: the app's savedAt / clearedAt (ms since epoch, its own clock),
// used to order a save against a delete of the same position. Anything that
// is not a plausible timestamp is treated as absent.
export function validClientTime(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1e14 ? Math.floor(v) : null;
}
