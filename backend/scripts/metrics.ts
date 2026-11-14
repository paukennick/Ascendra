// REQ-119: `npm run metrics [-- --days 30]` -- activation, D1/D7 retention,
// reviews per active learner and reported exam results (lib/metrics.ts);
// REQ-256: and the goal question's outcomes by where it was asked.
// REQ-262: and the Explain first / Example first test's results by arm.
// Read-only. Uses DATABASE_URL like the other scripts.
import "../supabase/seed/env-local";
import { query, queryOne, closePool } from "../lib/db";
import { formatTeachOrderResults, teachOrderResults } from "../lib/teach-order-results";
import { formatGoalQuestion, formatMetrics, goalQuestionSummary, metricsSummary } from "../lib/metrics";

async function main() {
  const i = process.argv.indexOf("--days");
  const days = i >= 0 ? Number(process.argv[i + 1]) : 30;
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("--days must be a whole number from 1 to 3650");
  const ledger = await queryOne<{ ok: boolean }>(`select to_regclass('public.schema_migrations') is not null as ok`);
  const since = ledger?.ok
    ? (await queryOne<{ applied_at: Date }>(`select applied_at from schema_migrations where filename = '048_product_basics.sql'`))?.applied_at ?? null
    : null;
  console.log(formatMetrics(await metricsSummary((sql, p) => query(sql, p), days, since)));
  // REQ-256: the goal question's drop-off and skip/dismiss rates by where it
  // was asked. Needs 078 (learner_events.detail).
  console.log("");
  console.log(formatGoalQuestion(await goalQuestionSummary((sql, p) => query(sql, p), days), days));
  // REQ-262: the Explain first / Example first test (docs/teach-order-test.md).
  // Needs 082 and the lesson events' order detail.
  console.log("");
  console.log(formatTeachOrderResults(await teachOrderResults((sql, p) => query(sql, p), days), days));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
