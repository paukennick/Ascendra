// REQ-335: golden paths for GCPDEVOPS/drain-bad-region-from-global-lb on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPDEVOPS", slug: "drain-bad-region-from-global-lb" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Errors by backend, capacity, backends, budget; drain; stepped return; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "errs");
          run(c, "cap");
          run(c, "bs");
          run(c, "burn");
          run(c, "drain");
          run(c, "review");
          run(c, "verify");
          waitUntil(c, 26);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "harm",
        title: "Deletes the east instance group",
        reasoning: "missed",
        drive: (c) => {
          run(c, "errs");
          run(c, "delete");
          run(c, "verify");
          waitUntil(c, 26);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "noop",
        title: "Restarts the east instances",
        reasoning: "partial",
        drive: (c) => {
          run(c, "errs");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 26);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads errors and capacity, drains, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "errs");
          run(c, "cap");
          run(c, "drain");
          run(c, "verify");
          waitUntil(c, 26);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "late",
        title: "Waits, drains after 12:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "errs");
          waitUntil(c, 25);
          run(c, "drain");
          run(c, "verify");
          waitUntil(c, 33);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "blind",
        title: "Drains without looking and blames the load balancer",
        reasoning: "missed",
        drive: (c) => {
          run(c, "drain");
          waitUntil(c, 26);
          close(c);
          c.act("document", { cause: "lb" });
        },
      },
    ],
  };
}
