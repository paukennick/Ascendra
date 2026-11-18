// REQ-335: golden paths for DP300/deploy-script-truncates-rates-table on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP300", slug: "deploy-script-truncates-rates-table" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Audit, writes since, rates, retention; restore and copy back; guard; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "audit");
          run(c, "writes");
          run(c, "rates");
          run(c, "ret");
          run(c, "restore");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "truncate" });
        },
      },
      {
        id: "harm",
        title: "Swaps the restored copy in",
        reasoning: "missed",
        drive: (c) => {
          run(c, "audit");
          run(c, "swap");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "truncate" });
        },
      },
      {
        id: "noop",
        title: "Waits for the weekly rate load",
        reasoning: "partial",
        drive: (c) => {
          run(c, "audit");
          run(c, "ltr");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "truncate" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads audit and writes, restores and copies back, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "audit");
          run(c, "writes");
          run(c, "restore");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "truncate" });
        },
      },
      {
        id: "late",
        title: "Waits, restores after 15:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "audit");
          waitUntil(c, 50);
          run(c, "restore");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "truncate" });
        },
      },
      {
        id: "blind",
        title: "Restores without looking and blames the weekly load",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restore");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "load" });
        },
      },
    ],
  };
}
