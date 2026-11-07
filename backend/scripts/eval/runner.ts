// Orchestration for the evals, with every model call injected, so the whole
// flow (including a call that fails part-way) runs against fakes in
// runner.test.ts. lessons.ts and grading.ts wire in the real clients.
import {
  scoreGradingCase,
  scoreLesson,
  type GradeOutput,
  type GradingCase,
  type GradingEvalRecord,
  type IndependentSolve,
  type LessonContentLike,
  type LessonEvalRecord,
  type RubricJudgement,
} from "./scoring";

export interface SampledObjective {
  id: string;
  stratum: string; // track type
  title: string;
  unitTitle: string;
  trackTitle: string;
}

// Runs fn over items with at most `limit` in flight, preserving input order.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

// Error text for the results file: the first line, bounded. Never the stack.
export function briefError(err: unknown): string {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return msg.split("\n")[0].slice(0, 300);
}

export interface LessonEvalDeps {
  // Generate a lesson WITHOUT storing it anywhere.
  generate(obj: SampledObjective): Promise<LessonContentLike>;
  judge(obj: SampledObjective, lesson: LessonContentLike): Promise<RubricJudgement>;
  // Must not be shown the stored answer keys or the *Why lines.
  solve(obj: SampledObjective, lesson: LessonContentLike): Promise<IndependentSolve>;
  concurrency?: number;
  onProgress?(done: number, total: number, rec: LessonEvalRecord): void;
}

export async function runLessonEval(
  sample: SampledObjective[],
  deps: LessonEvalDeps
): Promise<{ records: LessonEvalRecord[]; lessons: Record<string, LessonContentLike> }> {
  const lessons: Record<string, LessonContentLike> = {};
  let done = 0;
  const records = await mapLimit(sample, deps.concurrency ?? 4, async (obj) => {
    const base = { objectiveId: obj.id, objective: obj.title, trackTitle: obj.trackTitle, trackType: obj.stratum };
    let rec: LessonEvalRecord;
    try {
      const lesson = await deps.generate(obj);
      lessons[obj.id] = lesson;
      const [rubric, solve] = await Promise.all([deps.judge(obj, lesson), deps.solve(obj, lesson)]);
      rec = { ...base, score: scoreLesson(lesson, rubric, solve) };
    } catch (err) {
      rec = { ...base, error: briefError(err) };
    }
    deps.onProgress?.(++done, sample.length, rec);
    return rec;
  });
  return { records, lessons };
}

export interface GradingEvalDeps {
  grade(c: GradingCase): Promise<GradeOutput>;
  concurrency?: number;
  onProgress?(done: number, total: number, rec: GradingEvalRecord): void;
}

export async function runGradingEval(cases: GradingCase[], deps: GradingEvalDeps): Promise<GradingEvalRecord[]> {
  let done = 0;
  return mapLimit(cases, deps.concurrency ?? 4, async (c) => {
    let rec: GradingEvalRecord;
    try {
      const output = await deps.grade(c);
      rec = { case: c, output, score: scoreGradingCase(c, output) };
    } catch (err) {
      rec = { case: c, error: briefError(err) };
    }
    deps.onProgress?.(++done, cases.length, rec);
    return rec;
  });
}

// Audit 3 M5 (FAIL-302): the eval never passed the reference answer, but
// production always does (POST /api/grade sends the lesson's correct option
// and why), so it measured a different grader. Cases now carry
// referenceAnswer, and --reference picks whether it is sent.
export type ReferenceMode = "with" | "without" | "both";
export function referenceRuns(mode: ReferenceMode): boolean[] {
  return mode === "both" ? [false, true] : [mode === "with"];
}
