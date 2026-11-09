// REQ-168: `npm run backups:housekeeping -- [--dry-run | --apply]`.
// Drops public.backup_release_YYYYMMDD tables and backup_release_YYYYMMDD
// schemas more than 30 days old (UTC). Dry run is the default; --apply drops.
// Exits 1 if an expired schema was refused (something outside depends on it),
// so the workflow run goes red. Uses DATABASE_URL. Run weekly by
// .github/workflows/backup-housekeeping.yml; see scripts/backup-housekeeping-lib.ts.
import "../supabase/seed/env-local";
import { closePool, query } from "../lib/db";
import { parseHousekeepingArgs, runHousekeeping } from "./backup-housekeeping-lib";

async function main() {
  const args = parseHousekeepingArgs(process.argv.slice(2));
  if (typeof args === "string") throw new Error(args);
  const r = await runHousekeeping({ query: (text, params) => query(text, params ?? []), dryRun: args.dryRun });
  if (r.refused.length) throw new Error(`Refused ${r.refused.length} expired schema(s) with outside dependents; see above.`);
}

main()
  .catch((err) => {
    // Message only: never the error object, which could carry connection details.
    console.error(err instanceof Error ? err.message : "backup housekeeping failed");
    process.exitCode = 1;
  })
  .finally(() => closePool());
