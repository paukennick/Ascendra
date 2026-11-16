// REQ-301: replays review_log history to store what the memory model would have
// predicted at each past review (docs/decay-shadow-calibration.md). DRY RUN BY
// DEFAULT; nothing is written without --apply. Read lib/decay-shadow-backfill.ts
// for what a backfilled row is and is not.
//   npm run decay:backfill                          dry run, every learner
//   npm run decay:backfill -- --user <uuid>         one learner
//   npm run decay:backfill -- --limit 200           the first 200 learner-courses
//   npm run decay:backfill -- --apply [--limit N]   write (safe to repeat or resume)
// Uses DATABASE_URL like the other scripts; run it against the owner or
// app_runtime connection, never against a database you have not meant to touch.
import "../supabase/seed/env-local";
import { closePool } from "../lib/db";
import { backfillShadow, formatBackfill } from "../lib/decay-shadow-backfill";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function flag(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? "") : null;
}

async function main() {
  const known = new Set(["--apply", "--user", "--limit"]);
  const args = process.argv.slice(2);
  for (const [i, a] of args.entries()) {
    if (a.startsWith("--") && !known.has(a)) throw new Error(`Unknown option ${a}`);
    if (!a.startsWith("--") && !(i > 0 && (args[i - 1] === "--user" || args[i - 1] === "--limit"))) throw new Error(`Unexpected argument ${a}`);
  }
  const user = flag("--user");
  if (user !== null && !UUID.test(user)) throw new Error("--user must be a learner id (a UUID)");
  const limitRaw = flag("--limit");
  const limit = limitRaw === null ? null : Number(limitRaw);
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) throw new Error("--limit must be a whole number of at least 1");
  const apply = args.includes("--apply");
  const summary = await backfillShadow({
    apply,
    userId: user,
    limitPairs: limit,
    onProgress: (done, total) => {
      if (done % 50 === 0 || done === total) process.stderr.write(`  ${done}/${total} learner-courses\r`);
    },
  });
  process.stderr.write("\n");
  console.log(formatBackfill(summary));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
