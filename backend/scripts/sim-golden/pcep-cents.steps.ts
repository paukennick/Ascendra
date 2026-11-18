// REQ-333: golden paths for the PCEP float and cents case on the data console
// (PCEP/pcep-lunch-balances-float-cents.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PCEP", slug: "pcep-lunch-balances-float-cents" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Inspects a flagged account (0.30000000000000004), compares whole cents, dry run 0 mismatches, ships", reasoning: "met", drive: (c) => { run(c, "inspect"); run(c, "change", { f: "cents" }); run(c, "rerun"); run(c, "ship"); record(c, { cause: "float", check: "rerun" }); } },
      { id: "shipAsIs", title: "Unfreezes and ships the same code", reasoning: "missed", drive: (c) => { run(c, "ship"); record(c, { cause: "theft", check: "none" }); } },
      { id: "overwrite", title: "Inspects, overwrites the balances with the float sums, dry run passes, ships", reasoning: "missed", drive: (c) => { run(c, "inspect"); run(c, "overwrite"); run(c, "rerun"); run(c, "ship"); record(c, { cause: "float", check: "rerun" }); } },
      { id: "roundFloats", title: "Inspects, rounds the floats to 2 places, dry run passes, ships", reasoning: "met", drive: (c) => { run(c, "inspect"); run(c, "change", { f: "round" }); run(c, "rerun"); run(c, "ship"); record(c, { cause: "float", check: "rerun" }); } },
      { id: "hold", title: "Inspects and holds", reasoning: "partial", drive: (c) => { run(c, "inspect"); record(c, { cause: "float", check: "none" }); } },
      { id: "late", title: "Changes to cents first, inspects after, dry run, waits, ships after 07:15", reasoning: "met", drive: (c) => { run(c, "change", { f: "cents" }); run(c, "inspect"); run(c, "rerun"); for (let i = 0; i < 4; i++) run(c, "wait"); run(c, "ship"); record(c, { cause: "float", check: "rerun" }); } },
    ],
  };
}
