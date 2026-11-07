// REQ-123: the pure parts of scripts/generate-labs.ts -- how many labs each
// unit gets (the density policy), the cost and review-burden estimate, the
// batch request ids and argument parsing. Unit tested in
// scripts/generate-labs-lib.test.ts. Nothing here calls a model or a database.

export type LabFamily = "clinical" | "fitness" | "general";

export interface PlanUnit {
  title: string;
  weight: number | null; // exam blueprint percent; null on non-exam tracks
  objectives: string[];
}

export interface PlanTrack {
  code: string;
  family: LabFamily;
  units: PlanUnit[]; // active units only
}

// ---------------------------------------------------------------------------
// Which objectives an exam tests by doing, not only by knowing.
//
// A heuristic on the objective's own wording, used to SIZE a plan and to pick
// generation targets; a person still chooses the 1-3 skills per unit when
// authoring. Performance verbs (design, calculate, prioritise, interpret,
// configure, plan, write ...) and, on clinical tracks, the conditions an exam
// presents as a case (shock, sepsis, failure, crisis ...). Knowledge-only
// objectives ("Define ...", "The ... model", "Structures and functions of
// ...") get none.
// ---------------------------------------------------------------------------
const PERFORMANCE =
  /\b(design|designing|choos|select|calculat|prioriti[sz]|interpret|plan|planning|configur|troubleshoot|writ|build|implement|apply|applying|decid|diagnos|estimat|manag|modif|siz|tun|analy[sz]|assess|recogni[sz]|respond|intervene|escalat|titrat|program|decompos|creat|develop|monitor|evaluat|secur|migrat|optimi[sz]|protect|correct|instruct|screen)\w*/i;
const CLINICAL_CASE =
  /\b(shock|sepsis|failure|crisis|emergenc|deteriorat|instabil|unstable|arrest|syndrome|hemorrhag|injur|trauma|acute|exacerbat|withdrawal|toxic|overdose|post-?op|after .*surgery|complication)\w*/i;
const KNOWLEDGE_ONLY = /^(define|defining|describe|the |structures and functions|general principles|history of|overview)/i;

export function isPerformanceObjective(title: string, family: LabFamily): boolean {
  if (KNOWLEDGE_ONLY.test(title.trim())) return false;
  if (PERFORMANCE.test(title)) return true;
  return family === "clinical" && CLINICAL_CASE.test(title);
}

export type DensityPolicy = "fixed" | "weighted" | "per_objective" | "hybrid";

export const POLICY_DEFAULTS = {
  // (a) the same number in every unit
  fixedPerUnit: 2,
  // (b) a course budget split by blueprint weight
  weightedCourseBudget: 12,
  // (d) one per unit, plus this many split by blueprint weight
  hybridExtras: 6,
  // (d) no unit gets more than this many from the plan
  hybridUnitCap: 3,
} as const;

// Largest-remainder split of n over weights (equal weights when none are
// known). Deterministic: ties go to the earlier unit.
export function apportion(n: number, weights: (number | null)[]): number[] {
  if (n <= 0 || !weights.length) return weights.map(() => 0);
  const known = weights.every((w) => w != null && w > 0);
  const ws = known ? (weights as number[]) : weights.map(() => 1);
  const total = ws.reduce((a, b) => a + b, 0);
  const exact = ws.map((w) => (n * w) / total);
  const out = exact.map(Math.floor);
  let left = n - out.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i]++;
    left--;
  }
  return out;
}

// Labs per unit for one track under a policy. Never more labs in a unit than
// it has performance objectives (one lab per objective at most), except that
// the floor of 1 (fixed, hybrid) applies to any unit with an objective at all.
export function unitPlan(track: PlanTrack, policy: DensityPolicy, opts = POLICY_DEFAULTS): number[] {
  const perf = track.units.map((u) => u.objectives.filter((o) => isPerformanceObjective(o, track.family)).length);
  const has = track.units.map((u) => (u.objectives.length > 0 ? 1 : 0));
  switch (policy) {
    case "fixed":
      return track.units.map((_, i) => (has[i] ? Math.max(1, Math.min(opts.fixedPerUnit, perf[i] || 1)) : 0));
    case "weighted":
      return apportion(opts.weightedCourseBudget, track.units.map((u) => u.weight)).map((n, i) => Math.min(n, perf[i]));
    case "per_objective":
      return perf;
    case "hybrid": {
      const extras = apportion(opts.hybridExtras, track.units.map((u) => u.weight));
      return track.units.map((_, i) => {
        if (!has[i]) return 0;
        const room = Math.max(0, Math.min(opts.hybridUnitCap, Math.max(perf[i], 1)) - 1);
        return 1 + Math.min(extras[i], room);
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Cost and review burden (estimates; re-check prices before a large run).
// Prices from lib/ai-pricing.ts (read 2026-11-07): Sonnet 5.5 $2 in / $10 out
// per million tokens, halved by the Batch API; Haiku 5.5 $0.10 / $0.50.
// Token counts are estimates from the prompts in lib/lab-generation.ts
// (rules + objective context + schema in; brief, 1-4 steps, rubric criteria
// and reference answers out) and lib/lab-grading.ts.
// ---------------------------------------------------------------------------
export const LAB_COST = {
  genInputTokens: 3000,
  genOutputTokens: 2200,
  batchInputUsdPerMTok: 1,
  batchOutputUsdPerMTok: 5,
  checkInputTokens: 2600,
  checkOutputTokens: 500,
  haikuInputUsdPerMTok: 0.1,
  haikuOutputUsdPerMTok: 0.5,
  // A held-back or failed lab is regenerated once: budget a quarter extra.
  retryFactor: 1.25,
  // Learner-side grading of one step (Haiku, real time).
  gradeInputTokens: 3200,
  gradeOutputTokens: 450,
  stepsPerCase: 3,
} as const;

export function perLabGenerationUsd(c = LAB_COST): number {
  const gen = (c.genInputTokens * c.batchInputUsdPerMTok + c.genOutputTokens * c.batchOutputUsdPerMTok) / 1e6;
  const check = (c.checkInputTokens * c.haikuInputUsdPerMTok + c.checkOutputTokens * c.haikuOutputUsdPerMTok) / 1e6;
  return (gen + check) * c.retryFactor;
}

export function perStepGradingUsd(c = LAB_COST): number {
  return (c.gradeInputTokens * c.haikuInputUsdPerMTok + c.gradeOutputTokens * c.haikuOutputUsdPerMTok) / 1e6;
}

// Expert review: every clinical and fitness lab is read in full before
// launch; for the rest, a sample of 20% per course (at least 2).
export const REVIEW = {
  fullReviewFamilies: ["clinical", "fitness"] as LabFamily[],
  sampleShare: 0.2,
  sampleMin: 2,
  minutesFull: 12,
  minutesSample: 8,
} as const;

export function reviewItems(family: LabFamily, labs: number, r = REVIEW): number {
  if (labs <= 0) return 0;
  if (r.fullReviewFamilies.includes(family)) return labs;
  return Math.min(labs, Math.max(r.sampleMin, Math.ceil(labs * r.sampleShare)));
}

export interface PolicySummary {
  policy: DensityPolicy;
  labs: number;
  units: number;
  unitsWithLab: number;
  objectives: number;
  performanceObjectives: number;
  // share of performance objectives that get a lab
  performanceCoverage: number;
  generationUsd: number;
  reviewItems: number;
  reviewHours: number;
  maxPerUnit: number;
  medianPerCourse: number;
}

export function summarize(tracks: PlanTrack[], policy: DensityPolicy, opts = POLICY_DEFAULTS): PolicySummary {
  let labs = 0;
  let units = 0;
  let unitsWithLab = 0;
  let objectives = 0;
  let perfObjectives = 0;
  let review = 0;
  let reviewMinutes = 0;
  let maxPerUnit = 0;
  const perCourse: number[] = [];
  for (const t of tracks) {
    const plan = unitPlan(t, policy, opts);
    const n = plan.reduce((a, b) => a + b, 0);
    perCourse.push(n);
    labs += n;
    units += t.units.length;
    unitsWithLab += plan.filter((x) => x > 0).length;
    maxPerUnit = Math.max(maxPerUnit, ...plan, 0);
    for (const u of t.units) {
      objectives += u.objectives.length;
      perfObjectives += u.objectives.filter((o) => isPerformanceObjective(o, t.family)).length;
    }
    const items = reviewItems(t.family, n);
    review += items;
    reviewMinutes += items * (REVIEW.fullReviewFamilies.includes(t.family) ? REVIEW.minutesFull : REVIEW.minutesSample);
  }
  perCourse.sort((a, b) => a - b);
  return {
    policy,
    labs,
    units,
    unitsWithLab,
    objectives,
    performanceObjectives: perfObjectives,
    performanceCoverage: perfObjectives ? Math.min(1, labs / perfObjectives) : 0,
    generationUsd: labs * perLabGenerationUsd(),
    reviewItems: review,
    reviewHours: reviewMinutes / 60,
    maxPerUnit,
    medianPerCourse: perCourse.length ? perCourse[Math.floor(perCourse.length / 2)] : 0,
  };
}

// ---------------------------------------------------------------------------
// Batch plumbing and arguments
// ---------------------------------------------------------------------------

// custom_id must match ^[a-zA-Z0-9_-]{1,64}$.
export function labRequestId(objectiveId: string, kind: "build" | "case"): string {
  return `${objectiveId}_lab_${kind}`;
}

export function parseLabRequestId(customId: string): { objectiveId: string; kind: "build" | "case" } | null {
  const m = /^([0-9a-f-]{36})_lab_(build|case)$/i.exec(customId);
  return m ? { objectiveId: m[1].toLowerCase(), kind: m[2] as "build" | "case" } : null;
}

// Clinical tracks get unfolding cases, everything else build labs.
export function kindFor(family: LabFamily): "build" | "case" {
  return family === "clinical" ? "case" : "build";
}

export interface LabGenArgs {
  mode: "estimate" | "compare" | "submit" | "collect";
  tracks: string[];
  limit: number | null;
  policy: DensityPolicy;
  batchId?: string;
}

export function parseLabGenArgs(argv: string[]): LabGenArgs {
  const out: LabGenArgs = { mode: "estimate", tracks: [], limit: null, policy: "hybrid" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--submit") out.mode = "submit";
    else if (a === "--compare") out.mode = "compare";
    else if (a === "--collect") {
      out.mode = "collect";
      out.batchId = argv[++i];
      if (!out.batchId || !/^msgbatch_[A-Za-z0-9]+$/.test(out.batchId)) throw new Error("--collect needs a batch id (msgbatch_...)");
    } else if (a === "--tracks") {
      out.tracks = (argv[++i] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    } else if (a === "--limit") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n <= 0) throw new Error("--limit needs a positive whole number");
      out.limit = n;
    } else if (a === "--policy") {
      const p = argv[++i];
      if (p !== "fixed" && p !== "weighted" && p !== "per_objective" && p !== "hybrid") {
        throw new Error("--policy must be fixed, weighted, per_objective or hybrid");
      }
      out.policy = p;
    } else throw new Error(`Unknown option ${a}`);
  }
  return out;
}

export function formatSummary(s: PolicySummary): string {
  return (
    `${s.policy.padEnd(14)} labs ${String(s.labs).padStart(5)}  units with a lab ${s.unitsWithLab}/${s.units}  ` +
    `perf. objectives covered ${(s.performanceCoverage * 100).toFixed(0)}%  max/unit ${s.maxPerUnit}  median/course ${s.medianPerCourse}  ` +
    `generation ~$${s.generationUsd.toFixed(2)}  expert review ${s.reviewItems} labs (~${s.reviewHours.toFixed(0)} h)`
  );
}
