// REQ-144: `npm run access:grant -- --email a@b.c [--until 2027-06-30] [--note "..."]`,
// `--email a@b.c --revoke`, or `--list`. Unrestricted access from the
// command line (Settings > Access is the everyday way). Uses DATABASE_URL.
import "../supabase/seed/env-local";
import { closePool } from "../lib/db";
import { parseAccessArgs } from "../lib/account-access-config";
import { runAccessCli } from "../lib/access-grant-cli";

async function main() {
  const lines = await runAccessCli(parseAccessArgs(process.argv.slice(2)));
  for (const l of lines) console.log(l);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
