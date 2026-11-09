// REQ-166: `npm run discounts:codes -- --status | --config |
// --import <file> --group <g> --product <id> --expires YYYY-MM-DD [--dry-run]`.
// See lib/discount-codes-cli.ts and docs/billing.md ("Verified discounts").
import "../supabase/seed/env-local";
import { closePool } from "../lib/db";
import { parseCodesArgs, runCodesCli } from "../lib/discount-codes-cli";

async function main() {
  const args = parseCodesArgs(process.argv.slice(2));
  if (typeof args === "string") throw new Error(args);
  for (const l of await runCodesCli(args)) console.log(l);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
