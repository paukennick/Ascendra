// REQ-333: golden paths for the MSCS sort stability case on the data console
// (MSCS/mscs-unstable-sort-stage-order.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "MSCS", slug: "mscs-unstable-sort-stage-order" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Sees ties scrambled, uses the stable sorted(), checks every pair, sends", reasoning: "met", drive: (c) => { run(c, "inspect"); run(c, "stable"); run(c, "verify"); run(c, "send"); record(c, { cause: "unstable", check: "order" }); } },
      { id: "sendAsIs", title: "Sends the list as it is", reasoning: "missed", drive: (c) => { run(c, "send"); record(c, { cause: "data", check: "none" }); } },
      { id: "rename", title: "Prefixes names with honor codes, checks, sends", reasoning: "missed", drive: (c) => { run(c, "inspect"); run(c, "rename"); run(c, "verify"); run(c, "send"); record(c, { cause: "names", check: "order" }); } },
      { id: "tupleKey", title: "Keeps the quicksort with a composite key, checks, sends", reasoning: "met", drive: (c) => { run(c, "inspect"); run(c, "tupleKey"); run(c, "verify"); run(c, "send"); record(c, { cause: "unstable", check: "order" }); } },
      { id: "hold", title: "Sees the problem and holds", reasoning: "partial", drive: (c) => { run(c, "inspect"); record(c, { cause: "unstable", check: "none" }); } },
      { id: "unchecked", title: "Switches to sorted() without looking, sends unchecked", reasoning: "partial", drive: (c) => { run(c, "stable"); run(c, "send"); record(c, { cause: "unstable", check: "looks" }); } },
    ],
  };
}
