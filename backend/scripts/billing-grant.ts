// REQ-122: `npm run billing:grant -- --email a@b.c --tier pro --until 2027-06-30 --note "founding learner"`
// Comps learners (an entitlement with source 'grant'). Options in
// lib/billing-grant.ts; examples in docs/billing.md. Uses DATABASE_URL.
import "../supabase/seed/env-local";
import { closePool } from "../lib/db";
import { parseGrantArgs, runGrant } from "../lib/billing-grant";

async function main() {
  const lines = await runGrant(parseGrantArgs(process.argv.slice(2)));
  for (const l of lines) console.log(l);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
