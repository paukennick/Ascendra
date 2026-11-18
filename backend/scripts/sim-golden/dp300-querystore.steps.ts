// REQ-335: golden paths for DP300/plan-regression-order-search-query-store on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP300", slug: "plan-regression-order-search-query-store" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Top queries, plan history, operators, recommendation; force; automatic tuning; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "top");
          run(c, "plans");
          run(c, "showplan");
          run(c, "reco");
          run(c, "force");
          run(c, "tuning");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "plan" });
        },
      },
      {
        id: "harm",
        title: "Clears the plan cache",
        reasoning: "missed",
        drive: (c) => {
          run(c, "top");
          run(c, "flush");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "plan" });
        },
      },
      {
        id: "noop",
        title: "Rebuilds the index",
        reasoning: "partial",
        drive: (c) => {
          run(c, "top");
          run(c, "rebuild");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "plan" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads top queries and plans, forces, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "top");
          run(c, "plans");
          run(c, "force");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "plan" });
        },
      },
      {
        id: "late",
        title: "Waits, forces after 11:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "top");
          waitUntil(c, 40);
          run(c, "force");
          run(c, "verify");
          waitUntil(c, 48);
          close(c);
          c.act("document", { cause: "plan" });
        },
      },
      {
        id: "blind",
        title: "Forces without looking and blames capacity",
        reasoning: "missed",
        drive: (c) => {
          run(c, "force");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "index" });
        },
      },
    ],
  };
}
