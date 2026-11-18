// REQ-335: golden paths for GCPMLE/new-model-version-took-all-traffic on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPMLE", slug: "new-model-version-took-all-traffic" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Split, block rate, deploy command, evaluation; 90/10; alert and pipeline; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "split");
          run(c, "metrics");
          run(c, "deploy");
          run(c, "registry");
          run(c, "canary");
          run(c, "gate");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "split" });
        },
      },
      {
        id: "harm",
        title: "Clears the traffic split",
        reasoning: "missed",
        drive: (c) => {
          run(c, "split");
          run(c, "clear");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "split" });
        },
      },
      {
        id: "noop",
        title: "Adds replicas to v9",
        reasoning: "partial",
        drive: (c) => {
          run(c, "split");
          run(c, "replicas");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "split" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads split and block rate, restores 90/10, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "split");
          run(c, "metrics");
          run(c, "canary");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "split" });
        },
      },
      {
        id: "late",
        title: "Waits, restores after 12:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "split");
          waitUntil(c, 40);
          run(c, "canary");
          run(c, "verify");
          waitUntil(c, 48);
          close(c);
          c.act("document", { cause: "split" });
        },
      },
      {
        id: "blind",
        title: "Restores the split without looking and blames real fraud",
        reasoning: "missed",
        drive: (c) => {
          run(c, "canary");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
    ],
  };
}
