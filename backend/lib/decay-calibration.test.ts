// REQ-301: the calibration report's arithmetic and wording, without a
// database (decay-shadow.dbtest.ts runs the SQL), and the backfill's pure core.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BUCKET_EDGES,
  BUCKET_LABELS,
  CALIBRATION_BAR_POINTS,
  CALIBRATION_MIN_N,
  CALIBRATION_SQL,
  buildReport,
  categoryLabel,
  formatCalibration,
  sliceOf,
  toCells,
  type CalibrationCell,
} from "./decay-calibration";
import { replayCourse, formatBackfill } from "./decay-shadow-backfill";
import { MEMORY_MODEL_VERSION, SHADOW_MAX_HISTORY_ROWS, predictShadow, type ShadowReview } from "./decay-shadow";

const cell = (over: Partial<CalibrationCell> = {}): CalibrationCell => ({
  bucket: 6,
  source: "live",
  stage: "fitted",
  goal: "work",
  level: "some",
  cat: "",
  sub: "",
  n: 1000,
  learners: 10,
  sumPred: 920,
  recalled: 900,
  strictCorrect: 800,
  sqErr: 80,
  ...over,
});

describe("calibration slices (REQ-301)", () => {
  test("gap is predicted minus observed in points; positive is the optimistic direction", () => {
    const s = sliceOf("x", [cell()]);
    assert.ok(Math.abs(s.meanPredicted - 0.92) < 1e-9);
    assert.ok(Math.abs(s.observed - 0.9) < 1e-9);
    assert.ok(Math.abs(s.gapPoints - 2) < 1e-9);
    assert.ok(Math.abs(s.brier - 0.08) < 1e-9);
    assert.ok(Math.abs(s.brierBaseline - 0.09) < 1e-9);
    assert.equal(s.verdict, "within_bar");
  });

  test("the bar is five points, either side, and it needs the minimum count (FAIL-2061)", () => {
    const at = (gap: number, n = 1000) => sliceOf("x", [cell({ n, sumPred: n * (0.9 + gap / 100), recalled: n * 0.9 })]);
    assert.equal(at(CALIBRATION_BAR_POINTS).verdict, "within_bar");
    assert.equal(at(CALIBRATION_BAR_POINTS + 0.5).verdict, "over_predicts");
    assert.equal(at(-(CALIBRATION_BAR_POINTS + 0.5)).verdict, "under_predicts");
    assert.equal(at(20, CALIBRATION_MIN_N - 1).verdict, "too_few");
    assert.equal(at(20, CALIBRATION_MIN_N).verdict, "over_predicts");
  });

  test("an empty slice is not a division by zero", () => {
    const s = sliceOf("none", []);
    assert.equal(s.n, 0);
    assert.equal(s.verdict, "too_few");
    assert.ok(Number.isFinite(s.brier) && Number.isFinite(s.gapPoints));
  });

  test("the bucket edges and labels line up (width_bucket gives 0..edges)", () => {
    assert.equal(BUCKET_LABELS.length, BUCKET_EDGES.length + 1);
    assert.ok(CALIBRATION_SQL.includes(`array[${BUCKET_EDGES.join(", ")}]`));
  });
});

describe("the report (REQ-301)", () => {
  const cells = [
    cell({ bucket: 6, stage: "fitted", goal: "work", level: "some", cat: "", sub: "" }),
    cell({ bucket: 3, stage: "starting", goal: "career_change", level: "new", cat: "healthcare-nursing", sub: "", n: 300, sumPred: 225, recalled: 240, strictCorrect: 200, sqErr: 50 }),
    cell({ bucket: 6, stage: "learning", goal: "none", level: "experienced", cat: "own", sub: "", n: 50, sumPred: 46, recalled: 45, strictCorrect: 40, sqErr: 5 }),
  ];
  const r = buildReport(cells, { days: 90, version: MEMORY_MODEL_VERSION, source: null });

  test("slices by bucket, stage, goal, level and plan category, in a stable order", () => {
    assert.deepEqual(r.byBucket.map((b) => b.label), ["70-80%", "90-95%"]);
    assert.deepEqual(r.byStage.map((b) => b.label), ["starting", "learning", "fitted"]);
    assert.deepEqual(r.byLevel.map((b) => b.label), ["new", "some", "experienced"]);
    assert.deepEqual(r.byGoal.map((b) => b.label).sort(), ["career_change", "none", "work"]);
    const cats = Object.fromEntries(r.byCategory.map((b) => [b.label, b.n]));
    assert.deepEqual(cats, { other: 1000, clinical: 300, "own course": 50 });
    assert.equal(r.overall.n, 1350);
  });

  test("expected calibration error is the count-weighted mean gap over the buckets", () => {
    const b70 = r.byBucket[0];
    const b90 = r.byBucket[1];
    const want = (b70.n * Math.abs(b70.gapPoints) + b90.n * Math.abs(b90.gapPoints)) / 1350;
    assert.ok(Math.abs(r.expectedCalibrationError - want) < 1e-9);
  });

  test("category labels come from the billing map, never a second list", () => {
    assert.equal(categoryLabel("healthcare-nursing", ""), "clinical");
    assert.equal(categoryLabel("mental-health", ""), "clinical");
    assert.equal(categoryLabel("comptia-certifications", ""), "it_cloud");
    assert.equal(categoryLabel("", ""), "other");
    assert.equal(categoryLabel("own", ""), "own course");
  });

  test("the text says what it is: shadow data, the bar, the direction of the gap, and names a too-optimistic slice", () => {
    const text = formatCalibration(r);
    assert.match(text, /SHADOW DATA/);
    assert.match(text, /within 5 points/);
    assert.match(text, /positive means the model is too optimistic/);
    assert.match(text, /clinical/);
    assert.match(formatCalibration(buildReport([], { days: 7, version: "v", source: "live" })), /No predicted reviews/);
  });

  test("a row from the database becomes a cell with numbers, not strings", () => {
    const [c] = toCells([{ bucket: "7", source: "live", stage: "fitted", goal: "work", level: "some", cat: "", sub: "", n: "5", learners: 1, sum_pred: "4.5", recalled: 5, strict_correct: 4, sq_err: "0.2" }]);
    assert.equal(c.bucket, 7);
    assert.equal(c.n, 5);
    assert.equal(c.sumPred, 4.5);
  });

  test("the query counts unaided reviews of one version only, and nothing else leaves the database", () => {
    assert.match(CALIBRATION_SQL, /not l\.assisted/);
    assert.match(CALIBRATION_SQL, /l\.model_version = \$2/);
    assert.ok(!/\b(insert|update|delete)\b/i.test(CALIBRATION_SQL), "read-only");
    const selected = CALIBRATION_SQL.split(/\bfrom review_log\b/)[0].replace(/count\(distinct l\.user_id\)/, "");
    assert.ok(!/l\.user_id|l\.attempt_id|l\.id\b|l\.objective_id/.test(selected), "no learner or row id is selected, only counts and sums");
  });
});

describe("backfill core (REQ-301)", () => {
  const T0 = Date.UTC(2026, 9, 1);
  const D = 86_400_000;
  const row = (id: string, obj: string, days: number, verdict: "correct" | "partial" | "incorrect", model_version: string | null = null, assisted = false) => ({
    id,
    objective_id: obj,
    reviewed_at: new Date(T0 + days * D),
    verdict,
    assisted,
    enrolled_at: new Date(T0),
    model_version,
  });

  test("each empty row is predicted from the rows BEFORE it, never from itself or later ones", () => {
    const rows = [row("a", "o1", 2, "correct"), row("b", "o1", 6, "incorrect"), row("c", "o1", 9, "correct")];
    const out = replayCourse(rows, "work", "some");
    assert.deepEqual(out.map((o) => o.id), ["a", "b", "c"]);
    for (const [i, o] of out.entries()) {
      const history: ShadowReview[] = rows.slice(0, i).map((r) => ({ objectiveId: r.objective_id, atMs: r.reviewed_at.getTime(), verdict: r.verdict, assisted: r.assisted }));
      const want = predictShadow({
        history,
        enrolledAtMs: new Map([["o1", T0]]),
        target: { objectiveId: "o1", atMs: rows[i].reviewed_at.getTime() },
        goal: "work",
        level: "some",
      });
      assert.deepEqual(o.prediction, want);
    }
    // The miss on day 6 changes what is predicted for day 9: a later row sees earlier outcomes.
    const kept = replayCourse([rows[0], row("b", "o1", 6, "correct"), rows[2]], "work", "some");
    assert.ok(out[2].prediction!.stability < kept[2].prediction!.stability, "a miss leaves a weaker state than a correct answer");
  });

  test("rows that already have a prediction are history, not targets", () => {
    const rows = [row("a", "o1", 2, "correct", "older"), row("b", "o1", 6, "correct")];
    assert.deepEqual(replayCourse(rows, null, null).map((o) => o.id), ["b"]);
  });

  test("a row whose objective has no schedule yields no prediction instead of an error", () => {
    const rows = [row("a", "o1", 2, "correct")];
    rows[0].enrolled_at = new Date(NaN);
    assert.equal(replayCourse(rows, null, null)[0].prediction, null);
  });

  test("the summary names a dry run and says re-running is safe", () => {
    const base = { apply: false, pairs: 2, rowsConsidered: 10, rowsPredicted: 9, rowsWithoutPrediction: 1, pairsSkippedTooLong: 0, byStage: { starting: 9 }, unaided: { n: 6, meanPredicted: 0.8, observed: 0.7 } };
    assert.match(formatBackfill(base), /DRY RUN \(nothing written; add --apply\)/);
    assert.match(formatBackfill({ ...base, apply: true }), /APPLIED/);
    assert.match(formatBackfill(base), /never overwritten/);
  });
});

describe("cost and wiring (REQ-301)", () => {
  test("the longest history the live write accepts is predicted well inside a review's budget", () => {
    const n = SHADOW_MAX_HISTORY_ROWS;
    const history: ShadowReview[] = Array.from({ length: n }, (_, i) => ({
      objectiveId: `o${i % 200}`,
      atMs: Date.UTC(2026, 0, 1) + i * 3_600_000 * 7,
      verdict: i % 5 === 0 ? "incorrect" : "correct",
      assisted: i % 7 === 0,
    }));
    const enrolled = new Map(Array.from({ length: 200 }, (_, i) => [`o${i}`, Date.UTC(2025, 11, 1)] as [string, number]));
    const t = Date.now();
    const p = predictShadow({ history, enrolledAtMs: enrolled, target: { objectiveId: "o3", atMs: Date.UTC(2027, 0, 1) }, goal: "work", level: "some" });
    const ms = Date.now() - t;
    assert.ok(p);
    // Generous on purpose (a loaded CI machine): the design says a few milliseconds at 2,000 reviews.
    assert.ok(ms < 3000, `${ms} ms for ${n} reviews`);
  });

  test("the setting is documented where the rules say (.env.example and the runbook)", () => {
    const root = join(__dirname, "..", "..");
    assert.match(readFileSync(join(root, "backend", ".env.example"), "utf8"), /DECAY_SHADOW/);
    assert.match(readFileSync(join(root, "docs", "operations-runbook.md"), "utf8"), /`DECAY_SHADOW`/);
  });

  test("review_log has exactly one writer, and it calls the shadow write (a new writer must too)", () => {
    const lib = join(__dirname);
    const files = (require("node:fs") as typeof import("node:fs")).readdirSync(lib).filter((f) => f.endsWith(".ts") && !/\.(test|dbtest|sandboxtest)\.ts$/.test(f));
    const writers = files.filter((f) => /insert\s+into\s+review_log/i.test(readFileSync(join(lib, f), "utf8")));
    assert.deepEqual(writers, ["review-step.ts"], "a second writer of review_log needs its own shadow write (REQ-301)");
    assert.match(readFileSync(join(lib, "review-step.ts"), "utf8"), /recordShadowPrediction\(/);
  });
});
