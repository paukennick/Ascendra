// REQ-333: golden paths for the MSCS dependency cycle case on the data
// console (MSCS/mscs-pipeline-dependency-cycle.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "MSCS", slug: "mscs-pipeline-dependency-cycle" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Run plan 9 of 12, DFS finds the cycle, edges corrected, planner raises on cycles, order checked, rerun", reasoning: "met", drive: (c) => { run(c, "plan"); run(c, "dfs"); run(c, "fixEdge"); run(c, "addGuard"); run(c, "verify"); run(c, "rerun"); record(c, { cause: "cycle", check: "order" }); } },
      { id: "rerunAsIs", title: "Reruns as it is", reasoning: "missed", drive: (c) => { run(c, "rerun"); record(c, { cause: "timeout", check: "success" }); } },
      { id: "appendLeft", title: "Sees the short plan, appends the leftovers alphabetically, reruns", reasoning: "missed", drive: (c) => { run(c, "plan"); run(c, "appendLeft"); run(c, "verify"); run(c, "rerun"); record(c, { cause: "cycle", check: "success" }); } },
      { id: "strip", title: "Finds the cycle, strips the stuck jobs' dependencies, reruns", reasoning: "missed", drive: (c) => { run(c, "dfs"); run(c, "stripDeps"); run(c, "verify"); run(c, "rerun"); record(c, { cause: "cycle", check: "order" }); } },
      { id: "noGuard", title: "Finds and fixes the cycle, checks the order, reruns, but leaves the planner silent", reasoning: "met", drive: (c) => { run(c, "dfs"); run(c, "fixEdge"); run(c, "verify"); run(c, "rerun"); record(c, { cause: "cycle", check: "order" }); } },
      { id: "hold", title: "Finds the cycle and holds the rerun", reasoning: "partial", drive: (c) => { run(c, "plan"); run(c, "dfs"); record(c, { cause: "cycle", check: "none" }); } },
    ],
  };
}
