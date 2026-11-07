// Pure scoring, sampling and aggregation for the offline evals (lessons.ts,
// grading.ts). Nothing here touches the network, the database or the
// filesystem, so it is unit-tested with plain objects (scoring.test.ts).
import { z } from "zod";

// ---------------------------------------------------------------------------
// Lesson rubric
// ---------------------------------------------------------------------------

// The criteria, drawn from the coach rules in lib/prompts.ts (coachRules).
export const LESSON_CRITERIA = [
  "terms_defined", // every named term defined
  "one_worked_example", // exactly one worked example, traced step by step
  "misconception_named", // a common mistake/misconception named
  "in_scope", // stays within the objective's scope
  "choices_distinct_plausible", // four choices distinct (code) and plausible (judge), both questions
  "fade_key_correct", // stored fadeCorrectIndex matches an independent solve
  "solo_key_correct", // stored soloCorrectIndex matches an independent solve
  "explanation_length", // teach and the *Why lines within length bounds (code)
] as const;
export type Criterion = (typeof LESSON_CRITERIA)[number];

// Length bounds are a judgement call, not a spec: the prompt asks for ONE
// short worked example and "one short sentence" of why. Tune after reading
// the first run's real distribution.
export const LENGTH_LIMITS = {
  teachMinWords: 80,
  teachMaxWords: 650,
  whyMaxWords: 40,
  whyMaxSentences: 2,
} as const;

export interface LessonContentLike {
  guessPrompt: string;
  teach: string;
  fadeProblem: string;
  fadeChoices: string[];
  fadeCorrectIndex: number;
  fadeWhy: string;
  soloCheck: string;
  soloChoices: string[];
  soloCorrectIndex: number;
  soloWhy: string;
}

// What the rubric judge returns (structured output). It is shown the lesson
// WITHOUT the stored answer indexes, and judges only what needs reading.
const item = z.object({ note: z.string(), pass: z.boolean() });
export const rubricJudgeSchema = z.object({
  termsDefined: item.extend({
    namedTerms: z.array(z.string()).describe("Every technical term the objective title or the lesson names."),
    undefinedTerms: z.array(z.string()).describe("Those of namedTerms the teach text never explicitly defines."),
  }),
  oneWorkedExample: item.describe(
    "pass only if the teach text contains exactly ONE worked example and it is traced step by step."
  ),
  misconceptionNamed: item.describe("pass only if a specific common mistake or misconception is named."),
  inScope: item.describe(
    "pass only if every part of the lesson stays within what the objective asks, and questions need nothing untaught."
  ),
  fadeChoicesPlausible: item.describe("pass only if all four fadeChoices are plausible, none silly filler."),
  soloChoicesPlausible: item.describe("pass only if all four soloChoices are plausible, none silly filler."),
});
export type RubricJudgement = z.infer<typeof rubricJudgeSchema>;

// The judge's independent attempt at the two multiple-choice questions, made
// without seeing the stored keys or the *Why explanations. Reasoning is listed
// first so it is written before the answer.
export const solveSchema = z.object({
  fadeReasoning: z.string(),
  fadeAnswerIndex: z.number().int().min(0).max(3),
  soloReasoning: z.string(),
  soloAnswerIndex: z.number().int().min(0).max(3),
});
export type IndependentSolve = z.infer<typeof solveSchema>;

export interface CriterionResult {
  pass: boolean;
  note: string;
}
export interface LessonScore {
  criteria: Record<Criterion, CriterionResult>;
  allPass: boolean;
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function sentenceCount(text: string): number {
  const parts = text.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/);
  return text.trim() ? parts.length : 0;
}

function normalizeChoice(c: string): string {
  return c.toLowerCase().replace(/\s+/g, " ").replace(/[.\s]+$/g, "").trim();
}

export function choicesDistinct(choices: string[]): boolean {
  return choices.length === 4 && new Set(choices.map(normalizeChoice)).size === 4;
}

export function checkExplanationLength(lesson: LessonContentLike): CriterionResult {
  const L = LENGTH_LIMITS;
  const problems: string[] = [];
  const teachWords = wordCount(lesson.teach);
  if (teachWords < L.teachMinWords) problems.push(`teach is ${teachWords} words (min ${L.teachMinWords})`);
  if (teachWords > L.teachMaxWords) problems.push(`teach is ${teachWords} words (max ${L.teachMaxWords})`);
  for (const [name, text] of [["fadeWhy", lesson.fadeWhy], ["soloWhy", lesson.soloWhy]] as const) {
    const w = wordCount(text);
    const s = sentenceCount(text);
    if (w > L.whyMaxWords) problems.push(`${name} is ${w} words (max ${L.whyMaxWords})`);
    if (s > L.whyMaxSentences) problems.push(`${name} is ${s} sentences (max ${L.whyMaxSentences})`);
  }
  return { pass: problems.length === 0, note: problems.join("; ") || `teach ${teachWords} words` };
}

export function scoreLesson(
  lesson: LessonContentLike,
  rubric: RubricJudgement,
  solve: IndependentSolve
): LessonScore {
  const fadeDistinct = choicesDistinct(lesson.fadeChoices);
  const soloDistinct = choicesDistinct(lesson.soloChoices);
  const choicesNotes: string[] = [];
  if (!fadeDistinct) choicesNotes.push("fadeChoices are not four distinct strings");
  if (!soloDistinct) choicesNotes.push("soloChoices are not four distinct strings");
  if (!rubric.fadeChoicesPlausible.pass) choicesNotes.push(`fade: ${rubric.fadeChoicesPlausible.note}`);
  if (!rubric.soloChoicesPlausible.pass) choicesNotes.push(`solo: ${rubric.soloChoicesPlausible.note}`);

  const keyResult = (stored: number, independent: number, label: string, reasoning: string): CriterionResult =>
    stored === independent
      ? { pass: true, note: `stored and independent answers agree (${stored})` }
      : { pass: false, note: `${label}: stored index ${stored}, independent solve chose ${independent}. ${reasoning}`.trim() };

  const criteria: Record<Criterion, CriterionResult> = {
    terms_defined: {
      pass: rubric.termsDefined.pass && rubric.termsDefined.undefinedTerms.length === 0,
      note: rubric.termsDefined.undefinedTerms.length
        ? `not defined: ${rubric.termsDefined.undefinedTerms.join(", ")}`
        : rubric.termsDefined.note,
    },
    one_worked_example: rubric.oneWorkedExample,
    misconception_named: rubric.misconceptionNamed,
    in_scope: rubric.inScope,
    choices_distinct_plausible: {
      pass: fadeDistinct && soloDistinct && rubric.fadeChoicesPlausible.pass && rubric.soloChoicesPlausible.pass,
      note: choicesNotes.join("; ") || "distinct and plausible",
    },
    fade_key_correct: keyResult(lesson.fadeCorrectIndex, solve.fadeAnswerIndex, "fade", solve.fadeReasoning),
    solo_key_correct: keyResult(lesson.soloCorrectIndex, solve.soloAnswerIndex, "solo", solve.soloReasoning),
    explanation_length: checkExplanationLength(lesson),
  };
  return { criteria, allPass: LESSON_CRITERIA.every((c) => criteria[c].pass) };
}

// ---------------------------------------------------------------------------
// Deterministic stratified sampling
// ---------------------------------------------------------------------------

export interface Sampleable {
  id: string;
  stratum: string;
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: small seeded PRNG, so a sample depends only on (data, n, seed).
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How many to take from each stratum: one each first (if n allows), the rest
// in proportion to size, largest remainder breaking ties, never above a
// stratum's size.
export function allocateStrata(sizes: Record<string, number>, n: number): Record<string, number> {
  const keys = Object.keys(sizes).sort();
  const total = keys.reduce((s, k) => s + sizes[k], 0);
  const want = Math.max(0, Math.min(n, total));
  const alloc: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  if (want === 0) return alloc;

  let remaining = want;
  if (want >= keys.filter((k) => sizes[k] > 0).length) {
    for (const k of keys) if (sizes[k] > 0) {
      alloc[k] = 1;
      remaining--;
    }
  }
  const cap = (k: string) => sizes[k] - alloc[k];
  const capSum = keys.reduce((s, k) => s + cap(k), 0);
  if (remaining > 0 && capSum > 0) {
    const exact = Object.fromEntries(keys.map((k) => [k, (remaining * cap(k)) / capSum]));
    for (const k of keys) {
      const f = Math.floor(exact[k]);
      alloc[k] += f;
      remaining -= f;
    }
    while (remaining > 0) {
      const candidates = keys
        .filter((k) => cap(k) > 0)
        .sort((a, b) => exact[b] - Math.floor(exact[b]) - (exact[a] - Math.floor(exact[a])) || (a < b ? -1 : 1));
      if (!candidates.length) break;
      for (const k of candidates) {
        if (remaining === 0) break;
        alloc[k]++;
        remaining--;
        exact[k] = Math.floor(exact[k]); // spent its fractional claim
      }
    }
  }
  return alloc;
}

export function stratifiedSample<T extends Sampleable>(items: T[], n: number, seed: string): T[] {
  const byStratum = new Map<string, T[]>();
  for (const it of items) {
    const list = byStratum.get(it.stratum) ?? [];
    list.push(it);
    byStratum.set(it.stratum, list);
  }
  const sizes = Object.fromEntries([...byStratum].map(([k, v]) => [k, v.length]));
  const alloc = allocateStrata(sizes, n);
  const out: T[] = [];
  for (const stratum of Object.keys(alloc).sort()) {
    const pool = [...byStratum.get(stratum)!].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const rand = rng(hash32(`${seed}:${stratum}`));
    // Fisher-Yates with the seeded generator, then take the first k.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    out.push(...pool.slice(0, alloc[stratum]));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lesson aggregation and run comparison
// ---------------------------------------------------------------------------

export interface LessonEvalRecord {
  objectiveId: string;
  objective: string;
  trackTitle: string;
  trackType: string;
  // Exactly one of score / error.
  score?: LessonScore;
  error?: string;
}

export interface Rate {
  pass: number;
  total: number;
  rate: number; // 0..1; 0 when total is 0
}

export type PassRates = Record<Criterion, Rate>;

export interface LessonSummary {
  total: number;
  scored: number;
  errors: number;
  passRates: PassRates;
  allPass: Rate;
  byTrackType: Record<string, { scored: number; allPass: Rate; passRates: PassRates }>;
}

function rate(pass: number, total: number): Rate {
  return { pass, total, rate: total === 0 ? 0 : pass / total };
}

function passRatesOf(scores: LessonScore[]): PassRates {
  return Object.fromEntries(
    LESSON_CRITERIA.map((c) => [c, rate(scores.filter((s) => s.criteria[c].pass).length, scores.length)])
  ) as PassRates;
}

export function aggregateLessons(records: LessonEvalRecord[]): LessonSummary {
  const scored = records.filter((r): r is LessonEvalRecord & { score: LessonScore } => !!r.score);
  const scores = scored.map((r) => r.score);
  const byTrackType: LessonSummary["byTrackType"] = {};
  for (const type of [...new Set(scored.map((r) => r.trackType))].sort()) {
    const s = scored.filter((r) => r.trackType === type).map((r) => r.score);
    byTrackType[type] = {
      scored: s.length,
      allPass: rate(s.filter((x) => x.allPass).length, s.length),
      passRates: passRatesOf(s),
    };
  }
  return {
    total: records.length,
    scored: scored.length,
    errors: records.length - scored.length,
    passRates: passRatesOf(scores),
    allPass: rate(scores.filter((s) => s.allPass).length, scores.length),
    byTrackType,
  };
}

export interface LessonRunComparison {
  criteria: { criterion: Criterion; a: number; b: number; delta: number }[];
  allPass: { a: number; b: number; delta: number };
  // Objectives present in both runs whose pass/fail on a criterion flipped.
  flipped: { objectiveId: string; objective: string; criterion: Criterion; from: boolean; to: boolean }[];
  onlyInA: number;
  onlyInB: number;
  commonObjectives: number;
}

// a = baseline, b = candidate. delta = b - a, in rate points (0..1).
export function compareLessonRuns(a: LessonEvalRecord[], b: LessonEvalRecord[]): LessonRunComparison {
  const sa = aggregateLessons(a);
  const sb = aggregateLessons(b);
  const mapB = new Map(b.map((r) => [r.objectiveId, r]));
  const mapA = new Map(a.map((r) => [r.objectiveId, r]));
  const flipped: LessonRunComparison["flipped"] = [];
  let common = 0;
  for (const ra of a) {
    const rb = mapB.get(ra.objectiveId);
    if (!rb) continue;
    common++;
    if (!ra.score || !rb.score) continue;
    for (const c of LESSON_CRITERIA) {
      const from = ra.score.criteria[c].pass;
      const to = rb.score.criteria[c].pass;
      if (from !== to) flipped.push({ objectiveId: ra.objectiveId, objective: ra.objective, criterion: c, from, to });
    }
  }
  return {
    criteria: LESSON_CRITERIA.map((criterion) => ({
      criterion,
      a: sa.passRates[criterion].rate,
      b: sb.passRates[criterion].rate,
      delta: sb.passRates[criterion].rate - sa.passRates[criterion].rate,
    })),
    allPass: { a: sa.allPass.rate, b: sb.allPass.rate, delta: sb.allPass.rate - sa.allPass.rate },
    flipped,
    onlyInA: a.filter((r) => !mapB.has(r.objectiveId)).length,
    onlyInB: b.filter((r) => !mapA.has(r.objectiveId)).length,
    commonObjectives: common,
  };
}

// ---------------------------------------------------------------------------
// Grading eval
// ---------------------------------------------------------------------------

export type Verdict = "correct" | "partial" | "incorrect";
export const VERDICTS: readonly Verdict[] = ["correct", "partial", "incorrect"];

export interface GradingCase {
  id: string;
  domain: string; // e.g. "security-plus", "aws-saa", "ccrn", "pt"
  tags: string[]; // e.g. "multi-part-skipped", "terse-correct", "confidently-wrong"
  track: {
    trackTitle: string;
    trackType?: string;
    credentialName?: string;
    providerName?: string;
    examCode?: string;
    categorySlug?: string;
    categoryName?: string;
  };
  question: string;
  taughtText: string;
  answer: string;
  expectedVerdict: Verdict;
  expectedMissedParts: string[];
  note?: string;
  // Audit 3 M5: what production passes the grader as the reference answer.
  referenceAnswer?: string;
}

export interface GradeOutput {
  verdict: Verdict;
  feedback: string;
  classification: string;
  missedParts?: string[];
}

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "not", "are", "was", "were", "its", "their", "which",
  "how", "why", "what", "when", "does", "did", "have", "has", "had", "but", "any", "all", "can", "may",
  "part", "step", "sub", "explain", "describe", "state", "name", "identify", "give",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

// Heuristic match of one expected missed-part label against what the model
// listed: at least half of the label's content words appear in a single
// reported part. Deliberately forgiving about wording; the eval's per-case
// output lists every reported part so a human can overrule it.
export function partMatches(expected: string, actual: string[]): boolean {
  const want = new Set(tokens(expected));
  if (want.size === 0) return false;
  const need = Math.ceil(want.size / 2);
  return actual.some((a) => {
    const have = new Set(tokens(a));
    let hit = 0;
    for (const t of want) if (have.has(t)) hit++;
    return hit >= need;
  });
}

export interface GradingCaseScore {
  verdictMatch: boolean;
  // Did the grader report any missed part exactly when one was expected?
  missedPresenceMatch: boolean;
  // Share of expected missed parts the grader reported (null: none expected).
  missedRecall: number | null;
  // Parts the grader reported when none were expected (over-flagging).
  unexpectedMissedParts: number;
}

export function scoreGradingCase(c: GradingCase, out: GradeOutput): GradingCaseScore {
  const actual = out.missedParts ?? [];
  const expected = c.expectedMissedParts;
  return {
    verdictMatch: out.verdict === c.expectedVerdict,
    missedPresenceMatch: (expected.length > 0) === (actual.length > 0),
    missedRecall: expected.length === 0 ? null : expected.filter((e) => partMatches(e, actual)).length / expected.length,
    unexpectedMissedParts: expected.length === 0 ? actual.length : 0,
  };
}

export interface GradingEvalRecord {
  case: GradingCase;
  output?: GradeOutput;
  score?: GradingCaseScore;
  error?: string;
}

export interface GradingSummary {
  total: number;
  scored: number;
  errors: number;
  verdictAgreement: Rate;
  // confusion[expected][actual]
  confusion: Record<Verdict, Record<Verdict, number>>;
  // The two costly directions for a learner-facing grader.
  tooLenient: number; // graded higher than expected (incorrect->partial/correct, partial->correct)
  tooHarsh: number;
  missedPresenceAgreement: Rate;
  missedRecall: { mean: number; cases: number };
  overFlagged: Rate; // cases with no expected parts where the grader still listed some
  byDomain: Record<string, Rate>;
  byTag: Record<string, Rate>;
  disagreements: string[]; // case ids with a wrong verdict
}

const RANK: Record<Verdict, number> = { incorrect: 0, partial: 1, correct: 2 };

export function aggregateGrading(records: GradingEvalRecord[]): GradingSummary {
  const scored = records.filter((r): r is GradingEvalRecord & { output: GradeOutput; score: GradingCaseScore } => !!r.score && !!r.output);
  const confusion = Object.fromEntries(
    VERDICTS.map((e) => [e, Object.fromEntries(VERDICTS.map((a) => [a, 0]))])
  ) as GradingSummary["confusion"];
  let tooLenient = 0;
  let tooHarsh = 0;
  for (const r of scored) {
    confusion[r.case.expectedVerdict][r.output.verdict]++;
    const d = RANK[r.output.verdict] - RANK[r.case.expectedVerdict];
    if (d > 0) tooLenient++;
    if (d < 0) tooHarsh++;
  }
  const group = (key: (c: GradingCase) => string[]): Record<string, Rate> => {
    const acc = new Map<string, { pass: number; total: number }>();
    for (const r of scored) {
      for (const k of key(r.case)) {
        const cur = acc.get(k) ?? { pass: 0, total: 0 };
        cur.total++;
        if (r.score.verdictMatch) cur.pass++;
        acc.set(k, cur);
      }
    }
    return Object.fromEntries([...acc].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, rate(v.pass, v.total)]));
  };
  const recalls = scored.map((r) => r.score.missedRecall).filter((x): x is number => x !== null);
  const noneExpected = scored.filter((r) => r.case.expectedMissedParts.length === 0);
  return {
    total: records.length,
    scored: scored.length,
    errors: records.length - scored.length,
    verdictAgreement: rate(scored.filter((r) => r.score.verdictMatch).length, scored.length),
    confusion,
    tooLenient,
    tooHarsh,
    missedPresenceAgreement: rate(scored.filter((r) => r.score.missedPresenceMatch).length, scored.length),
    missedRecall: { mean: recalls.length ? recalls.reduce((a, b) => a + b, 0) / recalls.length : 0, cases: recalls.length },
    overFlagged: rate(noneExpected.filter((r) => r.score.unexpectedMissedParts > 0).length, noneExpected.length),
    byDomain: group((c) => [c.domain]),
    byTag: group((c) => c.tags),
    disagreements: scored.filter((r) => !r.score.verdictMatch).map((r) => r.case.id),
  };
}

// Validates grading-cases.json before any API call is made.
export const gradingCaseSchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  tags: z.array(z.string()),
  track: z.object({
    trackTitle: z.string(),
    trackType: z.string().optional(),
    credentialName: z.string().optional(),
    providerName: z.string().optional(),
    examCode: z.string().optional(),
    categorySlug: z.string().optional(),
    categoryName: z.string().optional(),
  }),
  question: z.string().min(1),
  taughtText: z.string().min(1),
  answer: z.string().min(1),
  expectedVerdict: z.enum(["correct", "partial", "incorrect"]),
  expectedMissedParts: z.array(z.string()),
  note: z.string().optional(),
  referenceAnswer: z.string().min(1).optional(),
});
export const gradingCasesFileSchema = z.object({
  _status: z.string(),
  cases: z.array(gradingCaseSchema).min(1),
});

// Audit 3 M5: what must hold on EVERY grader output, whatever the case
// expects: a "correct" verdict lists no missed parts and no per-part score
// below "met" (the server downgrades such a verdict; the eval reports how
// often the model produced one).
export function gradeOutputProblems(out: { verdict: string; missedParts?: string[]; parts?: { score: string }[]; rubric?: Record<string, boolean> }): string[] {
  const p: string[] = [];
  if (out.verdict === "correct" && (out.missedParts ?? []).length) p.push("correct with missed parts");
  if (out.verdict === "correct" && (out.parts ?? []).some((x) => x.score !== "met")) p.push("correct with a part not met");
  if (out.verdict === "correct" && out.rubric && Object.values(out.rubric).some((v) => !v)) p.push("correct with a rubric check false");
  return p;
}

export function parseGradingCases(raw: unknown): GradingCase[] {
  const file = gradingCasesFileSchema.parse(raw);
  const ids = new Set<string>();
  for (const c of file.cases) {
    if (ids.has(c.id)) throw new Error(`Duplicate grading case id: ${c.id}`);
    ids.add(c.id);
    if (c.expectedVerdict === "correct" && c.expectedMissedParts.length > 0) {
      throw new Error(`Case ${c.id}: a "correct" verdict cannot expect missed parts.`);
    }
  }
  return file.cases;
}
