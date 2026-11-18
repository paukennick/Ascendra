// REQ-333: golden paths for the PYDATA merge validation case on the data
// console (PYDATA/pydata-region-merge-duplicated-store.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PYDATA", slug: "pydata-region-merge-duplicated-store" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Counts rows and keys, validate=\"m:1\" (MergeError), keeps each store's latest row, reconciles, sends", reasoning: "met", drive: (c) => { run(c, "inspect"); run(c, "validate"); run(c, "dedupe"); run(c, "check"); run(c, "ship"); record(c, { cause: "dupkey", check: "rows" }); } },
      { id: "trustTotal", title: "Sends the merged total as it is", reasoning: "missed", drive: (c) => { run(c, "ship"); record(c, { cause: "tills", check: "none" }); } },
      { id: "dropdup", title: "Calls drop_duplicates on the result without looking, then sends", reasoning: "missed", drive: (c) => { run(c, "dropdup"); run(c, "ship"); record(c, { cause: "refunds", check: "looks" }); } },
      { id: "dropStore", title: "Inspects, deletes store 14's orders so the totals match, sends", reasoning: "missed", drive: (c) => { run(c, "inspect"); run(c, "dropStore"); run(c, "ship"); record(c, { cause: "dupkey", check: "looks" }); } },
      { id: "noValidate", title: "Inspects, deduplicates the lookup, reconciles and sends, but adds no validate", reasoning: "met", drive: (c) => { run(c, "inspect"); run(c, "dedupe"); run(c, "check"); run(c, "ship"); record(c, { cause: "dupkey", check: "rows" }); } },
      { id: "hold", title: "Inspects, validates (MergeError) and holds the figures", reasoning: "partial", drive: (c) => { run(c, "inspect"); run(c, "validate"); run(c, "check"); record(c, { cause: "dupkey", check: "none" }); } },
    ],
  };
}
