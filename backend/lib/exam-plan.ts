// REQ-109: the pure parts of sprints and mock exams -- how many questions
// each exam domain gets, the timer, the results breakdown by domain and by
// pace, and the honest comparison of a mock score with the readiness
// estimate. No database, no model (exam-plan.test.ts).

export const SPRINT_QUESTIONS = 10;
// Used only when the vendor does not publish a pace (no duration or no
// question count). Shown to the learner as an estimate.
export const DEFAULT_SECONDS_PER_QUESTION = 90;
// When the vendor does not publish a question count. Shown as such.
export const DEFAULT_MOCK_QUESTIONS = 50;
export const MAX_MOCK_QUESTIONS = 200;
// Network allowance after the deadline before saves are refused.
export const DEADLINE_GRACE_SECONDS = 30;

// ---------------------------------------------------------------------------
// Domain allocation
// ---------------------------------------------------------------------------

export interface DomainSlot {
  unitId: string;
  weight: number | null;
  objectives: number; // active objectives in the unit
}

// Questions per domain for a mock of `total` questions, by the exam's
// domain weights (course_units.weight, the same weights readiness uses),
// largest-remainder rounding so the counts add up exactly. Same rule as
// lib/readiness.ts: with fewer than two weighted domains there is no
// blueprint and every objective counts the same; inside a blueprinted
// course an unweighted unit is outside the scored exam and gets nothing.
export function allocateByWeight(domains: DomainSlot[], total: number): Map<string, number> {
  const usable = domains.filter((d) => d.objectives > 0);
  const weighted = usable.filter((d) => d.weight != null && d.weight > 0).length >= 2;
  const shares = usable
    .map((d) => ({ id: d.unitId, w: weighted ? (d.weight != null && d.weight > 0 ? d.weight : 0) : d.objectives }))
    .filter((s) => s.w > 0);
  const out = new Map<string, number>();
  const sum = shares.reduce((s, x) => s + x.w, 0);
  if (!sum || total <= 0) return out;
  const raw = shares.map((s) => ({ id: s.id, exact: (s.w / sum) * total }));
  let given = 0;
  for (const r of raw) {
    const n = Math.floor(r.exact);
    out.set(r.id, n);
    given += n;
  }
  const byRemainder = [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; given < total; i = (i + 1) % byRemainder.length) {
    out.set(byRemainder[i].id, (out.get(byRemainder[i].id) ?? 0) + 1);
    given++;
  }
  return out;
}

// Spread `count` questions over a unit's objectives as evenly as possible,
// starting from a shuffled order so repeated mocks hit different ones.
export function spreadOverObjectives<T>(objectives: T[], count: number, shuffle: <U>(xs: U[]) => U[]): T[] {
  if (!objectives.length || count <= 0) return [];
  const order = shuffle(objectives);
  return Array.from({ length: count }, (_, i) => order[i % order.length]);
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

export interface TimerPlan {
  timeLimitSeconds: number | null;
  secondsPerQuestion: number | null;
  // How the time was set, for the learner:
  //   exam      the vendor's published duration
  //   estimate  no published duration; DEFAULT_SECONDS_PER_QUESTION each
  //   untimed   the learner chose untimed
  basis: "exam" | "estimate" | "untimed";
}

export function examPaceSeconds(durationMinutes: number | null, questionCount: number | null): number | null {
  if (!durationMinutes || !questionCount) return null;
  return Math.round((durationMinutes * 60) / questionCount);
}

export function sprintTimer(opts: { timed: boolean; durationMinutes: number | null; questionCount: number | null }): TimerPlan {
  if (!opts.timed) return { timeLimitSeconds: null, secondsPerQuestion: null, basis: "untimed" };
  const pace = examPaceSeconds(opts.durationMinutes, opts.questionCount);
  const per = pace ?? DEFAULT_SECONDS_PER_QUESTION;
  return { timeLimitSeconds: per * SPRINT_QUESTIONS, secondsPerQuestion: per, basis: pace ? "exam" : "estimate" };
}

// The mock's timer is the exam's full duration when the mock has the exam's
// full length; when fewer questions could be prepared, the time scales down
// with them so the pace stays the exam's.
export function mockTimer(opts: {
  timed: boolean;
  durationMinutes: number | null;
  examQuestions: number | null;
  mockQuestions: number;
}): TimerPlan {
  if (!opts.timed) return { timeLimitSeconds: null, secondsPerQuestion: null, basis: "untimed" };
  const pace = examPaceSeconds(opts.durationMinutes, opts.examQuestions);
  if (pace && opts.durationMinutes) {
    const full = opts.durationMinutes * 60;
    const limit = opts.mockQuestions >= (opts.examQuestions ?? 0) ? full : pace * opts.mockQuestions;
    return { timeLimitSeconds: limit, secondsPerQuestion: pace, basis: "exam" };
  }
  return {
    timeLimitSeconds: DEFAULT_SECONDS_PER_QUESTION * opts.mockQuestions,
    secondsPerQuestion: DEFAULT_SECONDS_PER_QUESTION,
    basis: "estimate",
  };
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface GradedItemSummary {
  unitId: string;
  unitTitle: string;
  unitWeight: number | null;
  credited: boolean;
  partial: number;
  answered: boolean;
  flagged: boolean;
  timeSpentMs: number;
}

export interface DomainResult {
  unitId: string;
  title: string;
  weight: number | null;
  questions: number;
  correct: number;
  percent: number;
  averageSeconds: number;
  // Too few questions to read much into (shown as such).
  smallSample: boolean;
}

export const SMALL_SAMPLE = 5;

export function domainBreakdown(items: GradedItemSummary[]): DomainResult[] {
  const by = new Map<string, GradedItemSummary[]>();
  for (const it of items) by.set(it.unitId, [...(by.get(it.unitId) ?? []), it]);
  return [...by.values()].map((list) => {
    const correct = list.filter((i) => i.credited).length;
    return {
      unitId: list[0].unitId,
      title: list[0].unitTitle,
      weight: list[0].unitWeight,
      questions: list.length,
      correct,
      percent: Math.round((correct / list.length) * 100),
      averageSeconds: Math.round(list.reduce((s, i) => s + i.timeSpentMs, 0) / list.length / 1000),
      smallSample: list.length < SMALL_SAMPLE,
    };
  });
}

export interface Pacing {
  usedSeconds: number;
  timeLimitSeconds: number | null;
  averageSeconds: number;
  targetSeconds: number | null; // the exam's pace per question, if known
  unanswered: number;
  flagged: number;
  // Questions that took over twice the target (or twice the average when
  // there is no target): where the time went.
  slowQuestions: number[]; // 1-based question numbers
  lines: string[];
}

export function pacingSummary(
  items: GradedItemSummary[],
  opts: { usedSeconds: number; timeLimitSeconds: number | null; targetSeconds: number | null }
): Pacing {
  const n = items.length || 1;
  const avg = Math.round(items.reduce((s, i) => s + i.timeSpentMs, 0) / n / 1000);
  const ref = opts.targetSeconds ?? avg;
  const slow = items
    .map((it, i) => ({ q: i + 1, s: it.timeSpentMs / 1000 }))
    .filter((x) => ref > 0 && x.s > 2 * ref)
    .map((x) => x.q);
  const unanswered = items.filter((i) => !i.answered).length;
  const flagged = items.filter((i) => i.flagged).length;
  const lines: string[] = [];
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  lines.push(
    opts.timeLimitSeconds
      ? `You used ${mmss(opts.usedSeconds)} of ${mmss(opts.timeLimitSeconds)}.`
      : `You took ${mmss(opts.usedSeconds)} (untimed).`
  );
  if (opts.targetSeconds) {
    const verdict =
      avg <= opts.targetSeconds ? "inside the exam's pace" : "slower than the exam's pace, which is worth practicing";
    lines.push(`About ${avg} seconds a question against the exam's ${opts.targetSeconds}: ${verdict}.`);
  } else {
    lines.push(`About ${avg} seconds a question.`);
  }
  if (slow.length) lines.push(`Question${slow.length > 1 ? "s" : ""} ${slow.join(", ")} took more than twice that.`);
  if (unanswered) lines.push(`${unanswered} left unanswered. On the real exam a blank scores the same as a wrong answer, so always pick something.`);
  return {
    usedSeconds: opts.usedSeconds,
    timeLimitSeconds: opts.timeLimitSeconds,
    averageSeconds: avg,
    targetSeconds: opts.targetSeconds,
    unanswered,
    flagged,
    slowQuestions: slow,
    lines,
  };
}

// ---------------------------------------------------------------------------
// Mock score vs readiness
// ---------------------------------------------------------------------------

export interface ReadinessSnapshot {
  status: "no_evidence" | "not_enough_evidence" | "building" | "ready";
  readinessPercent: number;
  coveragePercent: number;
  accuracyPercent: number | null;
}

export interface ReadinessComparison {
  mockPercent: number;
  // Roughly a 95% range on the mock score from its number of questions.
  marginPoints: number;
  readinessPercent: number | null;
  coveragePercent: number | null;
  agreement: "agree" | "mock_higher" | "mock_lower" | "not_comparable";
  lines: string[];
}

// Agresti-Coull 95% half-width, in percentage points. Honest about how much
// a 10- or 65-question sample can say.
export function marginOfError(correct: number, n: number): number {
  if (n <= 0) return 100;
  const z = 1.96;
  const nt = n + z * z;
  const p = (correct + (z * z) / 2) / nt;
  return Math.round(z * Math.sqrt((p * (1 - p)) / nt) * 100);
}

export function compareWithReadiness(correct: number, n: number, before: ReadinessSnapshot | null): ReadinessComparison {
  const mockPercent = n ? Math.round((correct / n) * 100) : 0;
  const margin = marginOfError(correct, n);
  const head = `Mock score ${mockPercent}% (${correct} of ${n} fully right; give or take about ${margin} points with this many questions).`;
  const scaled =
    "Vendors report a scaled score, not a percentage, so this is not a predicted exam score.";
  if (!before || before.status === "no_evidence" || before.status === "not_enough_evidence") {
    return {
      mockPercent,
      marginPoints: margin,
      readinessPercent: before?.readinessPercent ?? null,
      coveragePercent: before?.coveragePercent ?? null,
      agreement: "not_comparable",
      lines: [
        head,
        before
          ? `Your readiness estimate didn't have enough evidence yet to compare with (you had practiced ${before.coveragePercent}% of the blueprint), so this mock is the better read for now.`
          : "There was no readiness estimate to compare with.",
        scaled,
      ],
    };
  }
  const r = before.readinessPercent;
  const diff = mockPercent - r;
  const tolerance = Math.max(margin, 10);
  const agreement = Math.abs(diff) <= tolerance ? "agree" : diff > 0 ? "mock_higher" : "mock_lower";
  const second = {
    agree: `Your readiness estimate was ${r}% when you started, which agrees with the mock within that margin. Two different measures pointing the same way is a good sign the estimate is trustworthy.`,
    mock_higher: `Your readiness estimate was ${r}%, lower than the mock. Readiness only counts what you've practiced in the app (${before.coveragePercent}% of the blueprint) and discounts thin evidence, so it can run low when you know material you haven't drilled here.`,
    mock_lower: `Your readiness estimate was ${r}%, higher than the mock. Mixed, timed questions are harder than practicing one objective at a time, and that gap is useful: the domains below show where it is.`,
  }[agreement];
  return {
    mockPercent,
    marginPoints: margin,
    readinessPercent: r,
    coveragePercent: before.coveragePercent,
    agreement,
    lines: [head, second, scaled],
  };
}
