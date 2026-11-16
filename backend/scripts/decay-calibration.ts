// REQ-301: the shadow-mode calibration report (docs/decay-shadow-calibration.md):
// the memory model's predicted recall against what learners actually got
// right, by predicted bucket, fit stage, goal, level and course category.
// Read-only. Uses DATABASE_URL like `npm run metrics`.
//   npm run decay:calibration                       last 90 days, current model version
//   npm run decay:calibration -- --days 30 --source live --version fsrs6-k-v1 --json
import "../supabase/seed/env-local";
import { query, closePool } from "../lib/db";
import { calibrationReport, formatCalibration } from "../lib/decay-calibration";

function flag(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? "") : null;
}

async function main() {
  const known = new Set(["--days", "--source", "--version", "--json"]);
  const args = process.argv.slice(2);
  for (const [i, a] of args.entries()) {
    if (a.startsWith("--") && !known.has(a)) throw new Error(`Unknown option ${a}`);
    if (!a.startsWith("--") && !(i > 0 && ["--days", "--source", "--version"].includes(args[i - 1]))) throw new Error(`Unexpected argument ${a}`);
  }
  const daysRaw = flag("--days");
  const days = daysRaw === null ? 90 : Number(daysRaw);
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("--days must be a whole number from 1 to 3650");
  const sourceRaw = flag("--source");
  if (sourceRaw !== null && sourceRaw !== "live" && sourceRaw !== "backfill") throw new Error("--source must be live or backfill");
  const version = flag("--version");
  if (version !== null && !/^[A-Za-z0-9._-]{1,24}$/.test(version)) throw new Error("--version must be a model version label such as fsrs6-k-v1");
  const ready = await query<{ ok: boolean }>(
    `select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'review_log' and column_name = 'predicted_recall') as ok`
  );
  if (!ready[0]?.ok) throw new Error("review_log.predicted_recall is missing: apply 085_review_shadow_prediction.sql first (npm run migrate).");
  const report = await calibrationReport((sql, p) => query(sql, p), {
    days,
    source: sourceRaw as "live" | "backfill" | null,
    ...(version ? { version } : {}),
  });
  console.log(args.includes("--json") ? JSON.stringify(report, null, 2) : formatCalibration(report));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
